import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createTemplate } from "../packages/domain/src/templates.ts";

test("server media validation exempts exact public samples but still checks uploaded media ownership", async () => {
  let reads = 0;
  mock.module("server-only", { namedExports: {} });
  mock.module("../apps/admin/lib/server.ts", {
    namedExports: {
      HttpError: class extends Error {
        constructor(
          public status: number,
          message: string,
        ) {
          super(message);
        }
      },
      checkDb: (error: unknown) => {
        if (error) throw error;
      },
      sessionDb: async () => ({}),
      serviceDb: () => ({
        from: () => {
          reads++;
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({ in: () => ({ data: [], error: null }) }),
              }),
            }),
          };
        },
      }),
    },
  });
  try {
    const { validateMedia } = await import("../apps/admin/lib/media.ts");
    const config = createTemplate("birthday", "test");
    assert.deepEqual(await validateMedia("test", config), {});
    assert.equal(reads, 0);
    const forged = structuredClone(config);
    forged.media[0].src = "/media/private/640.webp";
    await assert.rejects(validateMedia("test", forged));
    assert.equal(reads, 0);
    config.media.push({
      id: "foreign-upload",
      src: "/media/foreign-upload/640.webp",
      alt: "",
      width: 640,
      height: 400,
      variants: [],
    });
    await assert.rejects(
      validateMedia("test", config),
      /nie należy do tej realizacji/,
    );
    assert.equal(reads, 1);
  } finally {
    mock.restoreAll();
  }
});
