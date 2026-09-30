import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { aid, sid, prefix, manifest } from "./helpers/media-database.ts";

test("admin media API returns scoped bytes, bounds uploads and cuts access after deletion", async () => {
  let active = true,
    foreign = false,
    ready = true,
    deleteDuringRead = false,
    downloads = 0;
  const record = {
    id: aid,
    site_id: sid,
    status: "ready",
    manifest,
    original_path: `${prefix}/original`,
  };
  class HttpError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  const client = {
    from: (table: string) => {
      assert.equal(table, "media_assets");
      const filters: Record<string, unknown> = {};
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return query;
        },
        maybeSingle: async () => ({
          data:
            !foreign &&
            ready &&
            Object.entries(filters).every(
              ([k, v]) => record[k as keyof typeof record] === v,
            )
              ? record
              : null,
          error: null,
        }),
      };
      return query;
    },
    storage: {
      from: (bucket: string) => {
        assert.equal(bucket, "site-media");
        return {
          download: async (path: string) => {
            assert.equal(path, `${prefix}/640.webp`);
            downloads++;
            if (deleteDuringRead) active = false;
            return { data: new Blob(["image"]), error: null };
          },
        };
      },
    },
  };
  mock.module("server-only", { namedExports: {} });
  mock.module("../apps/admin/lib/server.ts", {
    namedExports: {
      HttpError,
      checkDb: (error: unknown) => {
        if (error) throw error;
      },
      serviceDb: () => client,
      requireSite: async (id: string) => {
        if (!active || id !== sid)
          throw new HttpError(404, "Nie znaleziono realizacji");
        return { site: { id: sid }, user: { id: "owner" }, db: client };
      },
      api:
        (handler: (r: Request) => Promise<unknown>) => async (r: Request) => {
          try {
            const result = await handler(r);
            return result instanceof Response ? result : Response.json(result);
          } catch (e) {
            return Response.json(
              { error: (e as Error).message },
              { status: (e as HttpError).status || 500 },
            );
          }
        },
    },
  });
  mock.module("../apps/admin/lib/media.ts", {
    namedExports: {
      mediaStoragePath: (
        site: string,
        asset: string,
        original: string,
        source: string,
      ) => {
        assert.equal(site, sid);
        assert.equal(asset, aid);
        assert.equal(original, `${prefix}/original`);
        assert.equal(source, manifest.src);
        return `${prefix}/640.webp`;
      },
      uploadMedia: async (
        site: string,
        actor: string,
        image: Buffer,
        db: unknown,
      ) => {
        assert.equal(site, sid);
        assert.equal(actor, "owner");
        assert.equal(db, client);
        assert.deepEqual(image, Buffer.from([1, 2, 3]));
        return manifest;
      },
    },
  });
  try {
    const { GET } =
      await import("../apps/admin/app/api/sites/[id]/media/[asset]/[file]/route.ts");
    const request = () =>
      new Request(`https://test/api/sites/${sid}/media/${aid}/640.webp`);
    const response = await GET(request());
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "image");
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    foreign = true;
    assert.equal((await GET(request())).status, 404);
    assert.equal(downloads, 1);
    foreign = false;
    ready = false;
    assert.equal((await GET(request())).status, 404);
    ready = true;
    assert.equal(
      (
        await GET(
          new Request(`https://test/api/sites/${sid}/media/${aid}/original`),
        )
      ).status,
      404,
    );
    deleteDuringRead = true;
    assert.equal((await GET(request())).status, 404);
    const before = downloads;
    assert.equal((await GET(request())).status, 404);
    assert.equal(downloads, before);
    const { POST } =
      await import("../apps/admin/app/api/sites/[id]/media/route.ts");
    const upload = () =>
      new Request(`https://test/api/sites/${sid}/media`, {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: new Uint8Array([1, 2, 3]),
      });
    assert.equal((await POST(upload())).status, 404);
    active = true;
    deleteDuringRead = false;
    const uploaded = await POST(upload());
    assert.equal(uploaded.status, 200);
    assert.deepEqual(await uploaded.json(), manifest);
    assert.equal(
      (
        await POST(
          new Request(`https://test/api/sites/${sid}/media`, {
            method: "POST",
            headers: {
              "Content-Type": "image/png",
              "Content-Length": "8388609",
            },
            body: "x",
          }),
        )
      ).status,
      413,
    );
  } finally {
    mock.restoreAll();
  }
});
