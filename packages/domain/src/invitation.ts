import { z } from "zod";

export const INVITATION_POLICY = {
  maxGuests: 20,
  maxCompanions: 19,
  maxNameLength: 200,
} as const;

export const OVERALL_EVENT_ID = "__overall__" as const;

export const rsvpAttendanceModeSchema = z.enum(["overall", "events"]);
export type RsvpAttendanceMode = z.infer<typeof rsvpAttendanceModeSchema>;

const rsvpEventIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Nieprawidłowy identyfikator wydarzenia");

export const rsvpAttendanceConfigSchema = z
  .object({
    mode: rsvpAttendanceModeSchema,
    eventIds: z
      .array(rsvpEventIdSchema)
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Powtórzone wydarzenie.",
      }),
  })
  .refine((cfg) => cfg.mode === "overall" || cfg.eventIds.length > 0, {
    message: "Wybierz co najmniej jeden punkt z programu.",
    path: ["eventIds"],
  });

export type RsvpAttendanceConfig = z.infer<typeof rsvpAttendanceConfigSchema>;

export interface RsvpEventTarget {
  id: string;
  title: string;
}

export function overallEventLabel(locale: string): string {
  if (locale.startsWith("en")) return "Whole event";
  if (locale.startsWith("de")) return "Gesamte Veranstaltung";
  return "Całe wydarzenie";
}

export function resolveRsvpEvents(
  variantEvents: RsvpEventTarget[],
  config: RsvpAttendanceConfig,
  overallLabel = "Całe wydarzenie",
): RsvpEventTarget[] {
  if (config.mode === "overall") {
    return [{ id: OVERALL_EVENT_ID, title: overallLabel }];
  }
  const selected = new Set(config.eventIds);
  const matched = variantEvents.filter((e) => selected.has(e.id));
  if (matched.length === 0) {
    return [{ id: OVERALL_EVENT_ID, title: overallLabel }];
  }
  return matched;
}

export type GuestKind = "named" | "companion";

export interface InvitationGuest {
  id: string;
  kind: GuestKind;
  name: string | null;
}

export const invitationGuestInputSchema = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum(["named", "companion"]),
    name: z
      .string()
      .trim()
      .max(INVITATION_POLICY.maxNameLength)
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .refine(
    (g) => g.kind === "companion" || (g.name !== null && g.name.length >= 1),
    {
      message: "Osoba imienna musi mieć imię i nazwisko.",
    },
  );

export type InvitationGuestInput = z.infer<typeof invitationGuestInputSchema>;

export const invitationGuestsSchema = z
  .array(invitationGuestInputSchema)
  .min(1)
  .max(INVITATION_POLICY.maxGuests)
  .refine((gs) => gs.some((g) => g.kind === "named"), {
    message: "Zaproszenie musi zawierać co najmniej jedną osobę imienną.",
  });

export const invitationInputSchema = z.object({
  groupName: z
    .string()
    .trim()
    .max(INVITATION_POLICY.maxNameLength)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  variantId: z.string().min(1).max(64),
  guests: invitationGuestsSchema,
});

export type ImportedInvitation = z.infer<typeof invitationInputSchema>;

export function buildGuestList(
  namedNames: string[],
  companionCount: number,
): InvitationGuestInput[] {
  return [
    ...namedNames.map((name) => ({ kind: "named" as const, name })),
    ...Array.from({ length: companionCount }, () => ({
      kind: "companion" as const,
      name: null,
    })),
  ];
}

export interface InvitationDisplayCopy {
  companion: string;
  and: string;
}

const DEFAULT_DISPLAY_COPY: InvitationDisplayCopy = {
  companion: "Osoba towarzysząca",
  and: "i",
};

export function guestDisplayName(
  guest: Pick<InvitationGuest, "kind" | "name">,
  copy: Pick<InvitationDisplayCopy, "companion"> = DEFAULT_DISPLAY_COPY,
): string {
  const trimmed = guest.name?.trim();
  if (trimmed) return trimmed;
  return copy.companion;
}

