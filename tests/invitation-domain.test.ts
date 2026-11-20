import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OVERALL_EVENT_ID,
  guestDisplayName,
  invitationDisplayName,
  invitationGuestsSchema,
  overallEventLabel,
  parseQuickAdd,
  resolveRsvpEvents,
  rsvpAttendanceConfigSchema,
  summarizeRsvp,
} from "../packages/domain/src/invitation.ts";

test("invitationDisplayName and guestDisplayName format singles, groups and companions", () => {
  assert.equal(
    guestDisplayName({ kind: "companion", name: null }),
    "Osoba towarzysząca",
  );
  assert.equal(
    guestDisplayName({ kind: "companion", name: "  Marek  " }),
    "Marek",
  );

  assert.equal(
    invitationDisplayName({
      groupName: null,
      guests: [{ kind: "named", name: "Anna Kowalska" }],
    }),
    "Anna Kowalska",
  );
  assert.equal(
    invitationDisplayName({
      groupName: null,
      guests: [
        { kind: "named", name: "Anna Kowalska" },
        { kind: "companion", name: null },
      ],
    }),
    "Anna Kowalska + 1",
  );
  assert.equal(
    invitationDisplayName({
      groupName: null,
      guests: [
        { kind: "named", name: "Anna" },
        { kind: "named", name: "Jan" },
      ],
    }),
    "Anna i Jan",
  );
  assert.equal(
    invitationDisplayName({
      groupName: "Rodzina Nowaków",
      guests: [
        { kind: "named", name: "Jan" },
        { kind: "named", name: "Ewa" },
        { kind: "companion", name: null },
      ],
    }),
    "Rodzina Nowaków",
  );
});

test("invitationGuestsSchema requires at least one named guest and caps at 20", () => {
  assert.equal(
    invitationGuestsSchema.safeParse([{ kind: "companion", name: null }])
      .success,
    false,
  );
  assert.equal(
    invitationGuestsSchema.safeParse([{ kind: "named", name: "   " }]).success,
    false,
  );
  assert.equal(
    invitationGuestsSchema.safeParse([
      { kind: "named", name: "Anna" },
      { kind: "companion", name: null },
      { kind: "companion", name: null },
    ]).success,
    true,
  );
  const twentyOne = Array.from({ length: 21 }, (_, i) => ({
    kind: "named" as const,
    name: `Guest ${i}`,
  }));
  assert.equal(invitationGuestsSchema.safeParse(twentyOne).success, false);
});

test("summarizeRsvp counts companions in totals and computes partial/answered statuses", () => {
  const summary = summarizeRsvp(
    [
      {
        id: "inv-1",
        guests: [
          { id: "g1", kind: "named" },
          { id: "g2", kind: "companion" },
        ],
        events: [{ id: "e1" }, { id: "e2" }],
      },
      {
        id: "inv-2",
        guests: [{ id: "g3", kind: "named" }],
        events: [{ id: "e1" }],
      },
    ],
    [
      {
        invitation_id: "inv-1",
        guest_id: "g1",
        event_id: "e1",
        attending: true,
      },
      {
        invitation_id: "inv-1",
        guest_id: "g1",
        event_id: "e2",
        attending: false,
      },
      {
        invitation_id: "inv-1",
        guest_id: "g2",
        event_id: "e1",
        attending: true,
      },
      {
        invitation_id: "inv-1",
        guest_id: "g2",
        event_id: "e2",
        attending: true,
      },
    ],
  );

  assert.equal(summary.totals.invited, 3);
  assert.equal(summary.totals.attending, 2);
  assert.equal(summary.totals.pending, 1);
  assert.equal(summary.totals.companionsInvited, 1);
  assert.equal(summary.totals.companionsAttending, 1);
  assert.equal(summary.byGuest.get("g1"), "partial");
  assert.equal(summary.byGuest.get("g2"), "attending");
  assert.equal(summary.byGuest.get("g3"), "pending");
  assert.equal(summary.byInvitation.get("inv-1"), "answered");
  assert.equal(summary.byInvitation.get("inv-2"), "pending");
  assert.equal(summary.byEvent.e1?.attending, 2);
  assert.equal(summary.byEvent.e1?.companionsAttending, 1);
});

test("parseQuickAdd parses commas, +N and optional Group: prefix", () => {
  const ok = parseQuickAdd(
    "Anna Kowalska +1\nRodzina Nowaków: Jan Nowak, Ewa Nowak +2\nAnna i Jan Kowalscy",
    "full",
  );
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.items.length, 3);
    assert.equal(ok.items[0]!.groupName, null);
    assert.equal(ok.items[0]!.guests.length, 2);
    assert.equal(ok.items[1]!.groupName, "Rodzina Nowaków");
    assert.equal(ok.items[1]!.guests.length, 4);
    assert.equal(ok.items[2]!.guests.length, 1);
    assert.equal(ok.items[2]!.guests[0]!.name, "Anna i Jan Kowalscy");
  }

  const bad = parseQuickAdd(": Jan Nowak\n+2", "full");
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.errors.length, 2);
  }
});

test("resolveRsvpEvents handles overall mode, selected events, and empty-intersection fallback", () => {
  const variantEvents = [
    { id: "ceremony", title: "Ceremonia" },
    { id: "dinner", title: "Obiad" },
    { id: "cake", title: "Tort" },
    { id: "afterparty", title: "Poprawiny" },
  ];

  assert.deepEqual(
    resolveRsvpEvents(
      variantEvents,
      { mode: "overall", eventIds: ["ceremony", "afterparty"] },
      overallEventLabel("pl-PL"),
    ),
    [{ id: OVERALL_EVENT_ID, title: "Całe wydarzenie" }],
  );

  assert.deepEqual(
    resolveRsvpEvents(
      [],
      { mode: "overall", eventIds: [] },
      overallEventLabel("en-GB"),
    ),
    [{ id: OVERALL_EVENT_ID, title: "Whole event" }],
  );

  assert.deepEqual(
    resolveRsvpEvents(
      variantEvents,
      { mode: "events", eventIds: ["afterparty", "ceremony"] },
      overallEventLabel("pl-PL"),
    ),
    [
      { id: "ceremony", title: "Ceremonia" },
      { id: "afterparty", title: "Poprawiny" },
    ],
  );

  // Variant without any of the selected events falls back to whole-event attendance.
  assert.deepEqual(
    resolveRsvpEvents(
      [{ id: "ceremony", title: "Ceremonia" }],
      { mode: "events", eventIds: ["dinner", "afterparty"] },
      overallEventLabel("de-DE"),
    ),
    [{ id: OVERALL_EVENT_ID, title: "Gesamte Veranstaltung" }],
  );
});

test("rsvpAttendanceConfigSchema validates mode, uniqueness and non-empty events mode", () => {
  assert.equal(
    rsvpAttendanceConfigSchema.safeParse({ mode: "overall", eventIds: [] })
      .success,
    true,
  );
  assert.equal(
    rsvpAttendanceConfigSchema.safeParse({ mode: "events", eventIds: [] })
      .success,
    false,
  );
  assert.equal(
    rsvpAttendanceConfigSchema.safeParse({
      mode: "events",
      eventIds: ["ceremony", "ceremony"],
    }).success,
    false,
  );
  assert.equal(
    rsvpAttendanceConfigSchema.safeParse({
      mode: "events",
      eventIds: ["__overall__"],
    }).success,
    false,
  );
  assert.equal(
    rsvpAttendanceConfigSchema.safeParse({
      mode: "events",
      eventIds: ["ceremony", "afterparty"],
    }).success,
    true,
  );
});
