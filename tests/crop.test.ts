import { test } from "node:test";
import assert from "node:assert/strict";
import { cropFrame, cropPosition } from "../apps/admin/lib/crop.ts";

test("crop frame stays inside portrait and landscape photos and matches object-position", () => {
  assert.deepEqual(cropFrame(1.5, 0.75), { width: 50, height: 100 });
  assert.deepEqual(cropFrame(0.75, 1.5), { width: 100, height: 50 });
  assert.deepEqual(cropFrame(1, 1), { width: 100, height: 100 });
  assert.equal(cropPosition(25, 50), 0);
  assert.equal(cropPosition(50, 50), 50);
  assert.equal(cropPosition(75, 50), 100);
  assert.equal(cropPosition(-20, 50), 0);
  assert.equal(cropPosition(120, 50), 100);
  assert.equal(cropPosition(50, 100), 50);
});