export function invitationDisplayName(
  inv: {
    groupName?: string | null;
    group_name?: string | null;
    guests: Pick<InvitationGuest, "kind" | "name">[];
  },
  copy: InvitationDisplayCopy = DEFAULT_DISPLAY_COPY,
): string {
  const explicit = (inv.groupName ?? inv.group_name)?.trim();
  if (explicit) return explicit;

  const named = inv.guests
    .filter((g) => g.kind === "named" && g.name?.trim())
    .map((g) => g.name!.trim());
  const companionCount = inv.guests.filter(
    (g) => g.kind === "companion",
  ).length;

  if (named.length === 0) {
    return companionCount > 0 ? `${copy.companion} (${companionCount})` : "";
  }
  if (named.length === 1) {
    return companionCount > 0 ? `${named[0]} + ${companionCount}` : named[0]!;
  }
  if (named.length === 2 && companionCount === 0) {
    return `${named[0]} ${copy.and} ${named[1]}`;
  }
  const rest = named.length - 2 + companionCount;
  if (rest > 0) {
    return `${named[0]}, ${named[1]} (+${rest})`;
  }
  return named.join(", ");
}

export type PersonStatus = "attending" | "declined" | "partial" | "pending";
export type InvitationStatus = "answered" | "partial" | "pending";

export interface SummarizeInvitationInput {
  id: string;
  guests: { id: string; kind: GuestKind }[];
  events: { id: string }[];
}

export interface SummarizeAttendanceInput {
  invitation_id: string;
  guest_id: string;
  event_id: string;
  attending: boolean;
}

export interface RsvpSummary {
  totals: {
    invited: number;
    attending: number;
    declined: number;
    pending: number;
    companionsInvited: number;
    companionsAttending: number;
    companionsDeclined: number;
    companionsPending: number;
  };
  byEvent: Record<
    string,
    {
      attending: number;
      declined: number;
      pending: number;
      companionsAttending: number;
    }
  >;
  byGuest: Map<string, PersonStatus>;
  byInvitation: Map<string, InvitationStatus>;
}

export function attendanceKey(guestId: string, eventId: string): string {
  return `${guestId}:${eventId}`;
}

export function isEventCompanionAllowed(
  guests: Pick<InvitationGuest, "id" | "kind">[],
  attendances: Record<string, string>,
  eventId: string,
): boolean {
  return guests.some(
    (g) =>
      g.kind === "named" &&
      attendances[attendanceKey(g.id, eventId)] === "true",
  );
}

export function applyNamedDeclineCascade(
  guests: Pick<InvitationGuest, "id" | "kind">[],
  attendances: Record<string, string>,
  changedGuestId: string,
  eventId: string,
  val: "true" | "false",
): Record<string, string> {
  const next = {
    ...attendances,
    [attendanceKey(changedGuestId, eventId)]: val,
  };
  const target = guests.find((g) => g.id === changedGuestId);
  if (
    target?.kind === "named" &&
    val === "false" &&
    !isEventCompanionAllowed(guests, next, eventId)
  ) {
    for (const g of guests) {
      if (g.kind === "companion") {
        next[attendanceKey(g.id, eventId)] = "false";
      }
    }
  }
  return next;
}

