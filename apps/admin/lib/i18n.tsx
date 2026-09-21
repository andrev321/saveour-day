"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { InvitationLocale } from "@wedding/domain";

export type PanelLanguage = "pl" | "en" | "de";
type Dictionary = Record<string, string>;

const messages: Record<PanelLanguage, Dictionary> = {
  pl: {
    language: "Język panelu",
    dashboard: "Twoje realizacje",
    logout: "Wyloguj",
    login: "Zaloguj się",
    email: "E-mail",
    password: "Hasło",
    forgot: "Nie pamiętam hasła",
    demo: "Otwórz lokalną demonstrację",
    createSite: "Utwórz realizację",
    siteName: "Nazwa nowej realizacji",
    edit: "Edytuj zaproszenie",
    admin: "Administrator",
    noSites:
      "Nie masz jeszcze przypisanych realizacji. Skontaktuj się z administratorem.",
    save: "Zapisz szkic",
    publish: "Publikuj stronę",
    simulate: "Symuluj publikację",
    export: "Eksport konfiguracji",
    page: "Strona",
    pages: "Strony",
    mainPage: "Strona główna",
    pagesHelp:
      "Każda strona ma własny adres URL. Możesz przygotować osobną, ograniczoną wersję dla wybranych gości.",
    structure: "Sekcje",
    media: "Zdjęcia",
    settings: "Ustawienia",
    couple: "Para",
    hero: "Pierwszy ekran",
    venues: "Miejsca",
    events: "Wydarzenia",
    contacts: "Kontakty",
    theme: "Motyw kolorystyczny",
    colors: "Kolory motywu",
    sharing: "Udostępnianie",
    labelsFooter: "Etykiety i stopka",
    preview: "Podgląd wariantu",
    openPreview: "Powiększ podgląd",
    closePreview: "Zamknij podgląd",
    screenWidth: "Szerokość ekranu",
    history: "Historia publikacji",
    languageChanged:
      "Zmieniono język oraz niezmodyfikowany szablon zaproszenia. Zapisz szkic, aby utrwalić zmianę.",
    unsaved: "Niezapisane zmiany",
    draft: "Szkic",
    projects: "Realizacje",
    localDemo: "Demonstracja lokalna",
    validation: "Popraw konfigurację",
    setup: "Panel nie jest jeszcze połączony z Supabase",
    setupDescription:
      "Ustaw środowisko według dokumentacji. Dane klientów nie są dostępne bez konfiguracji kont.",
    domainMissing: "Domena nie została przypisana",
    resetSent: "Jeżeli konto istnieje, otrzymasz wiadomość z instrukcją.",
    genericError: "Nie udało się wykonać operacji",
    invalidLogin: "Nieprawidłowy e-mail lub hasło",
    setPassword: "Ustaw hasło",
    newPassword: "Nowe hasło (minimum 12 znaków)",
    savePassword: "Zapisz hasło",
    passwordSaved: "Hasło zostało zapisane.",
    passwordError: "Nie udało się zmienić hasła. Sprawdź ważność zaproszenia.",
    backToProjects: "Przejdź do realizacji",
  },
  en: {
    language: "Panel language",
    dashboard: "Your projects",
    logout: "Sign out",
    login: "Sign in",
    email: "Email",
    password: "Password",
    forgot: "I forgot my password",
    demo: "Open local demo",
    createSite: "Create project",
    siteName: "New project name",
    edit: "Edit invitation",
    admin: "Administrator",
    noSites:
      "You do not have any assigned projects yet. Contact an administrator.",
    save: "Save draft",
    publish: "Publish site",
    simulate: "Simulate publishing",
    export: "Export configuration",
    page: "Page",
    pages: "Pages",
    mainPage: "Main page",
    pagesHelp:
      "Each page has its own URL. You can prepare a separate, limited version of the site for selected guests.",
    structure: "Sections",
    media: "Photos",
    settings: "Settings",
    couple: "Couple",
    hero: "Hero section",
    venues: "Venues",
    events: "Events",
    contacts: "Contacts",
    theme: "Colour theme",
    colors: "Theme colours",
    sharing: "Sharing",
    labelsFooter: "Labels and footer",
    preview: "Preview option",
    openPreview: "Expand preview",
    closePreview: "Close preview",
    screenWidth: "Screen width",
    history: "Publishing history",
    languageChanged:
      "The language and unmodified invitation template were changed. Save the draft to keep the change.",
    unsaved: "Unsaved changes",
    draft: "Draft",
    projects: "Projects",
    localDemo: "Local demo",
    validation: "Fix the configuration",
    setup: "The panel is not connected to Supabase yet",
    setupDescription:
      "Configure the environment as described in the documentation. Client data is unavailable until accounts are configured.",
    domainMissing: "No domain has been assigned",
    resetSent:
      "If the account exists, an email with instructions will be sent.",
    genericError: "The operation could not be completed",
    invalidLogin: "Invalid email or password",
    setPassword: "Set password",
    newPassword: "New password (at least 12 characters)",
    savePassword: "Save password",
    passwordSaved: "Password saved.",
    passwordError:
      "The password could not be changed. Check whether the invitation is still valid.",
    backToProjects: "Go to projects",
  },
  de: {
    language: "Sprache des Panels",
    dashboard: "Ihre Projekte",
    logout: "Abmelden",
    login: "Anmelden",
    email: "E-Mail",
    password: "Passwort",
    forgot: "Passwort vergessen",
    demo: "Lokale Demo öffnen",
    createSite: "Projekt erstellen",
    siteName: "Name des neuen Projekts",
    edit: "Einladung bearbeiten",
    admin: "Administrator",
    noSites:
      "Ihnen sind noch keine Projekte zugeordnet. Wenden Sie sich an die Administration.",
    save: "Entwurf speichern",
    publish: "Seite veröffentlichen",
    simulate: "Veröffentlichung simulieren",
    export: "Konfiguration exportieren",
    page: "Seite",
    pages: "Seiten",
    mainPage: "Hauptseite",
    pagesHelp:
      "Jede Seite hat eine eigene URL. Sie können eine separate, eingeschränkte Version für ausgewählte Gäste vorbereiten.",
    structure: "Abschnitte",
    media: "Fotos",
    settings: "Einstellungen",
    couple: "Paar",
    hero: "Startbereich",
    venues: "Orte",
    events: "Ereignisse",
    contacts: "Kontakte",
    theme: "Farbthema",
    colors: "Themenfarben",
    sharing: "Freigabe",
    labelsFooter: "Beschriftungen und Fußzeile",
    preview: "Vorschauvariante",
    openPreview: "Vorschau vergrößern",
    closePreview: "Vorschau schließen",
    screenWidth: "Bildschirmbreite",
    history: "Veröffentlichungsverlauf",
    languageChanged:
      "Die Sprache und die unveränderte Einladungsvorlage wurden angepasst. Speichern Sie den Entwurf, um die Änderung zu übernehmen.",
    unsaved: "Nicht gespeicherte Änderungen",
    draft: "Entwurf",
    projects: "Projekte",
    localDemo: "Lokale Demo",
    validation: "Konfiguration korrigieren",
    setup: "Das Panel ist noch nicht mit Supabase verbunden",
    setupDescription:
      "Richten Sie die Umgebung gemäß der Dokumentation ein. Kundendaten sind erst nach der Kontokonfiguration verfügbar.",
    domainMissing: "Es wurde keine Domain zugewiesen",
    resetSent:
      "Falls das Konto existiert, wird eine E-Mail mit Anweisungen versendet.",
    genericError: "Der Vorgang konnte nicht ausgeführt werden",
    invalidLogin: "Ungültige E-Mail-Adresse oder Passwort",
    setPassword: "Passwort festlegen",
    newPassword: "Neues Passwort (mindestens 12 Zeichen)",
    savePassword: "Passwort speichern",
    passwordSaved: "Passwort gespeichert.",
    passwordError:
      "Das Passwort konnte nicht geändert werden. Prüfen Sie die Gültigkeit der Einladung.",
    backToProjects: "Zu den Projekten",
  },
};

