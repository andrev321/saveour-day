import { z } from "zod";

export const QUESTION_POLICY = {
  maxQuestions: 20,
  maxOptions: 20,
  maxLabelLength: 200,
  maxOptionLabelLength: 100,
  maxHelpLength: 500,
  maxTextAnswerLength: 500,
  maxOtherLength: 200,
  minNumber: 0,
  maxNumber: 99,
} as const;

export type QuestionType = "text" | "single" | "multi" | "number";
export type QuestionScope = "guest" | "invitation";
export type PresetKey = "diet" | "allergies" | "lodging" | "parking";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface RsvpQuestion {
  id: string;
  scope: QuestionScope;
  type: QuestionType;
  label: string;
  help?: string | null;
  required: boolean;
  allowOther: boolean;
  options: QuestionOption[];
  variantIds: string[];
  presetKey?: PresetKey | null;
}

export type QuestionValue =
  | { text: string }
  | { optionIds: string[]; other?: string }
  | { number: number };

export interface QuestionAnswerRecord {
  questionId: string;
  invitationId: string;
  guestId: string | null;
  value: QuestionValue;
}

export const questionOptionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().min(1).max(QUESTION_POLICY.maxOptionLabelLength),
});

export const rsvpQuestionInputSchema = z
  .object({
    id: z.uuid().optional(),
    scope: z.enum(["guest", "invitation"]),
    type: z.enum(["text", "single", "multi", "number"]),
    label: z.string().trim().min(1).max(QUESTION_POLICY.maxLabelLength),
    help: z
      .string()
      .trim()
      .max(QUESTION_POLICY.maxHelpLength)
      .nullable()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    required: z.boolean().default(false),
    allowOther: z.boolean().default(false),
    options: z
      .array(questionOptionSchema)
      .max(QUESTION_POLICY.maxOptions)
      .default([]),
    variantIds: z.array(z.string().min(1).max(64)).max(50).default([]),
    presetKey: z
      .enum(["diet", "allergies", "lodging", "parking"])
      .nullable()
      .optional(),
  })
  .superRefine((q, ctx) => {
    if (q.type === "text" || q.type === "number") {
      if (q.options.length > 0 || q.allowOther) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pytanie otwarte lub liczbowe nie może mieć opcji wyboru.",
        });
      }
    } else {
      if (q.options.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pytanie wyboru musi mieć co najmniej jedną opcję.",
        });
      }
      const seen = new Set<string>();
      for (const opt of q.options) {
        if (seen.has(opt.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Identyfikatory opcji muszą być unikalne.",
          });
          break;
        }
        seen.add(opt.id);
      }
    }
  });

export const rsvpQuestionsListSchema = z
  .array(rsvpQuestionInputSchema)
  .max(QUESTION_POLICY.maxQuestions);

export const questionValueSchema: z.ZodType<QuestionValue> = z.union([
  z
    .object({
      text: z.string().trim().min(1).max(QUESTION_POLICY.maxTextAnswerLength),
    })
    .strict(),
  z
    .object({
      number: z
        .number()
        .int()
        .min(QUESTION_POLICY.minNumber)
        .max(QUESTION_POLICY.maxNumber),
    })
    .strict(),
  z
    .object({
      optionIds: z
        .array(z.string().min(1).max(64))
        .max(QUESTION_POLICY.maxOptions),
      other: z
        .string()
        .trim()
        .min(1)
        .max(QUESTION_POLICY.maxOtherLength)
        .optional(),
    })
    .strict(),
]);

export const questionAnswerInputSchema = z.object({
  questionId: z.uuid(),
  guestId: z.uuid().nullable().optional(),
  value: questionValueSchema.nullable(),
});

export type QuestionAnswerInput = z.infer<typeof questionAnswerInputSchema>;

