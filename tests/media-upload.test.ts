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

test("consolidated media policy enforces MIME, format, byte and pixel budgets across client and server", async () => {
  const {
    MEDIA_POLICY,
    maxImageBytes,
    maxPhotoFileBytes,
    isSupportedMediaMime,
    isSupportedMediaFormat,
    computeInitialDownscale,
  } = await import("../apps/admin/lib/media-limits.ts");

  assert.equal(MEDIA_POLICY.maxTransportBytes, 4 * 1024 * 1024);
  assert.equal(MEDIA_POLICY.maxServerBytes, 8 * 1024 * 1024);
  assert.equal(MEDIA_POLICY.maxClientFileBytes, 10 * 1024 * 1024);
  assert.equal(MEDIA_POLICY.maxInputPixels, 20_000_000);
  assert.equal(maxImageBytes, MEDIA_POLICY.maxTransportBytes);
  assert.equal(maxPhotoFileBytes, MEDIA_POLICY.maxClientFileBytes);

  assert.equal(isSupportedMediaMime("image/jpeg"), true);
  assert.equal(isSupportedMediaMime("image/png; charset=utf-8"), true);
  assert.equal(isSupportedMediaMime("image/webp"), true);
  assert.equal(isSupportedMediaMime("image/gif"), false);
  assert.equal(isSupportedMediaMime(null), false);

  assert.equal(isSupportedMediaFormat("jpeg", 1), true);
  assert.equal(isSupportedMediaFormat("webp", 2), false);
  assert.equal(isSupportedMediaFormat("gif", 1), false);

  assert.equal(computeInitialDownscale(4000, 3000), 1);
  const scale = computeInitialDownscale(6000, 4000);
  assert.ok(scale < 1 && scale > 0.9);
  assert.ok(
    Math.round(6000 * scale) * Math.round(4000 * scale) <=
      MEDIA_POLICY.maxInputPixels,
  );
});

test("preparePhotoUpload rejects unsupported MIME, returns within-budget files unchanged, and downscales oversized photos", async () => {
  const { preparePhotoUpload, maxPhotoFileBytes } =
    await import("../apps/admin/lib/prepare-photo-upload.ts");
  const { maxImageBytes } = await import("../apps/admin/lib/media-limits.ts");

  assert.equal(maxPhotoFileBytes, 10 * 1024 * 1024);

  // 1. Unsupported MIME returns null without touching createImageBitmap
  const gifFile = new File([new Uint8Array([1, 2, 3])], "anim.gif", {
    type: "image/gif",
  });
  assert.equal(await preparePhotoUpload(gifFile), null);

  // 2. Stub browser globals for createImageBitmap and canvas
  let closed = false;
  let currentBitmap = {
    width: 2000,
    height: 1500,
    close() {
      closed = true;
    },
  };
  const drawnSizes: { w: number; h: number; quality: number }[] = [];
  const origCreateImageBitmap = globalThis.createImageBitmap;
  const origDocument = globalThis.document;

  (globalThis as Record<string, unknown>).createImageBitmap = async () =>
    currentBitmap;
  (globalThis as Record<string, unknown>).document = {
    createElement(tag: string) {
      assert.equal(tag, "canvas");
      const canvas = {
        width: 0,
        height: 0,
        getContext(kind: string) {
          assert.equal(kind, "2d");
          return {
            drawImage(
              _bmp: unknown,
              _x: number,
              _y: number,
              w: number,
              h: number,
            ) {
              assert.equal(w, canvas.width);
              assert.equal(h, canvas.height);
            },
          };
        },
        toBlob(cb: (blob: Blob | null) => void, mime: string, quality: number) {
          assert.equal(mime, "image/webp");
          drawnSizes.push({ w: canvas.width, h: canvas.height, quality });
          // Succeed when quality <= 0.8
          const size = quality <= 0.8 ? 500_000 : maxImageBytes + 100;
          cb(new Blob([new Uint8Array(size)], { type: "image/webp" }));
        },
      };
      return canvas;
    },
  };

  try {
    // Within pixel & byte budget -> returns original File directly
    const smallFile = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg",
    });
    const unchanged = await preparePhotoUpload(smallFile);
    assert.equal(unchanged, smallFile);
    assert.equal(closed, true);
    assert.equal(drawnSizes.length, 0);

    // Oversized pixel count (6000x4000 = 24 MP > 20 MP) -> downscales via canvas and compresses to WebP
    closed = false;
    currentBitmap = {
      width: 6000,
      height: 4000,
      close() {
        closed = true;
      },
    };
    const hiResFile = new File([new Uint8Array(1024)], "hires.png", {
      type: "image/png",
    });
    const compressed = await preparePhotoUpload(hiResFile);
    assert.ok(compressed instanceof Blob);
    assert.ok(compressed.size <= maxImageBytes);
    assert.equal(closed, true);
    assert.equal(drawnSizes.length, 2); // tried 0.9 (too large), succeeded at 0.8
    assert.ok(drawnSizes[0]!.w * drawnSizes[0]!.h <= 20_000_000);
  } finally {
    (globalThis as Record<string, unknown>).createImageBitmap =
      origCreateImageBitmap;
    (globalThis as Record<string, unknown>).document = origDocument;
  }
});
