import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatQuestionValue,
  questionPresets,
  rsvpQuestionInputSchema,
  summarizeQuestions,
  validateQuestionAnswers,
  visibleQuestions,
  type RsvpQuestion,
} from "../packages/domain/src/rsvp-questions.ts";

const qDiet: RsvpQuestion = {
  id: "10000000-0000-4000-8000-000000000001",
  scope: "guest",
  type: "single",
  label: "Dieta",
  help: null,
  required: true,
  allowOther: true,
  options: [
    { id: "std", label: "Standard" },
    { id: "veg", label: "Wege" },
  ],
  variantIds: [],
  presetKey: "diet",
};

const qLodging: RsvpQuestion = {
  id: "10000000-0000-4000-8000-000000000002",
  scope: "invitation",
  type: "single",
  label: "Nocleg",
  help: null,
  required: false,
  allowOther: false,
  options: [
    { id: "yes", label: "Tak" },
    { id: "no", label: "Nie" },
  ],
  variantIds: ["full"],
  presetKey: "lodging",
};

const qParkingNum: RsvpQuestion = {
  id: "10000000-0000-4000-8000-000000000003",
  scope: "invitation",
  type: "number",
  label: "Miejsca parkingowe",
  help: null,
  required: false,
  allowOther: false,
  options: [],
  variantIds: [],
  presetKey: null,
};

test("rsvpQuestionInputSchema validates options and limits", () => {
  assert.equal(
    rsvpQuestionInputSchema.safeParse({
      scope: "guest",
      type: "text",
      label: "Alergie",
      options: [{ id: "a", label: "A" }],
    }).success,
    false,
  );
  assert.equal(
    rsvpQuestionInputSchema.safeParse({
      scope: "guest",
      type: "single",
      label: "Dieta",
      options: [],
    }).success,
    false,
  );
  assert.equal(
    rsvpQuestionInputSchema.safeParse({
      scope: "guest",
      type: "single",
      label: "Dieta",
      options: [{ id: "std", label: "Standard" }],
      allowOther: true,
    }).success,
    true,
  );
});

test("questionPresets returns localized presets in PL, EN and DE", () => {
  assert.equal(questionPresets("pl-PL").diet.label, "Dieta");
  assert.equal(questionPresets("en-GB").diet.label, "Diet");
  assert.equal(questionPresets("de-DE").diet.label, "Ernährung");
});

test("visibleQuestions filters by variant and attending guests", () => {
  const none = visibleQuestions([qDiet, qLodging], {
    variantId: "full",
    attendingGuestIds: new Set(),
  });
  assert.equal(none.invitation.length, 0);
  assert.equal(none.byGuest.size, 0);

  const limited = visibleQuestions([qDiet, qLodging], {
    variantId: "ceremony-only",
    attendingGuestIds: new Set(["g1"]),
  });
  assert.equal(limited.invitation.length, 0);
  assert.equal(limited.byGuest.get("g1")?.length, 1);

  const full = visibleQuestions([qDiet, qLodging], {
    variantId: "full",
    attendingGuestIds: new Set(["g1"]),
  });
  assert.equal(full.invitation.length, 1);
});

test("validateQuestionAnswers enforces required and allowOther rules", () => {
  const missing = validateQuestionAnswers([qDiet], [], {
    variantId: "full",
    attendingGuestIds: new Set(["g1"]),
  });
  assert.equal(missing.length, 1);
  assert.equal(missing[0]!.reason, "required");

  const otherOk = validateQuestionAnswers(
    [qDiet],
    [
      {
        questionId: qDiet.id,
        guestId: "g1",
        value: { optionIds: [], other: "bez laktozy" },
      },
    ],
    { variantId: "full", attendingGuestIds: new Set(["g1"]) },
  );
  assert.equal(otherOk.length, 0);

  const adminBypass = validateQuestionAnswers([qDiet], [], {
    variantId: "full",
    attendingGuestIds: new Set(["g1"]),
    enforceRequired: false,
  });
  assert.equal(adminBypass.length, 0);
});

test("summarizeQuestions and formatQuestionValue compute counts and readable labels", () => {
  const sums = summarizeQuestions(
    [qDiet, qParkingNum],
    [
      {
        questionId: qDiet.id,
        invitationId: "inv1",
        guestId: "g1",
        value: { optionIds: [], other: "bez laktozy" },
      },
      {
        questionId: qParkingNum.id,
        invitationId: "inv1",
        guestId: null,
        value: { number: 2 },
      },
    ],
    [{ id: "inv1", variantId: "full", attendingGuestIds: ["g1", "g2"] }],
  );

  assert.equal(sums[0]!.type, "choice");
  if (sums[0]!.type === "choice") {
    assert.equal(sums[0]!.otherCount, 1);
    assert.equal(sums[0]!.missingCount, 1);
  }
  assert.equal(sums[1]!.type, "number");
  if (sums[1]!.type === "number") {
    assert.equal(sums[1]!.sum, 2);
  }
  assert.equal(
    formatQuestionValue(qDiet, { optionIds: ["veg"], other: "bez glutenu" }),
    "Wege, Inne: bez glutenu",
  );
});