export function questionPresets(
  locale: string,
): Record<PresetKey, Omit<RsvpQuestion, "id">> {
  const lang = locale.startsWith("pl")
    ? "pl"
    : locale.startsWith("de")
      ? "de"
      : "en";

  if (lang === "pl") {
    return {
      diet: {
        scope: "guest",
        type: "single",
        label: "Dieta",
        help: null,
        required: false,
        allowOther: true,
        options: [
          { id: "standard", label: "Bez ograniczeń" },
          { id: "vegetarian", label: "Wegetariańska" },
          { id: "vegan", label: "Wegańska" },
          { id: "gluten_free", label: "Bezglutenowa" },
        ],
        variantIds: [],
        presetKey: "diet",
      },
      allergies: {
        scope: "guest",
        type: "text",
        label: "Alergie pokarmowe",
        help: "Np. orzechy, laktoza, owoce morza",
        required: false,
        allowOther: false,
        options: [],
        variantIds: [],
        presetKey: "allergies",
      },
      lodging: {
        scope: "invitation",
        type: "single",
        label: "Czy potrzebujecie noclegu?",
        help: null,
        required: false,
        allowOther: false,
        options: [
          { id: "yes", label: "Tak" },
          { id: "no", label: "Nie" },
        ],
        variantIds: [],
        presetKey: "lodging",
      },
      parking: {
        scope: "invitation",
        type: "single",
        label:
          "Czy przyjedziecie samochodem i potrzebujecie miejsca parkingowego?",
        help: null,
        required: false,
        allowOther: false,
        options: [
          { id: "yes", label: "Tak" },
          { id: "no", label: "Nie" },
        ],
        variantIds: [],
        presetKey: "parking",
      },
    };
  }

  if (lang === "de") {
    return {
      diet: {
        scope: "guest",
        type: "single",
        label: "Ernährung",
        help: null,
        required: false,
        allowOther: true,
        options: [
          { id: "standard", label: "Keine Einschränkungen" },
          { id: "vegetarian", label: "Vegetarisch" },
          { id: "vegan", label: "Vegan" },
          { id: "gluten_free", label: "Glutenfrei" },
        ],
        variantIds: [],
        presetKey: "diet",
      },
      allergies: {
        scope: "guest",
        type: "text",
        label: "Lebensmittelallergien",
        help: "Z. B. Nüsse, Laktose, Meeresfrüchte",
        required: false,
        allowOther: false,
        options: [],
        variantIds: [],
        presetKey: "allergies",
      },
      lodging: {
        scope: "invitation",
        type: "single",
        label: "Benötigt ihr eine Übernachtung?",
        help: null,
        required: false,
        allowOther: false,
        options: [
          { id: "yes", label: "Ja" },
          { id: "no", label: "Nein" },
        ],
        variantIds: [],
        presetKey: "lodging",
      },
      parking: {
        scope: "invitation",
        type: "single",
        label: "Kommt ihr mit dem Auto und braucht einen Parkplatz?",
        help: null,
        required: false,
        allowOther: false,
        options: [
          { id: "yes", label: "Ja" },
          { id: "no", label: "Nein" },
        ],
        variantIds: [],
        presetKey: "parking",
      },
    };
  }

  return {
    diet: {
      scope: "guest",
      type: "single",
      label: "Diet",
      help: null,
      required: false,
      allowOther: true,
      options: [
        { id: "standard", label: "No restrictions" },
        { id: "vegetarian", label: "Vegetarian" },
        { id: "vegan", label: "Vegan" },
        { id: "gluten_free", label: "Gluten-free" },
      ],
      variantIds: [],
      presetKey: "diet",
    },
    allergies: {
      scope: "guest",
      type: "text",
      label: "Food allergies",
      help: "E.g. nuts, lactose, shellfish",
      required: false,
      allowOther: false,
      options: [],
      variantIds: [],
      presetKey: "allergies",
    },
    lodging: {
      scope: "invitation",
      type: "single",
      label: "Do you need accommodation?",
      help: null,
      required: false,
      allowOther: false,
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      variantIds: [],
      presetKey: "lodging",
    },
    parking: {
      scope: "invitation",
      type: "single",
      label: "Are you arriving by car and need a parking spot?",
      help: null,
      required: false,
      allowOther: false,
      options: [
        { id: "yes", label: "Yes" },
        { id: "no", label: "No" },
      ],
      variantIds: [],
      presetKey: "parking",
    },
  };
}

export function visibleQuestions(
  questions: RsvpQuestion[],
  ctx: { variantId: string; attendingGuestIds: Set<string> },
): {
  invitation: RsvpQuestion[];
  byGuest: Map<string, RsvpQuestion[]>;
} {
  const forVariant = questions.filter(
    (q) => q.variantIds.length === 0 || q.variantIds.includes(ctx.variantId),
  );
  const hasAnyAttending = ctx.attendingGuestIds.size > 0;
  const invitation = hasAnyAttending
    ? forVariant.filter((q) => q.scope === "invitation")
    : [];
  const guestQs = forVariant.filter((q) => q.scope === "guest");
  const byGuest = new Map<string, RsvpQuestion[]>();
  for (const gid of ctx.attendingGuestIds) {
    byGuest.set(gid, guestQs);
  }
  return { invitation, byGuest };
}

