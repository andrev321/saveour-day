import {
  invitationLocales,
  parseSiteConfig,
  themes,
  themePalettes,
  type ThemeName,
  type ThemeAppearance,
  type InvitationLocale,
} from "./index.ts";
import { personalTemplateExample } from "./lib/template-examples.ts";
import { samplePhoto, type SamplePhotoKey } from "./lib/sample-media.ts";

const definitions = [
  ["wedding", "Ślub", "Wedding ceremony", "Trauung"],
  ["reception", "Wesele", "Wedding reception", "Hochzeitsfeier"],
  [
    "wedding-reception",
    "Ślub i wesele",
    "Wedding and reception",
    "Trauung und Hochzeitsfeier",
  ],
  ["birthday", "Urodziny", "Birthday", "Geburtstag"],
  ["corporate", "Impreza firmowa", "Company event", "Firmenveranstaltung"],
  ["anniversary", "Rocznica / jubileusz", "Anniversary", "Jubiläum"],
  [
    "family-ceremony",
    "Chrzciny / komunia",
    "Baptism / communion",
    "Taufe / Kommunion",
  ],
  ["baby-shower", "Baby shower", "Baby shower", "Babyparty"],
  ["housewarming", "Parapetówka", "Housewarming", "Einweihungsfeier"],
  [
    "workshop",
    "Spotkanie / warsztaty",
    "Meeting / workshop",
    "Treffen / Workshop",
  ],
  ["blank", "Puste zaproszenie", "Blank invitation", "Leere Einladung"],
] as const;
export type TemplateId = (typeof definitions)[number][0];
export const templatePhotos: Partial<Record<TemplateId, SamplePhotoKey>> = {
  wedding: "wedding",
  reception: "reception",
  "wedding-reception": "wedding",
  birthday: "birthday",
  corporate: "corporate",
  anniversary: "anniversary",
  "family-ceremony": "baptism",
  "baby-shower": "baby-shower-neutral",
  housewarming: "housewarming",
  workshop: "workshop",
};
export const templateThemes: Record<TemplateId, ThemeName> = {
  wedding: "classic",
  reception: "evening",
  "wedding-reception": "botanical",
  birthday: "celebration",
  corporate: "editorial",
  anniversary: "classic",
  "family-ceremony": "botanical",
  "baby-shower": "celebration",
  housewarming: "celebration",
  workshop: "editorial",
  blank: "editorial",
};
export function templateStyle(id: TemplateId) {
  const theme = templateThemes[id];
  const preset = themes[theme];
  const palettes: Partial<Record<TemplateId, string>> = {
    anniversary: "graphite",
    "family-ceremony": "sage",
    "baby-shower": "ocean",
    housewarming: "apricot",
    workshop: "moss",
  };
  const palette = themePalettes[theme].find((item) => item.id === palettes[id]);
  const appearance: ThemeAppearance = { ...preset.appearance };
  if (["baby-shower", "housewarming"].includes(id))
    appearance.decorations = "subtle";
  if (id === "workshop") appearance.icons = true;
  return {
    theme,
    design: { ...(palette?.design ?? preset.design) },
    appearance,
    layout: preset.layout,
  };
}
export const templateIds = definitions.map(([id]) => id) as [
  TemplateId,
  ...TemplateId[],
];
const labels = {
  "pl-PL": {
    invite: "Zaproszenie",
    example: "Przykładowe dane — dostosuj do swojego wydarzenia.",
    main: "Główna",
    program: "Program",
    place: "Miejsce do uzupełnienia",
    contact: "Kontakt do organizatora",
    contactBody: "Dodaj dane kontaktowe w konfiguratorze.",
    ceremony: "Ceremonia",
    reception: "Przyjęcie",
    welcome: "Zapraszamy do wspólnego świętowania!",
    blank: "Bez przykładowych osób, dat i wydarzeń.",
    sections: "Program, miejsce, informacje i kontakt.",
    navigate: "Prowadź do miejsca",
    showMap: "Pokaż mapę",
    eventLink: "Szczegóły wydarzenia",
    call: "Zadzwoń",
    sms: "Napisz SMS",
    copyPhone: "Kopiuj numer",
    copied: "Skopiowano",
    variantLabel: "Wariant zaproszenia",
  },
  "en-GB": {
    invite: "Invitation",
    example: "Example content — adapt it to your event.",
    main: "Main",
    program: "Programme",
    place: "Venue to be confirmed",
    contact: "Contact the organiser",
    contactBody: "Add contact details in the editor.",
    ceremony: "Ceremony",
    reception: "Reception",
    welcome: "Join us for this special occasion!",
    blank: "No sample people, dates or events.",
    sections: "Programme, venue, information and contact.",
    navigate: "Get directions",
    showMap: "Show map",
    eventLink: "Event details",
    call: "Call",
    sms: "Send SMS",
    copyPhone: "Copy number",
    copied: "Copied",
    variantLabel: "Invitation variant",
  },
  "de-DE": {
    invite: "Einladung",
    example: "Beispieldaten — passe sie an deine Veranstaltung an.",
    main: "Hauptseite",
    program: "Programm",
    place: "Veranstaltungsort ergänzen",
    contact: "Kontakt zum Veranstalter",
    contactBody: "Ergänze die Kontaktdaten im Editor.",
    ceremony: "Zeremonie",
    reception: "Empfang",
    welcome: "Feiert diesen besonderen Anlass mit uns!",
    blank: "Ohne Beispielpersonen, Termine oder Veranstaltungen.",
    sections: "Programm, Ort, Informationen und Kontakt.",
    navigate: "Route anzeigen",
    showMap: "Karte anzeigen",
    eventLink: "Veranstaltungsdetails",
    call: "Anrufen",
    sms: "SMS senden",
    copyPhone: "Nummer kopieren",
    copied: "Kopiert",
    variantLabel: "Einladungsvariante",
  },
};
export function templateCatalog(locale: InvitationLocale) {
  const index = invitationLocales.indexOf(locale) + 1;
  return definitions.map((row) => ({
    id: row[0],
    version: 1,
    category: row[0],
    locales: invitationLocales,
    label: row[index],
    style: templateStyle(row[0]),
    description:
      row[0] === "blank" ? labels[locale].blank : labels[locale].sections,
  }));
}
export function createTemplate(
  templateId: TemplateId,
  id: string,
  locale: InvitationLocale = "pl-PL",
  nextId: () => string = () => crypto.randomUUID(),
  mainId = "main",
) {
  const item = templateCatalog(locale).find((t) => t.id === templateId);
  if (!item) throw new Error("Unknown invitation template");
  const l = labels[locale];
  const blank = templateId === "blank";
  const example = personalTemplateExample(templateId, locale);
  const eventTitles = blank
    ? []
    : templateId === "wedding-reception" || templateId === "family-ceremony"
      ? [l.ceremony, l.reception]
      : [
          templateId === "wedding"
            ? l.ceremony
            : templateId === "reception"
              ? l.reception
              : item.label,
        ];
  const venues = eventTitles.map(() => ({
    id: nextId(),
    name: l.place,
    address: "",
  }));
  const events = eventTitles.map((title, i) => ({
    id: nextId(),
    title,
    time: i ? "17:00" : "15:00",
    dateLabel: "",
    venueId: venues[i].id,
  }));
  const sections = blank
    ? []
    : [
        {
          id: nextId(),
          type: "text",
          title: l.invite,
          body: example?.body ?? l.example,
        },
        {
          id: nextId(),
          type: "timeline",
          eventIds: events.map((e) => e.id),
          title: l.program,
        },
        ...venues.map((venue) => ({
          id: nextId(),
          type: "venue",
          title: venue.name,
          venueId: venue.id,
        })),
        {
          id: nextId(),
          type: "contact",
          contactIds: [],
          title: l.contact,
          body: l.contactBody,
        },
      ];
  const photoKey = templatePhotos[templateId];
  const photo = photoKey ? samplePhoto(photoKey, locale) : undefined;
  return parseSiteConfig({
    schemaVersion: 3,
    id,
    locale,
    timeZone: "Europe/Warsaw",
    identity: { displayName: blank ? "" : (example?.names ?? item.label) },
    hero: {
      eyebrow: blank ? "" : l.invite,
      title: example?.title ?? "",
      description: blank ? "" : (example?.body ?? l.welcome),
      dateLabel: "",
      layout: item.style.layout,
      ...(photo ? { mediaId: photo.id } : {}),
    },
    theme: item.style.theme,
    design: item.style.design,
    appearance: item.style.appearance,
    metadata: {
      title: example ? `${example.names} — ${item.label}` : l.invite,
      description: example?.body ?? "",
      indexing: false,
    },
    copy: {
      navigate: l.navigate,
      showMap: l.showMap,
      eventLink: l.eventLink,
      call: l.call,
      sms: l.sms,
      copyPhone: l.copyPhone,
      copied: l.copied,
      footer: "",
      variantLabel: l.variantLabel,
    },
    contacts: [],
    media: photo ? [photo] : [],
    venues,
    events,
    sections,
    variants: [
      {
        id: mainId,
        slug: "main",
        label: l.main,
        eventIds: events.map((e) => e.id),
        sections: sections
          .map((s) => s.id)
          .map((sectionId) => ({ sectionId, visible: true })),
      },
    ],
    defaultVariant: mainId,
  });
}