export function summarizeRsvp(
  invitations: SummarizeInvitationInput[],
  attendances: SummarizeAttendanceInput[],
): RsvpSummary {
  const attendanceMap = new Map<string, boolean>();
  for (const a of attendances) {
    attendanceMap.set(attendanceKey(a.guest_id, a.event_id), a.attending);
  }

  const byGuest = new Map<string, PersonStatus>();
  const byInvitation = new Map<string, InvitationStatus>();
  const byEvent: RsvpSummary["byEvent"] = {};

  const totals = {
    invited: 0,
    attending: 0,
    declined: 0,
    pending: 0,
    companionsInvited: 0,
    companionsAttending: 0,
    companionsDeclined: 0,
    companionsPending: 0,
  };

  for (const inv of invitations) {
    let invAnswered = 0;
    let invExpected = 0;

    for (const g of inv.guests) {
      const isComp = g.kind === "companion";
      totals.invited++;
      if (isComp) totals.companionsInvited++;

      let yes = 0;
      let no = 0;
      let missing = 0;

      for (const ev of inv.events) {
        invExpected++;
        if (!byEvent[ev.id]) {
          byEvent[ev.id] = {
            attending: 0,
            declined: 0,
            pending: 0,
            companionsAttending: 0,
          };
        }
        const ans = attendanceMap.get(attendanceKey(g.id, ev.id));
        if (ans === true) {
          yes++;
          invAnswered++;
          byEvent[ev.id]!.attending++;
          if (isComp) byEvent[ev.id]!.companionsAttending++;
        } else if (ans === false) {
          no++;
          invAnswered++;
          byEvent[ev.id]!.declined++;
        } else {
          missing++;
          byEvent[ev.id]!.pending++;
        }
      }

      let status: PersonStatus;
      if (inv.events.length === 0 || missing === inv.events.length) {
        status = "pending";
        totals.pending++;
        if (isComp) totals.companionsPending++;
      } else if (yes > 0 && no === 0 && missing === 0) {
        status = "attending";
        totals.attending++;
        if (isComp) totals.companionsAttending++;
      } else if (no > 0 && yes === 0 && missing === 0) {
        status = "declined";
        totals.declined++;
        if (isComp) totals.companionsDeclined++;
      } else if (yes > 0) {
        status = "partial";
        totals.attending++;
        if (isComp) totals.companionsAttending++;
      } else {
        status = "pending";
        totals.pending++;
        if (isComp) totals.companionsPending++;
      }

      byGuest.set(g.id, status);
    }

    if (invExpected === 0 || invAnswered === 0) {
      byInvitation.set(inv.id, "pending");
    } else if (invAnswered === invExpected) {
      byInvitation.set(inv.id, "answered");
    } else {
      byInvitation.set(inv.id, "partial");
    }
  }

  return { totals, byEvent, byGuest, byInvitation };
}

export interface QuickAddError {
  line: number;
  text: string;
  message: string;
}

export type QuickAddResult =
  | { ok: true; items: ImportedInvitation[] }
  | { ok: false; errors: QuickAddError[] };

/**
 * Parses lines like:
 *   Anna Kowalska +1
 *   Rodzina Nowaków: Jan Nowak, Ewa Nowak +2
 *   Piotr Wiśniewski
 */
export function parseQuickAdd(text: string, variantId: string): QuickAddResult {
  const lines = text.split(/\r?\n/);
  const items: ImportedInvitation[] = [];
  const errors: QuickAddError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.trim();
    if (!raw) continue;

    let groupName: string | null = null;
    let body = raw;

    const colonIdx = raw.indexOf(":");
    if (colonIdx !== -1) {
      groupName = raw.slice(0, colonIdx).trim();
      body = raw.slice(colonIdx + 1).trim();
      if (!groupName) {
        errors.push({
          line: i + 1,
          text: raw,
          message: "Brak nazwy grupy przed dwukropkiem.",
        });
        continue;
      }
      if (groupName.length > INVITATION_POLICY.maxNameLength) {
        errors.push({
          line: i + 1,
          text: raw,
          message: `Nazwa grupy jest za długa (maksymalnie ${INVITATION_POLICY.maxNameLength} znaków).`,
        });
        continue;
      }
    }

    let companionCount = 0;
    const plusMatch = /\+(\d+)$/.exec(body);
    if (plusMatch) {
      companionCount = Number.parseInt(plusMatch[1]!, 10);
      body = body.slice(0, plusMatch.index).trim();
      if (
        !Number.isFinite(companionCount) ||
        companionCount < 0 ||
        companionCount > INVITATION_POLICY.maxCompanions
      ) {
        errors.push({
          line: i + 1,
          text: raw,
          message: "Nieprawidłowa liczba osób towarzyszących (+N).",
        });
        continue;
      }
    }

    const namedList = body
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (namedList.length === 0) {
      errors.push({
        line: i + 1,
        text: raw,
        message: "Podaj co najmniej jedną osobę imienną.",
      });
      continue;
    }

    if (namedList.length + companionCount > INVITATION_POLICY.maxGuests) {
      errors.push({
        line: i + 1,
        text: raw,
        message: `Maksymalnie ${INVITATION_POLICY.maxGuests} osób w jednym zaproszeniu.`,
      });
      continue;
    }

    const guests = buildGuestList(namedList, companionCount);

    const parsed = invitationInputSchema.safeParse({
      groupName,
      variantId,
      guests,
    });
    if (!parsed.success) {
      errors.push({
        line: i + 1,
        text: raw,
        message: parsed.error.issues[0]?.message ?? "Nieprawidłowy wiersz.",
      });
      continue;
    }
    items.push(parsed.data);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, items };
}
