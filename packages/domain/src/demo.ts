import { parseSiteConfig } from "./index.ts";

export function createDemo(id = "demo-ivory") {
  const second = id === "demo-sage";
  return parseSiteConfig({
    schemaVersion: 1,
    id,
    locale: "pl-PL",
    timeZone: "Europe/Warsaw",
    couple: {
      firstName: second ? "Julia" : "Anna",
      secondName: second ? "Michał" : "Jan",
    },
    hero: {
      eyebrow: "ZAPROSZENIE NA NASZ ŚLUB",
      title: "Razem zaczyna się wszystko.",
      description:
        "Chcemy dzielić z Wami ten wyjątkowy dzień. Bądźcie częścią naszej historii.",
      dateLabel: "12 czerwca 2027",
      layout: "split",
    },
    theme: second ? "sage" : "ivory",
    metadata: {
      title: "Nasze zaproszenie",
      description: "Dołączcie do nas w wyjątkowym dniu.",
      indexing: false,
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
    contacts: [
      {
        id: "contact",
        name: "Kontakt do organizatorów",
        phone: "+48000000000",
      },
    ],
    media: [],
    venues: [
      {
        id: "ceremony",
        name: "Przykładowe miejsce ceremonii",
        address: "Adres do uzupełnienia",
        description:
          "Spotkajmy się chwilę wcześniej, aby spokojnie zająć miejsca.",
      },
      {
        id: "party",
        name: "Przykładowe miejsce przyjęcia",
        address: "",
        description: "Po ceremonii zapraszamy do wspólnego świętowania.",
      },
      {
        id: "parking",
        name: "Parking dla gości",
        address: "",
        description: "Wjazd znajduje się obok głównego wejścia.",
      },
    ],
    events: [
      {
        id: "ceremony",
        title: "Ceremonia",
        date: "2027-06-12",
        time: "15:00",
        venueId: "ceremony",
      },
      {
        id: "party",
        title: "Wspólne świętowanie",
        date: "2027-06-12",
        time: "17:00",
        venueId: "party",
      },
    ],
    sections: [
      { id: "timeline", type: "timeline", title: "Plan naszego dnia" },
      {
        id: "ceremony",
        type: "venue",
        title: "Ceremonia",
        venueId: "ceremony",
      },
      { id: "party", type: "venue", title: "Przyjęcie", venueId: "party" },
      {
        id: "parking",
        type: "venue",
        title: "Jak dojechać",
        venueId: "parking",
      },
      {
        id: "contact",
        type: "contact",
        title: "Dajcie znać, że będziecie",
        body: "Potwierdźcie obecność telefonicznie lub przez SMS.",
      },
    ],
    variants: [
      {
        id: "slub",
        slug: "slub",
        label: "Ślub",
        eventIds: ["ceremony"],
        sectionIds: ["timeline", "ceremony", "parking", "contact"],
      },
      {
        id: "obiad",
        slug: "obiad",
        label: "Ślub i przyjęcie",
        eventIds: ["ceremony", "party"],
        sectionIds: ["timeline", "ceremony", "party", "parking", "contact"],
      },
      {
        id: "grill",
        slug: "grill",
        label: "Spotkanie z bliskimi",
        eventIds: ["party"],
        sectionIds: ["timeline", "party", "contact"],
      },
    ],
    defaultVariant: "obiad",
  });
}
