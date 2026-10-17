const messages = {
  loading: ["Wczytujemy…", "Loading…", "Wird geladen…"],
  project: [
    "Otwieramy Twoje zaproszenie…",
    "Opening your invitation…",
    "Einladung wird geöffnet…",
  ],
  preview: [
    "Przygotowujemy podgląd…",
    "Preparing preview…",
    "Vorschau wird vorbereitet…",
  ],
  slow: [
    "To trwa trochę dłużej. Dziękujemy za cierpliwość.",
    "This is taking a little longer. Thank you for waiting.",
    "Das dauert etwas länger. Vielen Dank für Ihre Geduld.",
  ],
  retry: ["Spróbuj ponownie", "Try again", "Erneut versuchen"],
  previewError: [
    "Nie udało się przygotować podglądu.",
    "Could not prepare the preview.",
    "Die Vorschau konnte nicht vorbereitet werden.",
  ],
  save: ["Zapisujemy…", "Saving…", "Wird gespeichert…"],
  publish: [
    "Publikujemy zaproszenie…",
    "Publishing invitation…",
    "Einladung wird veröffentlicht…",
  ],
  restore: [
    "Przywracamy wydanie…",
    "Restoring release…",
    "Version wird wiederhergestellt…",
  ],
  template: [
    "Przygotowujemy szkic…",
    "Preparing draft…",
    "Entwurf wird vorbereitet…",
  ],
  upload: ["Dodajemy zdjęcie…", "Adding photo…", "Foto wird hinzugefügt…"],
  remove: ["Usuwamy…", "Deleting…", "Wird gelöscht…"],
  create: [
    "Tworzymy zaproszenie…",
    "Creating invitation…",
    "Einladung wird erstellt…",
  ],
  login: ["Logujemy…", "Signing in…", "Anmeldung läuft…"],
  logout: ["Wylogowujemy…", "Signing out…", "Abmeldung läuft…"],
  signup: ["Tworzymy konto…", "Creating account…", "Konto wird erstellt…"],
  reset: ["Wysyłamy link…", "Sending link…", "Link wird gesendet…"],
  send: ["Wysyłamy…", "Sending…", "Wird gesendet…"],
  verify: ["Sprawdzamy kod…", "Checking code…", "Code wird geprüft…"],
  refresh: ["Odświeżamy…", "Refreshing…", "Wird aktualisiert…"],
  qr: [
    "Przygotowujemy kod QR…",
    "Preparing QR code…",
    "QR-Code wird erstellt…",
  ],
  qrError: [
    "Nie udało się przygotować kodu QR.",
    "Could not generate the QR code.",
    "Der QR-Code konnte nicht erstellt werden.",
  ],
  copy: ["Kopiujemy…", "Copying…", "Wird kopiert…"],
  import: [
    "Importujemy gości…",
    "Importing guests…",
    "Gäste werden importiert…",
  ],
  unavailable: [
    "Zdjęcie niedostępne",
    "Photo unavailable",
    "Foto nicht verfügbar",
  ],
} as const;
export type LoadingMessage = keyof typeof messages;
export function loadingText(language: string, key: LoadingMessage) {
  return messages[key][language === "pl" ? 0 : language === "de" ? 2 : 1];
}