const editorMessages: Record<PanelLanguage, Dictionary> = {
  pl: {
    savedDraft: "Szkic zapisany. Publiczna strona nie została zmieniona.",
    simulationDone: "Symulacja zakończona. Nie utworzono wdrożenia Vercel.",
    publicationStarted: "Publikacja uruchomiona. Odśwież status za chwilę.",
    uploadNeedsSupabase:
      "Upload wymaga połączenia z Supabase. Demonstracja nie wysyła plików.",
    maxPhotoSize: "Maksymalny rozmiar zdjęcia: 8 MB",
    uploadFailed: "Upload nie powiódł się",
    focalDesktopX: "Kadr desktop: poziomo",
    focalDesktopY: "Kadr desktop: pionowo",
    focalMobileX: "Kadr mobile: poziomo",
    focalMobileY: "Kadr mobile: pionowo",
    administration: "Administracja realizacją",
    vercelConnected: "Projekt Vercel połączony",
    createVercel: "Utwórz projekt Vercel",
    clientEmail: "E-mail klienta",
    inviteClient: "Zaproś klienta",
    invitationSent: "Zaproszenie wysłane.",
    clientDomain: "Domena klienta",
    assignDomain: "Przypisz domenę",
    domainVerified: "Domena zweryfikowana.",
    domainAdded:
      "Domena dodana. Dokończ konfigurację DNS w Vercel → Settings → Domains.",
    publishTitle: "Publikacja strony",
    restoreTitle: "Przywrócenie wydania",
    publishWarning:
      "Treści i zdjęcia tego wydania staną się publiczne. Zmiany w późniejszym szkicu nie zmienią opublikowanej wersji.",
    startSimulation: "Uruchom symulację",
    confirmPublish: "Potwierdź publikację",
    resolveFailed: "Zamknij po kontroli Vercel",
    resolveConfirm:
      "Czy sprawdzono Vercel i potwierdzono brak aktywnego wdrożenia?",
  },
  en: {
    savedDraft: "Draft saved. The public site was not changed.",
    simulationDone: "Simulation completed. No Vercel deployment was created.",
    publicationStarted: "Publishing started. Refresh the status shortly.",
    uploadNeedsSupabase:
      "Uploading requires a Supabase connection. The demo does not upload files.",
    maxPhotoSize: "Maximum photo size: 8 MB",
    uploadFailed: "Upload failed",
    focalDesktopX: "Desktop crop: horizontal",
    focalDesktopY: "Desktop crop: vertical",
    focalMobileX: "Mobile crop: horizontal",
    focalMobileY: "Mobile crop: vertical",
    administration: "Project administration",
    vercelConnected: "Vercel project connected",
    createVercel: "Create Vercel project",
    clientEmail: "Client email",
    inviteClient: "Invite client",
    invitationSent: "Invitation sent.",
    clientDomain: "Client domain",
    assignDomain: "Assign domain",
    domainVerified: "Domain verified.",
    domainAdded:
      "Domain added. Complete DNS setup in Vercel → Settings → Domains.",
    publishTitle: "Publish site",
    restoreTitle: "Restore release",
    publishWarning:
      "The content and photos in this release will become public. Changes in a later draft will not change the published version.",
    startSimulation: "Start simulation",
    confirmPublish: "Confirm publishing",
    resolveFailed: "Close after Vercel review",
    resolveConfirm:
      "Has Vercel been checked and the lack of an active deployment confirmed?",
  },
  de: {
    savedDraft:
      "Entwurf gespeichert. Die öffentliche Seite wurde nicht geändert.",
    simulationDone:
      "Simulation abgeschlossen. Es wurde kein Vercel-Deployment erstellt.",
    publicationStarted:
      "Veröffentlichung gestartet. Aktualisieren Sie den Status in Kürze.",
    uploadNeedsSupabase:
      "Der Upload erfordert eine Supabase-Verbindung. Die Demo lädt keine Dateien hoch.",
    maxPhotoSize: "Maximale Fotogröße: 8 MB",
    uploadFailed: "Upload fehlgeschlagen",
    focalDesktopX: "Desktop-Ausschnitt: horizontal",
    focalDesktopY: "Desktop-Ausschnitt: vertikal",
    focalMobileX: "Mobiler Ausschnitt: horizontal",
    focalMobileY: "Mobiler Ausschnitt: vertikal",
    administration: "Projektverwaltung",
    vercelConnected: "Vercel-Projekt verbunden",
    createVercel: "Vercel-Projekt erstellen",
    clientEmail: "E-Mail des Kunden",
    inviteClient: "Kunden einladen",
    invitationSent: "Einladung gesendet.",
    clientDomain: "Kundendomain",
    assignDomain: "Domain zuweisen",
    domainVerified: "Domain verifiziert.",
    domainAdded:
      "Domain hinzugefügt. Vervollständigen Sie die DNS-Konfiguration in Vercel → Settings → Domains.",
    publishTitle: "Seite veröffentlichen",
    restoreTitle: "Version wiederherstellen",
    publishWarning:
      "Die Inhalte und Fotos dieser Version werden öffentlich. Änderungen in einem späteren Entwurf ändern die veröffentlichte Version nicht.",
    startSimulation: "Simulation starten",
    confirmPublish: "Veröffentlichung bestätigen",
    resolveFailed: "Nach Vercel-Prüfung schließen",
    resolveConfirm:
      "Wurde Vercel geprüft und das Fehlen eines aktiven Deployments bestätigt?",
  },
};

