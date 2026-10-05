import type { InvitationLocale } from "./index.ts";
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
export const samplePhotoKeys = ["garden", "gathering", "evening"] as const;
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
    },
    "en-GB": {
      garden: "Example photo — garden walk",
      gathering: "Example photo — gathering at the table",
      evening: "Example photo — candlelit dinner",
    },
    "de-DE": {
      garden: "Beispielfoto — Gartenspaziergang",
      gathering: "Beispielfoto — gemeinsames Essen",
      evening: "Beispielfoto — Abendessen bei Kerzenlicht",
    },
  };
  return { ...structuredClone(samplePhotos[key]), alt: names[locale][key] };
}
