export const EMAIL_BATCH_LIMIT = 50;

export type EmailLocale = "pl-PL" | "en-US" | "de-DE";

export interface EmailMessage {
  subject: string;
  text: string;
}

export interface InvitationEmailInput {
  locale?: string | null;
  displayName: string;
  label: string;
  url: string;
  deadline?: string | null;
}

export interface OtpEmailInput {
  locale?: string | null;
  displayName: string;
  code: string;
}

function resolveEmailLocale(locale?: string | null): EmailLocale {
  if (locale === "pl-PL" || locale === "de-DE" || locale === "en-US") {
    return locale;
  }
  return "en-US";
}

function cleanOptional(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildInvitationEmail({
  locale,
  displayName,
  label,
  url,
  deadline,
}: InvitationEmailInput): EmailMessage {
  const lang = resolveEmailLocale(locale);
  const due = cleanOptional(deadline);

  switch (lang) {
    case "pl-PL":
      return {
        subject: `Zaproszenie: ${displayName}`,
        text: [
          `Cześć (${label}),`,
          "",
          `${displayName} zaprasza do obejrzenia zaproszenia i potwierdzenia obecności:`,
          url,
          ...(due ? ["", `Prosimy o odpowiedź do: ${due}.`] : []),
          "",
          "Do zobaczenia!",
        ].join("\n"),
      };
    case "de-DE":
      return {
        subject: `Einladung: ${displayName}`,
        text: [
          `Hallo (${label}),`,
          "",
          `${displayName} lädt euch ein, die Einladung anzusehen und eure Teilnahme zu bestätigen:`,
          url,
          ...(due ? ["", `Bitte antwortet bis zum: ${due}.`] : []),
          "",
          "Bis bald!",
        ].join("\n"),
      };
    case "en-US":
    default:
      return {
        subject: `Invitation: ${displayName}`,
        text: [
          `Hello (${label}),`,
          "",
          `${displayName} invites you to view your invitation and RSVP:`,
          url,
          ...(due ? ["", `Please respond by: ${due}.`] : []),
          "",
          "We hope to celebrate with you!",
        ].join("\n"),
      };
  }
}

export function buildReminderEmail({
  locale,
  displayName,
  label,
  url,
  deadline,
}: InvitationEmailInput): EmailMessage {
  const lang = resolveEmailLocale(locale);
  const due = cleanOptional(deadline);

  switch (lang) {
    case "pl-PL":
      return {
        subject: `Przypomnienie o odpowiedzi (RSVP): ${displayName}`,
        text: [
          `Cześć (${label}),`,
          "",
          `Przypominamy o potwierdzeniu obecności na wydarzeniu ${displayName}:`,
          url,
          ...(due ? ["", `Termin odpowiedzi: ${due}.`] : []),
          "",
          "Dziękujemy!",
        ].join("\n"),
      };
    case "de-DE":
      return {
        subject: `Erinnerung an eure Rückmeldung (RSVP): ${displayName}`,
        text: [
          `Hallo (${label}),`,
          "",
          `eine kurze Erinnerung zur Rückmeldung für ${displayName}:`,
          url,
          ...(due ? ["", `Antwortfrist: ${due}.`] : []),
          "",
          "Vielen Dank!",
        ].join("\n"),
      };
    case "en-US":
    default:
      return {
        subject: `RSVP Reminder: ${displayName}`,
        text: [
          `Hello (${label}),`,
          "",
          `Just a friendly reminder to submit your RSVP for ${displayName}:`,
          url,
          ...(due ? ["", `Please respond by: ${due}.`] : []),
          "",
          "Thank you!",
        ].join("\n"),
      };
  }
}

export function buildOtpEmail({
  locale,
  displayName,
  code,
}: OtpEmailInput): EmailMessage {
  const lang = resolveEmailLocale(locale);

  switch (lang) {
    case "pl-PL":
      return {
        subject: `Kod dostępu: ${displayName}`,
        text: [
          `Twój jednorazowy kod dostępu do ${displayName}:`,
          "",
          code,
          "",
          "Jeśli to nie Ty prosiłeś o kod, zignoruj tę wiadomość.",
        ].join("\n"),
      };
    case "de-DE":
      return {
        subject: `Zugangscode: ${displayName}`,
        text: [
          `Dein einmaliger Zugangscode für ${displayName}:`,
          "",
          code,
          "",
          "Falls du diesen Code nicht angefordert hast, kannst du diese Nachricht ignorieren.",
        ].join("\n"),
      };
    case "en-US":
    default:
      return {
        subject: `Access code: ${displayName}`,
        text: [
          `Your one-time access code for ${displayName}:`,
          "",
          code,
          "",
          "If you did not request this code, you can safely ignore this email.",
        ].join("\n"),
      };
  }
}
