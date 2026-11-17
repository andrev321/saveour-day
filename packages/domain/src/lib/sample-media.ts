import type { InvitationLocale } from "../index.ts";
type SampleMediaManifest = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  variants: { src: string; width: number }[];
};

// Public, versioned illustrations shipped with both apps. Never use this prefix
// for private uploads. Keep old files/manifests for already published invitations.
export const samplePhotoKeys = [
  "garden",
  "gathering",
  "evening",
  "wedding",
  "reception",
  "birthday",
  "corporate",
  "anniversary",
  "baptism",
  "baby-shower",
  "housewarming",
  "workshop",
  "birthday-garden",
  "birthday-evening",
  "corporate-conference",
  "baptism-flowers",
  "baptism-table",
  "housewarming-garden",
  "housewarming-kitchen",
  "baby-shower-neutral",
  "baby-shower-girl",
  "workshop-notebooks",
  "workshop-pottery",
] as const;
export type SamplePhotoKey = (typeof samplePhotoKeys)[number];
export const samplePhotos: Record<SamplePhotoKey, SampleMediaManifest> =
  Object.fromEntries(
    samplePhotoKeys.map((key) => [
      key,
      {
        id: `example-${key}-v1`,
        src: `/media/examples/${key}-v1-1536.webp`,
        width: 1536,
        height: 1024,
        alt: "",
        variants: [640, 1280, 1536].map((width) => ({
          src: `/media/examples/${key}-v1-${width}.webp`,
          width,
        })),
      },
    ]),
  ) as Record<SamplePhotoKey, SampleMediaManifest>;

export function isSampleMedia(media: SampleMediaManifest) {
  return Object.values(samplePhotos).some(
    (sample) =>
      media.id === sample.id &&
      media.src === sample.src &&
      media.width === sample.width &&
      media.height === sample.height &&
      JSON.stringify(media.variants) === JSON.stringify(sample.variants),
  );
}
export function isSampleMediaSource(source: string) {
  return Object.values(samplePhotos).some(
    (sample) =>
      sample.src === source ||
      sample.variants.some((variant) => variant.src === source),
  );
}
export function samplePhoto(
  key: SamplePhotoKey,
  locale: InvitationLocale,
): SampleMediaManifest {
  const names = {
    "pl-PL": {
      garden: "Przykładowe zdjęcie — spacer w ogrodzie",
      gathering: "Przykładowe zdjęcie — spotkanie przy stole",
      evening: "Przykładowe zdjęcie — kolacja przy świecach",
      wedding: "Przykładowe zdjęcie — obrączki i kwiaty w ślubnym ogrodzie",
      reception: "Przykładowe zdjęcie — stół weselny",
      birthday: "Przykładowe zdjęcie — tort i dekoracje urodzinowe",
      corporate: "Przykładowe zdjęcie — spotkanie firmowe",
      anniversary: "Przykładowe zdjęcie — stół przygotowany na rocznicę ślubu",
      baptism: "Przykładowe zdjęcie — świeca i ubranko do chrztu",
      "baby-shower":
        "Przykładowe zdjęcie — dekoracje i prezenty na baby shower",
      housewarming: "Przykładowe zdjęcie — przyjęcie w nowym domu",
      workshop: "Przykładowe zdjęcie — materiały do warsztatów kreatywnych",
    },
    "en-GB": {
      garden: "Example photo — garden walk",
      gathering: "Example photo — gathering at the table",
      evening: "Example photo — candlelit dinner",
      wedding: "Example photo — wedding rings and flowers in a garden",
      reception: "Example photo — wedding reception table",
      birthday: "Example photo — birthday cake and decorations",
      corporate: "Example photo — company gathering",
      anniversary: "Example photo — anniversary dinner table",
      baptism: "Example photo — christening candle and gown",
      "baby-shower": "Example photo — baby shower decorations and gifts",
      housewarming: "Example photo — party in a new home",
      workshop: "Example photo — creative workshop materials",
    },
    "de-DE": {
      garden: "Beispielfoto — Gartenspaziergang",
      gathering: "Beispielfoto — gemeinsames Essen",
      evening: "Beispielfoto — Abendessen bei Kerzenlicht",
      wedding: "Beispielfoto — Eheringe und Blumen im Garten",
      reception: "Beispielfoto — festliche Hochzeitstafel",
      birthday: "Beispielfoto — Geburtstagstorte und Dekoration",
      corporate: "Beispielfoto — Firmenveranstaltung",
      anniversary: "Beispielfoto — festlicher Tisch zum Hochzeitstag",
      baptism: "Beispielfoto — Taufkerze und Taufkleid",
      "baby-shower": "Beispielfoto — Dekoration und Geschenke zur Babyparty",
      housewarming: "Beispielfoto — Feier im neuen Zuhause",
      workshop: "Beispielfoto — Materialien für einen Kreativworkshop",
    },
  };
  const extraNames = {
    "birthday-garden": [
      "Urodziny w ogrodzie",
      "Garden birthday",
      "Geburtstag im Garten",
    ],
    "birthday-evening": [
      "Wieczorne urodziny",
      "Evening birthday",
      "Geburtstagsabend",
    ],
    "corporate-conference": [
      "Sala spotkań",
      "Meeting room",
      "Besprechungsraum",
    ],
    "baptism-flowers": [
      "Kwiaty i świeca",
      "Flowers and candle",
      "Blumen und Kerze",
    ],
    "baptism-table": [
      "Rodzinny stół",
      "Family celebration table",
      "Festliche Familientafel",
    ],
    "housewarming-garden": [
      "Przyjęcie na tarasie",
      "Terrace party",
      "Terrassenfeier",
    ],
    "housewarming-kitchen": ["Nowa kuchnia", "New kitchen", "Neue Küche"],
    "baby-shower-neutral": ["Neutralny", "Neutral", "Neutral"],
    "baby-shower-girl": ["Dziewczynka", "Girl", "Mädchen"],
    "workshop-notebooks": [
      "Notatniki i kawa",
      "Notebooks and coffee",
      "Notizbücher und Kaffee",
    ],
    "workshop-pottery": [
      "Pracownia ceramiki",
      "Pottery studio",
      "Keramikwerkstatt",
    ],
  };
  const index = locale === "pl-PL" ? 0 : locale === "en-GB" ? 1 : 2;
  const alt =
    key in extraNames
      ? `${["Przykładowe zdjęcie", "Example photo", "Beispielfoto"][index]} — ${extraNames[key as keyof typeof extraNames][index]}`
      : names[locale][key as keyof (typeof names)[typeof locale]];
  return { ...structuredClone(samplePhotos[key]), alt };
}
