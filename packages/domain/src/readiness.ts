import type { SiteConfig } from "./index";
export type ReadinessIssue = {
  panel: "content" | "guests";
  section: string | null;
  message: string;
};
export function publicationWarnings(
  config: SiteConfig,
  language: "pl" | "en" | "de" = "pl",
): ReadinessIssue[] {
  const tr = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  const issues: ReadinessIssue[] = [];
  if (!config.events.length || config.events.some((e) => !e.date || !e.time))
    issues.push({
      panel: "content",
      section: config.sections.find((s) => s.type === "timeline")?.id || null,
      message: tr(
        "Sprawdź daty i godziny wydarzeń.",
        "Check event dates and times.",
        "Prüfe Datum und Uhrzeit der Veranstaltungen.",
      ),
    });
  for (const venue of config.venues) {
    if (
      !venue.address.trim() ||
      /przykładow|uzupełnienia|example|beispiel/i.test(
        venue.name + " " + venue.address,
      )
    )
      issues.push({
        panel: "content",
        section:
          config.sections.find(
            (s) => s.type === "venue" && s.venueId === venue.id,
          )?.id || null,
        message: tr(
          `Uzupełnij miejsce: ${venue.name}.`,
          `Complete venue details: ${venue.name}.`,
          `Ergänze den Veranstaltungsort: ${venue.name}.`,
        ),
      });
  }
  if (config.contacts.some((c) => /^\+?\d*0{7,}$/.test(c.phone)))
    issues.push({
      panel: "content",
      section: config.sections.find((s) => s.type === "contact")?.id || null,
      message: tr(
        "Zmień przykładowy numer telefonu.",
        "Replace the example phone number.",
        "Ersetze die Beispiel-Telefonnummer.",
      ),
    });
  for (const variant of config.variants) {
    if (!variant.eventIds.length || !variant.sections.some((s) => s.visible))
      issues.push({
        panel: "content",
        section: null,
        message: tr(
          `Sprawdź treść wariantu: ${variant.label}.`,
          `Review invitation variant: ${variant.label}.`,
          `Prüfe die Einladungsvariante: ${variant.label}.`,
        ),
      });
  }
  return issues;
}
