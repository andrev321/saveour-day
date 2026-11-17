import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectGuestCollisions,
  formatShareMessage,
  normalizeGuestLookup,
  readAllPages,
} from "../packages/domain/src/hybrid-rsvp.ts";
import { parseGuestCsv } from "../packages/domain/src/operations.ts";
import {
  guestLookupSchema,
  selfRegisterSchema,
} from "../packages/domain/src/guest.ts";

test("normalizeGuestLookup folds Polish and German diacritics and collapses whitespace", () => {
  assert.equal(normalizeGuestLookup("  Łukasz   Żółć "), "lukasz zolc");
  assert.equal(normalizeGuestLookup("ĄĘĆŁŃÓŚŹŻ"), "aeclnoszz");
  assert.equal(normalizeGuestLookup("Müller Straße"), "muller strase");
  assert.equal(
    normalizeGuestLookup("Anna Nowak-Kowalska"),
    "anna nowak kowalska",
  );
  assert.equal(
    normalizeGuestLookup("Anna Nowak Kowalska"),
    "anna nowak kowalska",
  );
});

test("detectGuestCollisions flags names shared across different invitations only and ignores companions", () => {
  const collisions = detectGuestCollisions([
    {
      id: "inv-1",
      guests: [{ id: "g1", kind: "named", name: "Anna Kowalska" }],
    },
    {
      id: "inv-2",
      guests: [
        { id: "g2", kind: "named", name: "  anna   kowalska " },
        { id: "g3", kind: "named", name: "Marek Kowalski" },
        { id: "g3b", kind: "companion", name: "Piotr Nowak" },
      ],
    },
    {
      id: "inv-3",
      guests: [
        { id: "g4", kind: "named", name: "Piotr Nowak" },
        { id: "g5", kind: "named", name: "Piotr Nowak" },
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
  assert.equal(
    personalPl,
    [
      "Cześć! Przesyłamy zaproszenie na wydarzenie: Zuzanna & Michał.",
      "Twój indywidualny link do zaproszenia i potwierdzenia obecności: https://saveour.day/i/tok1",
      "Prosimy o odpowiedź do: 2027-07-01.",
    ].join("\n\n"),
  );

  const sharedWithCodePl = formatShareMessage({
    locale: "pl-PL",
    displayName: "Zuzanna & Michał",
    kind: "shared_with_code",
    url: "https://saveour.day/s/nasz-slub",
    shortCode: "KOW482",
  });
  assert.equal(
    sharedWithCodePl,
    [
      "Cześć! Przesyłamy zaproszenie na wydarzenie: Zuzanna & Michał.",
      "Link do zaproszenia: https://saveour.day/s/nasz-slub\nTwój kod zaproszenia do potwierdzenia obecności: KOW482",
    ].join("\n\n"),
  );

  const sharedEn = formatShareMessage({
    locale: "en-US",
    displayName: "Zuzanna & Michał",
    kind: "shared_with_code",
    url: "https://saveour.day/s/our-wedding",
    shortCode: "ABC234",
  });
  assert.ok(sharedEn.includes("ABC234"));
});

test("parseGuestCsv parses group, named guests and companion slots", () => {
  const parsed = parseGuestCsv(
    "grupa;osoby;towarzyszace\nKowalscy;Anna Kowalska|Marek Kowalski;1\n;Piotr Nowak;",
    "slub",
  );
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]!.groupName, "Kowalscy");
  assert.deepEqual(parsed[0]!.guests, [
    { kind: "named", name: "Anna Kowalska" },
    { kind: "named", name: "Marek Kowalski" },
    { kind: "companion", name: null },
  ]);
  assert.equal(parsed[1]!.groupName, null);
  assert.deepEqual(parsed[1]!.guests, [{ kind: "named", name: "Piotr Nowak" }]);
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
  assert.equal(
    guestLookupSchema.safeParse({ query: "Anna Kowalska" }).success,
    true,
  );
  assert.equal(guestLookupSchema.safeParse({ query: "   " }).success, false);
  assert.equal(
    selfRegisterSchema.safeParse({
      name: "Janina Testowa",
      rsvp: { revision: 0, note: "", answers: [] },
    }).success,
    true,
  );
});
