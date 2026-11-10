import "server-only";
import { guestContent } from "@invitations/domain/guest";
import { publicSiteUrl, siteConfigSchema } from "@invitations/domain";
import { checkDb, required, serviceDb, HttpError } from "./server";
export async function reminderPreview(site: {
  id: string;
  access_mode: string;
  published_release_id: string | null;
  rsvp_deadline: string | null;
}) {
  if (site.access_mode !== "email" || !site.published_release_id)
    throw new HttpError(
      409,
      "Przypomnienia wymagają opublikowanego zaproszenia z dostępem e-mail.",
    );
  if (site.rsvp_deadline && Date.parse(site.rsvp_deadline) <= Date.now())
    throw new HttpError(409, "Termin odpowiedzi minął.");
  const db = serviceDb();
  const { data: release, error } = await db
    .from("releases")
    .select("config")
    .eq("site_id", site.id)
    .eq("id", site.published_release_id)
    .single();
  checkDb(error);
  if (!release) throw new HttpError(404, "Strona jest niedostępna.");
  const config = siteConfigSchema.parse(release.config);
  const invitations: {
    id: string;
    label: string;
    version: number;
    rsvp_revision: number;
    variant_id: string;
    guests: { id: string; name: string }[];
    emails: string[];
  }[] = [];
  const answers: {
    invitation_id: string;
    guest_id: string;
    event_id: string;
  }[] = [];
  for (let from = 0; ; from += 500) {
    const result = await db
      .from("invitations")
      .select("id,label,version,rsvp_revision,variant_id,guests,emails")
      .eq("site_id", site.id)
      .eq("revoked", false)
      .order("id")
      .range(from, from + 499);
    checkDb(result.error);
    invitations.push(...(result.data || []));
    if ((result.data?.length || 0) < 500) break;
  }
  for (let from = 0; ; from += 500) {
    const result = await db
      .from("rsvp_answers")
      .select("invitation_id,guest_id,event_id")
      .eq("site_id", site.id)
      .order("invitation_id")
      .order("guest_id")
      .order("event_id")
      .range(from, from + 499);
    checkDb(result.error);
    answers.push(...(result.data || []));
    if ((result.data?.length || 0) < 500) break;
  }
  const known = new Set(
    answers.map((a) => `${a.invitation_id}:${a.guest_id}:${a.event_id}`),
  );
  const locale = config.locale;
  const url = publicSiteUrl(site.id, required("SITE_URL"));
  const date = site.rsvp_deadline
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Warsaw",
      }).format(new Date(site.rsvp_deadline))
    : "";
  const recipients = invitations
    .filter((i) => {
      if (!config.variants.some((v) => v.id === i.variant_id)) return false;
      const events = guestContent(config, i.variant_id).events;
      return i.guests.some((g) =>
        events.some((e) => !known.has(`${i.id}:${g.id}:${e.id}`)),
      );
    })
    .flatMap((i) =>
      i.emails.map((email) => ({
        id: i.id,
        label: i.label,
        email,
        version: i.version,
        revision: i.rsvp_revision,
        subject:
          locale === "pl-PL"
            ? `Potwierdź obecność — ${config.identity.displayName}`
            : locale === "de-DE"
              ? `Bitte um Rückmeldung — ${config.identity.displayName}`
              : `Please RSVP — ${config.identity.displayName}`,
        text:
          locale === "pl-PL"
            ? `Dzień dobry, ${i.label}!\n\nPrzypominamy o potwierdzeniu obecności na wydarzeniu ${config.identity.displayName}.${date ? ` Prosimy o odpowiedź do ${date} (czas w Polsce).` : ""}\n\nOtwórz zaproszenie i zaloguj się tym adresem e-mail:\n${url}\n\nDziękujemy!`
            : locale === "de-DE"
              ? `Hallo ${i.label}!\n\nBitte bestätigen Sie Ihre Teilnahme: ${config.identity.displayName}.${date ? ` Rückmeldung bis ${date} (polnische Zeit).` : ""}\n\nEinladung öffnen und mit dieser E-Mail-Adresse anmelden:\n${url}\n\nVielen Dank!`
              : `Hello ${i.label}!\n\nPlease confirm attendance for ${config.identity.displayName}.${date ? ` Reply by ${date} (Poland time).` : ""}\n\nOpen the invitation and sign in with this email address:\n${url}\n\nThank you!`,
      })),
    );
  return {
    recipients,
    releaseId: site.published_release_id,
    configured: !!process.env.RESEND_API_KEY && !!process.env.REMINDER_FROM,
  };
}
