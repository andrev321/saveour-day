import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemo } from "../packages/domain/src/demo.ts";
import { guestContent } from "../packages/domain/src/guest.ts";
import { digest, hashCode, verifyCode } from "../packages/domain/src/access-code.ts";

test("guest projection strips hidden events, sections and unrelated resources", () => {
  const config = createDemo();
  const variant = { ...config.variants[0], id: "limited", slug: "limited" };
  config.variants.push(variant);
  variant.hiddenEventIds = config.events.slice(1).map((e) => e.id);
  variant.hiddenSectionIds = config.sections.map((s) => s.id);
  const result = guestContent(config, variant.id);
  assert.equal(result.variants.length, 1);
  assert.deepEqual(
    result.events.map((e) => e.id),
    [config.events[0].id],
  );
  assert.equal(result.sections.length, 0);
  assert.equal(result.contacts.length, 0);
  assert.equal(result.media.length, 0);
  assert.equal(result.metadata.indexing, false);
  for (const e of config.events.slice(1))
    assert.ok(!JSON.stringify(result).includes(e.title));
  assert.throws(() => guestContent(config, "nonexistent"));
});
test("code hashes are salted and cannot be accepted with a wrong code", async () => {
  const first = await hashCode("family-2026"),
    second = await hashCode("family-2026");
  assert.notEqual(first, second);
  assert.equal(await verifyCode("family-2026", first), true);
  assert.equal(await verifyCode("wrong", first), false);
  assert.equal(await verifyCode("wrong", null), false);
  assert.equal(await verifyCode("wrong", "broken"), false);
  assert.equal(digest("token").length, 64);
});
