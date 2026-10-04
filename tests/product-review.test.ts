import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemo } from "../packages/domain/src/demo.ts";
import {
  calendarFile,
  csvFile,
  parseGuestCsv,
  guestDetailsSchema,
} from "../packages/domain/src/operations.ts";
import { mergeDraft } from "../apps/admin/lib/draft-merge.ts";
import { publicationWarnings } from "../packages/domain/src/readiness.ts";
test("CSV handles quoted records, Polish letters and rejects invalid or oversized input", () => {
  const source =
    '\uFEFFrodzina;goscie;email\r\n"Nowak; rodzina";"Żaneta|Jan";JAN@example.com';
  assert.deepEqual(parseGuestCsv(source, "all"), [
    {
      label: "Nowak; rodzina",
      names: ["Żaneta", "Jan"],
      emails: ["jan@example.com"],
      variantId: "all",
    },
  ]);
  assert.throws(() => parseGuestCsv("rodzina;goscie;email\nA;Jan;bad", "all"));
  assert.throws(() => parseGuestCsv('rodzina;goscie\n"unfinished', "all"));
  assert.throws(() => parseGuestCsv("x".repeat(200001), "all"));
  assert.equal(
    csvFile([["=SUM(1)", '"Żaneta"', " @evil"]]),
    '\uFEFF"\'=SUM(1)";"""Żaneta""";"\' @evil"',
  );
});
test("calendar exports only supplied events with stable identifiers and safe folding", () => {
  const config = createDemo();
  config.events = config.events.slice(0, 1);
  config.events[0].date = "2027-06-12";
  config.events[0].time = "15:30";
  config.events[0].title = "Ślub; " + "Ł".repeat(90);
  const text = calendarFile(config, new Date("2026-10-04T12:00:00Z"));
  assert.match(text, /DTSTART;TZID=Europe\/Warsaw:20270612T153000/);
  assert.match(text, /DTSTAMP:20261004T120000Z/);
  assert.match(text, /SUMMARY:Ślub\\;/);
  for (const line of text.split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
  config.events[0].time = "";
  assert.ok(!calendarFile(config).includes("BEGIN:VEVENT"));
});
test("three-way draft merge keeps independent changes and reports overlapping changes", () => {
  const base = createDemo(),
    local = structuredClone(base),
    remote = structuredClone(base);
  local.identity.displayName = "Local";
  remote.locale = "de-DE";
  const merged = mergeDraft(base, local, remote);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.config.identity.displayName, "Local");
  assert.equal(merged.config.locale, "de-DE");
  remote.identity.displayName = "Remote";
  assert.deepEqual(mergeDraft(base, local, remote).conflicts, ["identity"]);
  assert.equal(base.identity.displayName, "Anna & Jan");
});
test("readiness and question validation catch incomplete setup", () => {
  const config = createDemo();
  config.events[0].date = "";
  assert.ok(
    publicationWarnings(config).some((i) => i.message.includes("daty")),
  );
  assert.ok(
    !guestDetailsSchema.safeParse({ "not-a-uuid": { diet: "vegan" } }).success,
  );
  assert.ok(
    !guestDetailsSchema.safeParse({
      "40000000-0000-4000-8000-000000000001": { diet: "x".repeat(301) },
    }).success,
  );
});

import { recoverDraft } from "../apps/admin/lib/draft-recovery.ts";
test("tab recovery preserves incomplete text and URLs while rejecting malformed structure", () => {
  const draft = createDemo();
  draft.identity.displayName = "";
  draft.events[0].url = "unfinished";
  assert.deepEqual(recoverDraft(draft), draft);
  assert.equal(recoverDraft({ ...draft, events: null }), null);
  assert.equal(recoverDraft({ ...draft, id: "invalid/id" }), null);
});
