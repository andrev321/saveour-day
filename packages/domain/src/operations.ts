import { z } from "zod";
import type { SiteConfig } from "./index";

export const questionSettingsSchema = z
  .object({ diet: z.boolean(), lodging: z.boolean(), transport: z.boolean() })
  .strict();
export type QuestionSettings = z.infer<typeof questionSettingsSchema>;
export const defaultQuestions: QuestionSettings = {
  diet: false,
  lodging: false,
  transport: false,
};
export const guestDetailsSchema = z
  .record(
    z.uuid(),
    z
      .object({
        diet: z.string().trim().max(300).optional(),
        lodging: z.boolean().optional(),
        transport: z.boolean().optional(),
      })
      .strict(),
  )
  .refine((value) => Object.keys(value).length <= 20);
export type GuestDetails = z.infer<typeof guestDetailsSchema>;
export const invitationInputSchema = z.object({
  label: z.string().trim().min(1).max(200),
  variantId: z.string().min(1).max(64),
  emails: z.array(z.email().transform((s) => s.toLowerCase())).max(10),
  names: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
});
export type ImportedInvitation = z.infer<typeof invitationInputSchema>;

/** RFC 4180 quoting, UTF-8 BOM and semicolon-separated spreadsheet exports. */
export function parseGuestCsv(
  source: string,
  variantId: string,
): ImportedInvitation[] {
  if (source.length > 200_000)
    throw new Error("Plik CSV jest za duży (maksymalnie 200 kB).");
  const text = source.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/)[0];
  const delimiter = firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || !field.length) quoted = !quoted;
      else throw new Error("Nieprawidłowy cudzysłów w CSV.");
    } else if (!quoted && (c === delimiter || c === "\n" || c === "\r")) {
      row.push(field);
      field = "";
      if (c !== delimiter) {
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else field += c;
  }
  if (quoted) throw new Error("Niezamknięty cudzysłów w CSV.");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  const headers = rows.shift()?.map((h) => h.trim().toLowerCase()) || [];
  const col = (aliases: string[]) =>
    headers.findIndex((h) => aliases.includes(h));
  const label = col(["rodzina", "label", "family"]),
    names = col(["goscie", "goście", "names", "guests"]),
    emails = col(["email", "emails", "e-mail"]);
  if (label < 0 || names < 0)
    throw new Error(
      "CSV wymaga kolumn: rodzina, goscie, email. Osoby i adresy oddziel znakiem |.",
    );
  if (!rows.length || rows.length > 200)
    throw new Error("Import wymaga od 1 do 200 zaproszeń.");
  return rows.map((r, i) => {
    const parsed = invitationInputSchema.safeParse({
      label: r[label],
      names: (r[names] || "")
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean),
      emails: (r[emails] || "")
        .split("|")
        .map((v) => v.trim())
        .filter(Boolean),
      variantId,
    });
    if (!parsed.success)
      throw new Error(
        `Wiersz ${i + 2}: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`,
      );
    return parsed.data;
  });
}
export function csvFile(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replaceAll('"', '""') + '"';
          })
          .join(";"),
      )
      .join("\r\n")
  );
}
export function calendarFile(config: SiteConfig, now = new Date()) {
  const escape = (value: string) =>
    value
      .replaceAll("\\", "\\\\")
      .replaceAll("\n", "\\n")
      .replaceAll(",", "\\,")
      .replaceAll(";", "\\;")
      .replaceAll("\r", "");
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//saveour.day//Invitations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Warsaw",
    "BEGIN:DAYLIGHT",
    "DTSTART:19810329T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "TZOFFSETFROM:+0100",
    "TZOFFSETTO:+0200",
    "TZNAME:CEST",
    "END:DAYLIGHT",
    "BEGIN:STANDARD",
    "DTSTART:19961027T030000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0100",
    "TZNAME:CET",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const event of config.events) {
    if (!event.date || !event.time) continue;
    const venue = config.venues.find((v) => v.id === event.venueId);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${config.id}-${event.id}@saveour.day`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Warsaw:${event.date.replaceAll("-", "")}T${event.time.replace(":", "")}00`,
      `SUMMARY:${escape(event.title)}`,
      `DESCRIPTION:${escape(config.identity.displayName)}`,
    );
    if (venue)
      lines.push(
        `LOCATION:${escape([venue.name, venue.address].filter(Boolean).join(", "))}`,
      );
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  // Fold by UTF-8 byte length, never split a multi-byte character.
  return (
    lines
      .map((line) => {
        let out = "",
          part = "",
          bytes = 0;
        for (const char of line) {
          const size = new TextEncoder().encode(char).length;
          if (bytes + size > 73) {
            out += part + "\r\n ";
            part = "";
            bytes = 1;
          }
          part += char;
          bytes += size;
        }
        return out + part;
      })
      .join("\r\n") + "\r\n"
  );
}
