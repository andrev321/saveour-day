import { test } from "node:test";
import assert from "node:assert/strict";
import { createDemo } from "../packages/domain/src/demo.ts";
import {
  calendarFile,
  csvFile,
  parseGuestCsv,
  guestDetailsSchema,
} from "../packages/domain/src/operations.ts";
import {
  DraftHistory,
  createDraftTabSnapshot,
  mergeDraft,
  parseDraftTabSnapshot,
  recoverDraft,
} from "../apps/admin/lib/use-draft.ts";
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

test("tab recovery preserves incomplete text and URLs while rejecting malformed structure", () => {
  const draft = createDemo();
  draft.identity.displayName = "";
  draft.events[0].url = "unfinished";
  assert.deepEqual(recoverDraft(draft), draft);
  assert.equal(recoverDraft({ ...draft, events: null }), null);
  assert.equal(recoverDraft({ ...draft, id: "invalid/id" }), null);

  const persisted = recoverDraft(createDemo())!;
  const edited = structuredClone(persisted);
  edited.identity.displayName = "";
  const now = 1_700_000_000_000;
  const raw = createDraftTabSnapshot(edited, now);
  assert.deepEqual(
    parseDraftTabSnapshot(raw, persisted.id, persisted, now + 1000),
    edited,
  );
  // Expired snapshot returns null
  assert.equal(
    parseDraftTabSnapshot(raw, persisted.id, persisted, now + 8 * 86400_000),
    null,
  );
  // Wrong site ID returns null
  assert.equal(
    parseDraftTabSnapshot(raw, "other-site", persisted, now + 1000),
    null,
  );
  // Identical to persisted returns null
  const unchangedRaw = createDraftTabSnapshot(persisted, now);
  assert.equal(
    parseDraftTabSnapshot(unchangedRaw, persisted.id, persisted, now + 1000),
    null,
  );
});

test("DraftHistory coalesces rapid edits within 500ms and supports undo, redo, and reset", () => {
  const initial = createDemo();
  const history = new DraftHistory(initial);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);

  const step1 = structuredClone(initial);
  step1.identity.displayName = "A";
  history.set(step1, 1000);
  assert.equal(history.canUndo, true);

  // Rapid edit within 500ms coalesces onto the same undo point
  const step1b = structuredClone(initial);
  step1b.identity.displayName = "AB";
  history.set(step1b, 1200);
  assert.equal(history.current.identity.displayName, "AB");

  // Edit after >500ms creates a second undo point
  const step2 = structuredClone(initial);
  step2.identity.displayName = "ABC";
  history.set(step2, 2000);

  assert.equal(history.undo()?.identity.displayName, "AB");
  assert.equal(history.canRedo, true);
  assert.equal(history.undo()?.identity.displayName, initial.identity.displayName);
  assert.equal(history.canUndo, false);
  // Empty undo returns null
  assert.equal(history.undo(), null);
  assert.equal(history.redo()?.identity.displayName, "AB");

  // Setting identical config is a no-op and returns false
  assert.equal(history.set(structuredClone(history.current), 3000), false);

  // Enforce maxUndoDepth (50)
  for (let i = 1; i <= 55; i++) {
    const next = structuredClone(initial);
    next.identity.displayName = `Step ${i}`;
    history.set(next, 3000 + i * 1000);
  }
  let undoCount = 0;
  while (history.undo()) undoCount++;
  assert.equal(undoCount, 50);

  history.reset(step2);
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
  assert.equal(history.redo(), null);
  assert.equal(history.current.identity.displayName, "ABC");

  // Malformed JSON and null raw inputs to parseDraftTabSnapshot return null safely
  assert.equal(parseDraftTabSnapshot(null, initial.id, initial), null);
  assert.equal(parseDraftTabSnapshot("{broken-json", initial.id, initial), null);
});