export interface QuestionFieldError {
  questionId: string;
  guestId?: string;
  reason: "required" | "invalid";
}

function isAnswerValid(q: RsvpQuestion, value: QuestionValue): boolean {
  if (q.type === "text") {
    return (
      "text" in value &&
      typeof value.text === "string" &&
      value.text.trim().length >= 1 &&
      value.text.trim().length <= QUESTION_POLICY.maxTextAnswerLength
    );
  }
  if (q.type === "number") {
    return (
      "number" in value &&
      typeof value.number === "number" &&
      Number.isInteger(value.number) &&
      value.number >= QUESTION_POLICY.minNumber &&
      value.number <= QUESTION_POLICY.maxNumber
    );
  }
  if (!("optionIds" in value) || !Array.isArray(value.optionIds)) {
    return false;
  }
  const validIds = new Set(q.options.map((o) => o.id));
  const seen = new Set<string>();
  for (const id of value.optionIds) {
    if (!validIds.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  const hasOther =
    typeof value.other === "string" && value.other.trim().length > 0;
  if (
    hasOther &&
    (!q.allowOther ||
      value.other!.trim().length > QUESTION_POLICY.maxOtherLength)
  ) {
    return false;
  }
  if (q.type === "single") {
    return (seen.size === 1 && !hasOther) || (seen.size === 0 && hasOther);
  }
  return seen.size > 0 || hasOther;
}

export function questionFieldKey(
  questionId: string,
  guestId?: string | null,
): string {
  return `${questionId}:${guestId ?? ""}`;
}

export function questionRecordKey(
  questionId: string,
  invitationId: string,
  guestId?: string | null,
): string {
  return `${questionId}:${invitationId}:${guestId ?? ""}`;
}

export function indexQuestionAnswers(
  records: QuestionAnswerRecord[],
): Map<string, QuestionValue> {
  const map = new Map<string, QuestionValue>();
  for (const qa of records) {
    map.set(
      questionRecordKey(qa.questionId, qa.invitationId, qa.guestId),
      qa.value,
    );
  }
  return map;
}

export function collectVisibleQuestionAnswers(
  visible: { invitation: RsvpQuestion[]; byGuest: Map<string, RsvpQuestion[]> },
  valuesMap: Record<string, QuestionValue>,
): QuestionAnswerInput[] {
  const result: QuestionAnswerInput[] = [];
  for (const q of visible.invitation) {
    result.push({
      questionId: q.id,
      guestId: null,
      value: valuesMap[questionFieldKey(q.id, null)] ?? null,
    });
  }
  for (const [gid, qs] of visible.byGuest.entries()) {
    for (const q of qs) {
      result.push({
        questionId: q.id,
        guestId: gid,
        value: valuesMap[questionFieldKey(q.id, gid)] ?? null,
      });
    }
  }
  return result;
}

export function validateQuestionAnswers(
  questions: RsvpQuestion[],
  answers: QuestionAnswerInput[],
  ctx: {
    variantId: string;
    attendingGuestIds: Set<string>;
    enforceRequired?: boolean;
  },
): QuestionFieldError[] {
  const { invitation, byGuest } = visibleQuestions(questions, ctx);
  const enforceRequired = ctx.enforceRequired ?? true;
  const answerMap = new Map<string, QuestionValue>();
  const errors: QuestionFieldError[] = [];

  for (const a of answers) {
    if (a.value === null) continue;
    const key = `${a.questionId}:${a.guestId ?? ""}`;
    answerMap.set(key, a.value);
  }

  for (const q of invitation) {
    const val = answerMap.get(`${q.id}:`);
    if (!val) {
      if (enforceRequired && q.required) {
        errors.push({ questionId: q.id, reason: "required" });
      }
    } else if (!isAnswerValid(q, val)) {
      errors.push({ questionId: q.id, reason: "invalid" });
    }
  }

  for (const [gid, qs] of byGuest.entries()) {
    for (const q of qs) {
      const val = answerMap.get(`${q.id}:${gid}`);
      if (!val) {
        if (enforceRequired && q.required) {
          errors.push({ questionId: q.id, guestId: gid, reason: "required" });
        }
      } else if (!isAnswerValid(q, val)) {
        errors.push({ questionId: q.id, guestId: gid, reason: "invalid" });
      }
    }
  }

  return errors;
}

export type QuestionSummary =
  | {
      question: RsvpQuestion;
      type: "choice";
      counts: Record<string, number>;
      otherCount: number;
      otherTexts: {
        invitationId: string;
        guestId: string | null;
        text: string;
      }[];
      answeredCount: number;
      missingCount: number;
    }
  | {
      question: RsvpQuestion;
      type: "number";
      sum: number;
      answeredCount: number;
      missingCount: number;
    }
  | {
      question: RsvpQuestion;
      type: "text";
      responses: {
        invitationId: string;
        guestId: string | null;
        text: string;
      }[];
      answeredCount: number;
      missingCount: number;
    };

export function summarizeQuestions(
  questions: RsvpQuestion[],
  answers: QuestionAnswerRecord[],
  invitations: { id: string; variantId: string; attendingGuestIds: string[] }[],
): QuestionSummary[] {
  return questions.map((q) => {
    const relevantInvitations = invitations.filter(
      (inv) =>
        (q.variantIds.length === 0 || q.variantIds.includes(inv.variantId)) &&
        inv.attendingGuestIds.length > 0,
    );

    const expectedKeys = new Set<string>();
    for (const inv of relevantInvitations) {
      if (q.scope === "invitation") {
        expectedKeys.add(`${inv.id}:`);
      } else {
        for (const gid of inv.attendingGuestIds) {
          expectedKeys.add(`${inv.id}:${gid}`);
        }
      }
    }

    const relevantAnswers = answers.filter(
      (a) =>
        a.questionId === q.id &&
        expectedKeys.has(`${a.invitationId}:${a.guestId ?? ""}`),
    );

    const missingCount = Math.max(
      0,
      expectedKeys.size - relevantAnswers.length,
    );

    if (q.type === "text") {
      const responses = relevantAnswers
        .filter(
          (a): a is QuestionAnswerRecord & { value: { text: string } } =>
            "text" in a.value,
        )
        .map((a) => ({
          invitationId: a.invitationId,
          guestId: a.guestId,
          text: a.value.text,
        }));
      return {
        question: q,
        type: "text",
        responses,
        answeredCount: responses.length,
        missingCount,
      };
    }

    if (q.type === "number") {
      let sum = 0;
      let answeredCount = 0;
      for (const a of relevantAnswers) {
        if ("number" in a.value) {
          sum += a.value.number;
          answeredCount++;
        }
      }
      return {
        question: q,
        type: "number",
        sum,
        answeredCount,
        missingCount,
      };
    }

    const counts: Record<string, number> = {};
    for (const opt of q.options) {
      counts[opt.id] = 0;
    }
    let otherCount = 0;
    const otherTexts: {
      invitationId: string;
      guestId: string | null;
      text: string;
    }[] = [];

    for (const a of relevantAnswers) {
      if (!("optionIds" in a.value)) continue;
      for (const id of a.value.optionIds) {
        if (id in counts) counts[id] = (counts[id] ?? 0) + 1;
      }
      if (a.value.other?.trim()) {
        otherCount++;
        otherTexts.push({
          invitationId: a.invitationId,
          guestId: a.guestId,
          text: a.value.other.trim(),
        });
      }
    }

    return {
      question: q,
      type: "choice",
      counts,
      otherCount,
      otherTexts,
      answeredCount: relevantAnswers.length,
      missingCount,
    };
  });
}

export function formatQuestionValue(
  question: RsvpQuestion,
  value: QuestionValue | undefined,
  otherLabel = "Inne",
): string {
  if (!value) return "";
  if ("text" in value) return value.text;
  if ("number" in value) return String(value.number);
  const labels = value.optionIds
    .map((id) => question.options.find((o) => o.id === id)?.label)
    .filter((l): l is string => Boolean(l));
  if (value.other?.trim()) {
    labels.push(`${otherLabel}: ${value.other.trim()}`);
  }
  return labels.join(", ");
}
