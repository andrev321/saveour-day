import {
  parseSiteConfig,
  themeDesigns,
  type InvitationLocale,
} from "./index.ts";

type Template = {
  couple: [string, string];
  eyebrow: string;
  title: string;
  description: string;
  dateLabel: string;
  metadata: { title: string; description: string };
  copy: {
    navigate: string;
    showMap: string;
    eventLink: string;
    call: string;
    sms: string;
    copyPhone: string;
    copied: string;
    footer: string;
    variantLabel: string;
  };
  contact: string;
  address: string;
  venues: [string, string, string];
  descriptions: [string, string, string];
  events: [string, string];
  sections: [string, string, string, string, string];
  variants: [string, string, string];
};

const templates: Record<InvitationLocale, Template> = {
  "pl-PL": {
    couple: ["Anna", "Jan"],
    eyebrow: "ZAPROSZENIE NA NASZ ŚLUB",
    title: "Razem zaczyna się wszystko.",
    description:
      "Chcemy dzielić z Wami ten wyjątkowy dzień. Bądźcie częścią naszej historii.",
    dateLabel: "12 czerwca 2027",
    metadata: {
      title: "Nasze zaproszenie",
      description: "Dołączcie do nas w wyjątkowym dniu.",
    },
    copy: {
      navigate: "Prowadź do miejsca",
      showMap: "Pokaż mapę",
      eventLink: "Szczegóły wydarzenia",
      call: "Zadzwoń",
      sms: "Napisz SMS",
      copyPhone: "Kopiuj numer",
      copied: "Skopiowano",
      footer: "Z miłością, czekamy na Was.",
      variantLabel: "Wariant zaproszenia",
    },
    contact: "Kontakt do organizatorów",
    address: "Adres do uzupełnienia",
    venues: [
      "Przykładowe miejsce ceremonii",
      "Przykładowe miejsce przyjęcia",
      "Parking dla gości",
    ],
    descriptions: [
      "Spotkajmy się chwilę wcześniej, aby spokojnie zająć miejsca.",
      "Po ceremonii zapraszamy do wspólnego świętowania.",
      "Wjazd znajduje się obok głównego wejścia.",
    ],
    events: ["Ceremonia", "Wspólne świętowanie"],
    sections: [
      "Plan naszego dnia",
      "Ceremonia",
      "Przyjęcie",
      "Jak dojechać",
      "Dajcie znać, że będziecie",
    ],
    variants: ["Główna", "Pełna", "Ograniczona"],
  },
  "en-GB": {
    couple: ["Emma", "Liam"],
    eyebrow: "AN INVITATION TO OUR WEDDING",
    title: "Together is where it all begins.",
    description:
      "We would love to share this special day with you. Be part of our story.",
    dateLabel: "12 June 2027",
    metadata: {
      title: "Our wedding invitation",
      description: "Join us on our special day.",
    },
    copy: {
      navigate: "Get directions",
      showMap: "Show map",
      eventLink: "Event details",
      call: "Call",
      sms: "Send SMS",
      copyPhone: "Copy number",
      copied: "Copied",
      footer: "With love, we look forward to seeing you.",
      variantLabel: "Invitation option",
    },
    contact: "Contact the hosts",
    address: "Address to be completed",
    venues: [
      "Example ceremony venue",
      "Example reception venue",
      "Guest parking",
    ],
    descriptions: [
      "Please arrive a little earlier so everyone can take their seats comfortably.",
      "After the ceremony, join us for a celebration.",
      "The entrance is next to the main gate.",
    ],
    events: ["Ceremony", "Celebration"],
    sections: [
      "Our day at a glance",
      "Ceremony",
      "Reception",
      "Getting there",
      "Let us know you are coming",
    ],
    variants: ["Main", "Full", "Limited"],
  },
  "de-DE": {
    couple: ["Lena", "Jonas"],
    eyebrow: "EINLADUNG ZU UNSERER HOCHZEIT",
    title: "Gemeinsam beginnt alles.",
    description:
      "Wir möchten diesen besonderen Tag mit euch teilen. Seid Teil unserer Geschichte.",
    dateLabel: "12. Juni 2027",
    metadata: {
      title: "Unsere Hochzeitseinladung",
      description: "Feiert diesen besonderen Tag mit uns.",
    },
    copy: {
      navigate: "Route planen",
      showMap: "Karte anzeigen",
      eventLink: "Details zur Veranstaltung",
      call: "Anrufen",
      sms: "SMS schreiben",
      copyPhone: "Nummer kopieren",
      copied: "Kopiert",
      footer: "In Liebe freuen wir uns auf euch.",
      variantLabel: "Einladungsvariante",
    },
    contact: "Kontakt für Gäste",
    address: "Adresse ergänzen",
    venues: [
      "Beispielort für die Trauung",
      "Beispielort für die Feier",
      "Parkplatz für Gäste",
    ],
    descriptions: [
      "Trefft bitte etwas früher ein, damit alle in Ruhe Platz nehmen können.",
      "Nach der Trauung feiern wir gemeinsam weiter.",
      "Die Einfahrt liegt neben dem Haupteingang.",
    ],
    events: ["Trauung", "Gemeinsame Feier"],
    sections: [
      "Ablauf unseres Tages",
      "Trauung",
      "Feier",
      "Anreise",
      "Gebt uns Bescheid",
    ],
    variants: ["Hauptseite", "Vollständig", "Eingeschränkt"],
  },
};

