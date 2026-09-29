import { test } from "node:test";
import assert from "node:assert/strict";
import {
  purgeHandler,
  type PurgeServices,
} from "../supabase/functions/purge-sites/handler.ts";
const id = "20000000-0000-4000-8000-000000000001";
const request = () =>
  new Request("https://test/purge", {
    method: "POST",
    body: JSON.stringify({ siteId: id, token: "a".repeat(64) }),
  });
test("purge worker requires a valid claim and deletes files before finishing", async () => {
  const calls: string[] = [];
  let objects = [{ path: `${id}/photo.png` }];
  const services: PurgeServices = {
    claim: async () => ({ data: true, error: null }),
    paths: async () => ({ data: objects, error: null }),
    remove: async (paths) => {
      assert.deepEqual(paths, [`${id}/photo.png`]);
      calls.push("storage");
      objects = [];
      return { error: null };
    },
    finish: async () => {
      calls.push("database");
      return { error: null };
    },
    fail: async () => {
      calls.push("failed");
    },
  };
  assert.equal((await purgeHandler(services)(request())).status, 200);
  assert.deepEqual(calls, ["storage", "database"]);
  calls.length = 0;
  assert.equal(
    (
      await purgeHandler({
        ...services,
        claim: async () => ({ data: false, error: null }),
      })(request())
    ).status,
    403,
  );
  assert.deepEqual(calls, []);
  objects = [{ path: `${id}/photo.png` }];
  assert.equal(
    (
      await purgeHandler({
        ...services,
        remove: async () => ({ error: "storage unavailable" }),
      })(request())
    ).status,
    503,
  );
  assert.deepEqual(calls, ["failed"]);
  calls.length = 0;
  objects = [{ path: "another-project/photo.png" }];
  assert.equal((await purgeHandler(services)(request())).status, 503);
  assert.deepEqual(calls, ["failed"]);
});
