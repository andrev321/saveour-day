import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectGuestCollisions,
  formatShareMessage,
  normalizeGuestLookup,
  readAllPages,
} from "../packages/domain/src/hybrid-rsvp.ts";
import { parseGuestCsv } from "../packages/domain/src/operations.ts";
import { guestLookupSchema, selfRegisterSchema } from "../packages/domain/src/guest.ts";

test("normalizeGuestLookup folds Polish and German diacritics and collapses whitespace", () => {
  assert.equal(normalizeGuestLookup("  Łukasz   Żółć "), "lukasz zolc");
  assert.equal(normalizeGuestLookup("ĄĘĆŁŃÓŚŹŻ"), "aeclnoszz");
  assert.equal(normalizeGuestLookup("Müller Straße"), "muller strase");
  assert.equal(normalizeGuestLookup("Anna Nowak-Kowalska"), "anna nowak kowalska");
  assert.equal(normalizeGuestLookup("Anna Nowak Kowalska"), "anna nowak kowalska");
});

test("detectGuestCollisions flags names shared across different invitations only", () => {
  const collisions = detectGuestCollisions([
    {
      id: "inv-1",
      label: "Anna Kowalska (praca)",
      guests: [{ id: "g1", name: "Anna Kowalska" }],
    },
    {
      id: "inv-2",
      label: "Kowalscy",
      guests: [
        { id: "g2", name: "  anna   kowalska " },
        { id: "g3", name: "Marek Kowalski" },
      ],
    },
    {
      id: "inv-3",
      label: "Nowakowie",
      guests: [
        { id: "g4", name: "Piotr Nowak" },
        { id: "g5", name: "Piotr Nowak" },
      ],
    },
  ]);

  assert.deepEqual(collisions.get("inv-1"), ["Anna Kowalska"]);
  assert.deepEqual(collisions.get("inv-2"), ["anna   kowalska"]);
  assert.equal(collisions.has("inv-3"), false);
});

test("formatShareMessage builds localized personal and shared_with_code messages", () => {
  const personalPl = formatShareMessage({
    locale: "pl-PL",
    displayName: "Zuzanna & Michał",
    kind: "personal",
    url: "https://saveour.day/i/tok1",
    deadline: "2027-07-01",
  });
  assert.ok(personalPl.includes("https://saveour.day/i/tok1"));
  assert.ok(personalPl.includes("2027-07-01"));

  const sharedWithCodePl = formatShareMessage({
    locale: "pl-PL",
    displayName: "Zuzanna & Michał",
    kind: "shared_with_code",
    url: "https://saveour.day/s/nasz-slub",
    shortCode: "KOW482",
  });
  assert.ok(sharedWithCodePl.includes("https://saveour.day/s/nasz-slub"));
  assert.ok(sharedWithCodePl.includes("KOW482"));

  const sharedEn = formatShareMessage({
    locale: "en-US",
    displayName: "Zuzanna & Michał",
    kind: "shared_with_code",
    url: "https://saveour.day/s/our-wedding",
    shortCode: "ABC234",
  });
  assert.ok(sharedEn.includes("ABC234"));
});

test("parseGuestCsv accepts CSV without email column", () => {
  const parsed = parseGuestCsv(
    "rodzina;goscie\nKowalscy;Anna Kowalska|Marek Kowalski\nNowak;Piotr Nowak",
    "slub",
  );
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0]!.emails, []);
  assert.deepEqual(parsed[0]!.names, ["Anna Kowalska", "Marek Kowalski"]);
});

test("readAllPages paginates and stops on error", async () => {
  const pages = [[1, 2], [3]];
  const all = await readAllPages(
    async (from) => ({ data: pages[Math.floor(from / 2)] ?? [], error: null }),
    undefined,
    2,
  );
  assert.deepEqual(all, [1, 2, 3]);
});

test("guestLookupSchema and selfRegisterSchema validate lookup and self-registration payloads", () => {
  assert.equal(guestLookupSchema.safeParse({ query: "Anna Kowalska" }).success, true);
  assert.equal(guestLookupSchema.safeParse({ query: "   " }).success, false);
  assert.equal(
    selfRegisterSchema.safeParse({
      name: "Janina Testowa",
      rsvp: { revision: 0, note: "", answers: [] },
    }).success,
    true,
  );
});