export function createDemo(
  id = "demo-ivory",
  locale: InvitationLocale = "pl-PL",
) {
  const second = id === "demo-sage";
  const template = templates[locale];
  const couple =
    second && locale === "pl-PL"
      ? (["Julia", "Michał"] as const)
      : template.couple;
  return parseSiteConfig({
    schemaVersion: 1,
    id,
    locale,
    timeZone: "Europe/Warsaw",
    couple: { firstName: couple[0], secondName: couple[1] },
    hero: {
      eyebrow: template.eyebrow,
      title: template.title,
      description: template.description,
      dateLabel: template.dateLabel,
      layout: "split",
    },
    theme: second ? "sage" : "ivory",
    design: themeDesigns[second ? "sage" : "ivory"],
    metadata: { ...template.metadata, indexing: false },
    copy: template.copy,
    contacts: [
      { id: "contact", name: template.contact, phone: "+48000000000" },
    ],
    media: [],
    venues: [
      {
        id: "ceremony",
        name: template.venues[0],
        address: template.address,
        description: template.descriptions[0],
      },
      {
        id: "party",
        name: template.venues[1],
        address: "",
        description: template.descriptions[1],
      },
      {
        id: "parking",
        name: template.venues[2],
        address: "",
        description: template.descriptions[2],
      },
    ],
    events: [
      {
        id: "ceremony",
        title: template.events[0],
        date: "2027-06-12",
        time: "15:00",
        venueId: "ceremony",
      },
      {
        id: "party",
        title: template.events[1],
        date: "2027-06-12",
        time: "17:00",
        venueId: "party",
      },
    ],
    sections: [
      { id: "timeline", type: "timeline", title: template.sections[0] },
      {
        id: "ceremony",
        type: "venue",
        title: template.sections[1],
        venueId: "ceremony",
      },
      {
        id: "party",
        type: "venue",
        title: template.sections[2],
        venueId: "party",
      },
      {
        id: "parking",
        type: "venue",
        title: template.sections[3],
        venueId: "parking",
      },
      {
        id: "contact",
        type: "contact",
        title: template.sections[4],
        body:
          locale === "pl-PL"
            ? "Potwierdźcie obecność telefonicznie lub przez SMS."
            : locale === "en-GB"
              ? "Please confirm your attendance by phone or SMS."
              : "Bitte bestätigt eure Teilnahme telefonisch oder per SMS.",
      },
    ],
    variants: [
      {
        id: "slub",
        slug: "glowna",
        label: template.variants[0],
        eventIds: ["ceremony", "party"],
        sectionIds: ["timeline", "ceremony", "party", "parking", "contact"],
      },
    ],
    defaultVariant: "slub",
  });
}

export function isUnmodifiedTemplate(config: ReturnType<typeof createDemo>) {
  return (
    JSON.stringify(config) ===
    JSON.stringify(createDemo(config.id, config.locale))
  );
}