type PanelI18n = {
  language: PanelLanguage;
  setLanguage: (language: PanelLanguage) => void;
  t: (key: string) => string;
};
const PanelI18nContext = createContext<PanelI18n | null>(null);
const storageKey = "wedding-panel-language";
const invitationLocales: Record<PanelLanguage, InvitationLocale> = {
  pl: "pl-PL",
  en: "en-GB",
  de: "de-DE",
};
export const invitationLocaleFor = (
  language: PanelLanguage,
): InvitationLocale => invitationLocales[language];

function readLanguage(): PanelLanguage {
  const stored = window.localStorage.getItem(storageKey);
  return stored === "en" || stored === "de" ? stored : "pl";
}

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("panel-language-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("panel-language-change", onChange);
  };
}

export function PanelI18nProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore<PanelLanguage>(
    subscribeToLanguage,
    readLanguage,
    () => "pl",
  );
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo<PanelI18n>(
    () => ({
      language,
      setLanguage: (next) => {
        window.localStorage.setItem(storageKey, next);
        window.dispatchEvent(new Event("panel-language-change"));
      },
      t: (key) =>
        messages[language][key] || editorMessages[language][key] || key,
    }),
    [language],
  );
  return (
    <PanelI18nContext.Provider value={value}>
      {children}
    </PanelI18nContext.Provider>
  );
}

export function usePanelI18n() {
  const value = useContext(PanelI18nContext);
  if (!value) throw new Error("PanelI18nProvider is required");
  return value;
}
