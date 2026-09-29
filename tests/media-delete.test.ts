import { test, mock } from "node:test";
import assert from "node:assert/strict";

test("media deletion removes scoped Storage files before metadata and remains retryable after a Storage failure", async () => {
  const sid = "20000000-0000-4000-8000-000000000001";
  const aid = "50000000-0000-4000-8000-000000000001";
  const calls: string[] = [];
  let failStorage = false;
  let rejectDeletion = false;
  let foreignPath = false;
  class HttpError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  mock.module("server-only", { namedExports: {} });
  mock.module("../apps/admin/lib/server.ts", {
    namedExports: {
      HttpError,
      checkDb: (error: { message: string } | null) => {
        if (error) throw new Error(error.message);
      },
      serviceDb: () => ({
        rpc: async (name: string, args: unknown) => {
          calls.push(name);
          assert.deepEqual(args, { sid, aid, actor: "owner" });
          return {
            data:
              name === "begin_media_deletion"
                ? [
                    {
                      path: foreignPath
                        ? "foreign/photo.webp"
                        : `${sid}/${aid}/640.webp`,
                    },
                  ]
                : null,
            error: rejectDeletion ? { message: "MEDIA_IN_RELEASE" } : null,
          };
        },
        storage: {
          from: (bucket: string) => {
            assert.equal(bucket, "site-media");
            return {
              remove: async (paths: string[]) => {
                calls.push("storage.remove");
                assert.deepEqual(paths, [`${sid}/${aid}/640.webp`]);
                return { error: failStorage ? new Error("unavailable") : null };
              },
            };
          },
        },
      }),
    },
  });
  try {
    const { deleteMedia } = await import("../apps/admin/lib/media.ts");
    failStorage = true;
    await assert.rejects(deleteMedia(sid, aid, "owner"), /Ponów usuwanie/);
    assert.deepEqual(calls, ["begin_media_deletion", "storage.remove"]);
    calls.length = 0;
    failStorage = false;
    assert.deepEqual(await deleteMedia(sid, aid, "owner"), { deleted: true });
    assert.deepEqual(calls, [
      "begin_media_deletion",
      "storage.remove",
      "finish_media_deletion",
    ]);
    calls.length = 0;
    rejectDeletion = true;
    await assert.rejects(deleteMedia(sid, aid, "owner"), /MEDIA_IN_RELEASE/);
    assert.deepEqual(calls, ["begin_media_deletion"]);
    calls.length = 0;
    rejectDeletion = false;
    foreignPath = true;
    await assert.rejects(
      deleteMedia(sid, aid, "owner"),
      /Nieprawidłowy zakres/,
    );
    assert.deepEqual(calls, ["begin_media_deletion"]);
  } finally {
    mock.restoreAll();
  }
});
