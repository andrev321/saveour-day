import { test, mock } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

test("server uploads reserve once, preserve retry metadata on Storage failure and never return uncommitted manifests", async () => {
  const sid = "20000000-0000-4000-8000-000000000001";
  let id = "",
    prefix = "",
    paths: string[] = [],
    calls: string[] = [];
  let failUpload = false,
    failRemove = false,
    failComplete = false;
  class HttpError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  const db = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push(name);
      if (name === "reserve_media_upload") {
        id = args.aid as string;
        prefix = (args.original as string).slice(0, -"/original".length);
      }
      if (name === "complete_media_upload" && failComplete)
        return { data: null, error: { message: "MEDIA_UNAVAILABLE" } };
      if (name === "begin_media_deletion")
        assert.equal(args.cleanup_only, true);
      return {
        data:
          name === "media_cleanup_candidates"
            ? []
            : name === "begin_media_deletion"
              ? paths.map((path) => ({ path }))
              : null,
        error: null,
      };
    },
    storage: {
      from: () => ({
        remove: async (removed: string[]) => {
          calls.push("storage.remove");
          assert.deepEqual(removed, paths);
          if (failRemove) return { error: new Error("offline") };
          paths = [];
          return { error: null };
        },
      }),
    },
  };
  const uploadDb = {
    storage: {
      from: () => ({
        upload: async (path: string) => {
          calls.push("storage.upload");
          assert.ok(path.startsWith(prefix + "/"));
          if (failUpload && paths.length === 1)
            return { error: new Error("upload failed") };
          paths.push(path);
          return { error: null };
        },
      }),
    },
  };
  mock.module("server-only", { namedExports: {} });
  mock.module("../apps/admin/lib/server.ts", {
    namedExports: {
      HttpError,
      serviceDb: () => db,
      sessionDb: async () => uploadDb,
      checkDb: (error: { message: string } | null) => {
        if (error) throw new HttpError(409, error.message);
      },
    },
  });
  try {
    const { uploadMedia, deleteMedia, mediaStoragePath } =
      await import("../apps/admin/lib/media.ts");
    const image = await sharp({
      create: { width: 1920, height: 1000, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const media = await uploadMedia(sid, "owner", image, uploadDb as never);
    assert.equal(media.id, id);
    assert.equal(paths.length, 3);
    assert.equal(calls.filter((c) => c === "reserve_media_upload").length, 1);
    assert.equal(calls.at(-1), "complete_media_upload");
    assert.equal(
      mediaStoragePath(sid, id, prefix + "/original", media.src),
      paths.at(-1),
    );
    assert.throws(
      () => mediaStoragePath(sid, id, "foreign/asset/original", media.src),
      /zakres/,
    );
    paths = [];
    calls = [];
    failUpload = true;
    failRemove = true;
    await assert.rejects(
      uploadMedia(sid, "owner", image, uploadDb as never),
      /przetworzyć/,
    );
    assert.equal(paths.length, 1);
    assert.ok(calls.includes("fail_media_upload"));
    assert.ok(
      !calls.includes("finish_media_deletion"),
      "Storage failure must preserve deletion metadata",
    );
    failRemove = false;
    await deleteMedia(sid, id, "owner", true);
    assert.equal(paths.length, 0);
    assert.equal(calls.at(-1), "finish_media_deletion");
    calls = [];
    failUpload = false;
    failComplete = true;
    await assert.rejects(
      uploadMedia(sid, "owner", image, uploadDb as never),
      /MEDIA_UNAVAILABLE/,
    );
    assert.ok(calls.includes("fail_media_upload"));
    assert.equal(paths.length, 0);
  } finally {
    mock.restoreAll();
  }
});

test("image request reader bounds chunked bodies and rejects empty or unsupported requests", async () => {
  class HttpError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  mock.module("server-only", { namedExports: {} });
  mock.module("../apps/admin/lib/server.ts", { namedExports: { HttpError } });
  try {
    const { readImage, maxImageBytes } =
      await import("../apps/admin/lib/media-upload.ts");
    await assert.rejects(
      readImage(
        new Request("https://test", {
          method: "POST",
          body: "bad",
          headers: { "Content-Type": "text/plain" },
        }),
      ),
      /Wymagane/,
    );
    await assert.rejects(
      readImage(
        new Request("https://test", {
          method: "POST",
          headers: { "Content-Type": "image/png" },
        }),
      ),
      /Brak/,
    );
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(maxImageBytes + 1));
      },
      cancel() {
        cancelled = true;
      },
    });
    await assert.rejects(
      readImage(
        new Request("https://test", {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: stream,
          duplex: "half",
        } as RequestInit),
      ),
      /4 MB/,
    );
    assert.ok(cancelled);
    assert.deepEqual(
      await readImage(
        new Request("https://test", {
          method: "POST",
          body: new Uint8Array([1, 2, 3]),
          headers: { "Content-Type": "image/webp" },
        }),
      ),
      Buffer.from([1, 2, 3]),
    );
  } finally {
    mock.restoreAll();
  }
});
