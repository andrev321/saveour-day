export interface CollisionInvitationInput {
  id: string;
  label: string;
  guests: Array<{ id: string; name: string }>;
}

const DIACRITIC_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
  ä: "a",
  ö: "o",
  ü: "u",
  ß: "s",
};

/** Mirrors PostgreSQL public.normalize_guest_lookup(input) for client/admin collision checks. */
export function normalizeGuestLookup(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[ąćęłńóśźżäöüß]/g, (ch) => DIACRITIC_MAP[ch] ?? ch)
    .replace(/\s+/g, " ");
}

/**
 * Returns a map of invitationId -> colliding guest names for any normalized
 * guest name appearing across two or more invitations on the same site.
 */
export function detectGuestCollisions(
  invitations: CollisionInvitationInput[],
): Map<string, string[]> {
  const byName = new Map<string, Array<{ invitationId: string; rawName: string }>>();

  for (const inv of invitations) {
    const seenInInv = new Set<string>();
    for (const guest of inv.guests) {
      const normalized = normalizeGuestLookup(guest.name);
      if (!normalized || seenInInv.has(normalized)) continue;
      seenInInv.add(normalized);
      const list = byName.get(normalized) ?? [];
      list.push({ invitationId: inv.id, rawName: guest.name.trim() });
      byName.set(normalized, list);
    }
  }

  const collisions = new Map<string, string[]>();
  for (const entries of byName.values()) {
    if (entries.length < 2) continue;
    for (const entry of entries) {
      const current = collisions.get(entry.invitationId) ?? [];
      current.push(entry.rawName);
      collisions.set(entry.invitationId, current);
    }
  }
  return collisions;
}

export interface ShareMessageInput {
  locale: string;
  displayName: string;
  kind: "personal" | "shared_with_code";
  url: string;
  shortCode?: string;
  deadline?: string | null;
}

export function formatShareMessage(input: ShareMessageInput): string {
  const lang = input.locale.startsWith("pl")
    ? "pl"
    : input.locale.startsWith("de")
      ? "de"
      : "en";

  if (lang === "pl") {
    const lines = [
      `Cześć! Przesyłamy zaproszenie na wydarzenie: ${input.displayName}.`,
      input.kind === "shared_with_code" && input.shortCode
        ? `Link do zaproszenia: ${input.url}\nTwój kod zaproszenia do potwierdzenia obecności: ${input.shortCode}`
        : `Twój indywidualny link do zaproszenia i potwierdzenia obecności: ${input.url}`,
    ];
    if (input.deadline) {
      lines.push(`Prosimy o odpowiedź do: ${input.deadline}.`);
    }
    return lines.join("\n\n");
  }

  if (lang === "de") {
    const lines = [
      `Hallo! Hier ist unsere Einladung zu: ${input.displayName}.`,
      input.kind === "shared_with_code" && input.shortCode
        ? `Link zur Einladung: ${input.url}\nDein persönlicher Einladungscode für die Rückmeldung: ${input.shortCode}`
        : `Dein persönlicher Link zur Einladung und Rückmeldung: ${input.url}`,
    ];
    if (input.deadline) {
      lines.push(`Bitte antwortet bis zum: ${input.deadline}.`);
    }
    return lines.join("\n\n");
  }

  const lines = [
    `Hello! Here is your invitation to ${input.displayName}.`,
    input.kind === "shared_with_code" && input.shortCode
      ? `Invitation link: ${input.url}\nYour verification code for RSVP: ${input.shortCode}`
      : `Your personal invitation & RSVP link: ${input.url}`,
  ];
  if (input.deadline) {
    lines.push(`Please respond by: ${input.deadline}.`);
  }
  return lines.join("\n\n");
}

export async function readAllPages<T>(
  readPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  onError?: (error: { message: string }) => void,
  pageSize = 500,
): Promise<T[]> {
  const size = Math.max(1, Math.floor(pageSize));
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + size - 1;
    const { data, error } = await readPage(from, to);
    if (error) {
      onError?.(error);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }
    results.push(...data);
    if (data.length < size) {
      break;
    }
    from += size;
  }

  return results;
}
