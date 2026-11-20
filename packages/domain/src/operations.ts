import type { SiteConfig } from "./index";
import {
  INVITATION_POLICY,
  buildGuestList,
  invitationInputSchema,
  type ImportedInvitation,
} from "./invitation";

export { invitationInputSchema, type ImportedInvitation };

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
  const groupCol = col(["grupa", "group", "rodzina", "label"]),
    namesCol = col(["osoby", "goscie", "goście", "names", "guests"]),
    companionsCol = col([
      "towarzyszace",
      "towarzyszące",
      "companions",
      "companion",
    ]);
  if (namesCol < 0)
    throw new Error(
      "CSV wymaga kolumny: osoby (opcjonalnie: grupa, towarzyszace). Osoby oddziel znakiem |.",
    );
  if (!rows.length || rows.length > 200)
    throw new Error("Import wymaga od 1 do 200 zaproszeń.");
  return rows.map((r, i) => {
    const namedList = (r[namesCol] || "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);
    const rawComp = companionsCol >= 0 ? (r[companionsCol] || "").trim() : "";
    let compCount = 0;
    if (rawComp) {
      if (!/^\d+$/.test(rawComp)) {
        throw new Error(
          `Wiersz ${i + 2}: Nieprawidłowa liczba osób towarzyszących.`,
        );
      }
      compCount = Number.parseInt(rawComp, 10);
      if (compCount < 0 || compCount > INVITATION_POLICY.maxCompanions) {
        throw new Error(
          `Wiersz ${i + 2}: Liczba osób towarzyszących musi wynosić od 0 do ${INVITATION_POLICY.maxCompanions}.`,
        );
      }
    }
    const guests = buildGuestList(namedList, compCount);
    const parsed = invitationInputSchema.safeParse({
      groupName: groupCol >= 0 ? r[groupCol] || null : null,
      variantId,
      guests,
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

export type CalendarLinks = {
  google: string;
  outlook: string;
};

function addHours(dateStr: string, timeStr: string, hours: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d, hh + hours, mm));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`,
    time: `${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}`,
  };
}

function timeZoneOffsetMs(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(utcMs));
  const part = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
  );
  return asUtc - utcMs;
}

function localToUtcIso(dateStr: string, timeStr: string, timeZone: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const wallUtc = Date.UTC(y, m - 1, d, hh, mm);
  const firstOffset = timeZoneOffsetMs(wallUtc, timeZone);
  const adjusted = wallUtc - firstOffset;
  const finalOffset = timeZoneOffsetMs(adjusted, timeZone);
  return new Date(wallUtc - finalOffset)
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

function compactDateTime(point: { date: string; time: string }) {
  return `${point.date.replaceAll("-", "")}T${point.time.replace(":", "")}00`;
}

export function calendarLinks(config: SiteConfig): CalendarLinks | null {
  const scheduled = config.events
    .filter((event): event is SiteConfig["events"][number] & { date: string } =>
      Boolean(event.date && event.time),
    )
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  if (!scheduled.length) return null;

  const first = scheduled[0];
  const last = scheduled[scheduled.length - 1];
  const start = { date: first.date, time: first.time };
  const end = addHours(last.date, last.time, 2);

  const venueLabel = (event: SiteConfig["events"][number]) => {
    const venue = config.venues.find((v) => v.id === event.venueId);
    return venue ? [venue.name, venue.address].filter(Boolean).join(", ") : "";
  };

  let title: string;
  let location: string;
  let description: string;

  if (scheduled.length === 1) {
    title = first.title;
    location = venueLabel(first);
    description = config.identity.displayName;
  } else {
    title = config.identity.displayName || config.hero.title || first.title;
    location = scheduled.map(venueLabel).find(Boolean) ?? "";
    const multiDay = scheduled.some((e) => e.date !== first.date);
    description = scheduled
      .map((e) => {
        const loc = venueLabel(e);
        const prefix = multiDay ? `${e.date} ${e.time}` : e.time;
        return `${prefix} — ${e.title}${loc ? ` (${loc})` : ""}`;
      })
      .join("\n");
  }

  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${compactDateTime(start)}/${compactDateTime(end)}`,
    ctz: config.timeZone,
  });
  if (description) googleParams.set("details", description);
  if (location) googleParams.set("location", location);

  const outlookParams = new URLSearchParams({
    rru: "addevent",
    path: "/calendar/action/compose",
    subject: title,
    startdt: localToUtcIso(start.date, start.time, config.timeZone),
    enddt: localToUtcIso(end.date, end.time, config.timeZone),
  });
  if (description) outlookParams.set("body", description);
  if (location) outlookParams.set("location", location);

  return {
    google: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    outlook: `https://outlook.live.com/calendar/0/action/compose?${outlookParams.toString()}`,
  };
}
