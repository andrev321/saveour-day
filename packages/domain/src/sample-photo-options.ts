import { samplePhoto, type SamplePhotoKey } from "./sample-media.ts";
import type { InvitationLocale, SiteConfig } from "./index.ts";

// Curated choices are independent of the invitation theme and editable content.
export const samplePhotoGroups = {
  wedding: ["wedding", "reception", "anniversary"],
  reception: ["reception", "wedding", "anniversary"],
  "wedding-reception": ["wedding", "reception", "anniversary"],
  birthday: ["birthday", "birthday-garden", "birthday-evening"],
  corporate: ["corporate", "corporate-conference", "workshop-notebooks"],
  anniversary: ["anniversary", "reception", "wedding"],
  "family-ceremony": ["baptism", "baptism-flowers", "baptism-table"],
  "baby-shower": ["baby-shower-neutral", "baby-shower-girl", "baby-shower"],
  housewarming: ["housewarming", "housewarming-garden", "housewarming-kitchen"],
  workshop: ["workshop", "workshop-notebooks", "workshop-pottery"],
} as const satisfies Record<string, readonly SamplePhotoKey[]>;
export type SamplePhotoGroup = keyof typeof samplePhotoGroups;
export function samplePhotoOptions(
  group: SamplePhotoGroup,
  locale: InvitationLocale,
) {
  return samplePhotoGroups[group].map((key) => samplePhoto(key, locale));
}

export function selectSamplePhoto(
  config: SiteConfig,
  key: SamplePhotoKey,
): SiteConfig {
  const photo = samplePhoto(key, config.locale);
  const exists = config.media.some((item) => item.id === photo.id);
  if (!exists && config.media.length >= 30) return config;
  if (config.hero.mediaId === photo.id) return config;
  return {
    ...config,
    media: exists ? config.media : [...config.media, photo],
    hero: {
      ...config.hero,
      mediaId: photo.id,
      crops: {
        ...config.hero.crops,
        desktop: undefined,
        ...(!config.hero.tabletMediaId ? { tablet: undefined } : {}),
        ...(!config.hero.mobileMediaId ? { mobile: undefined } : {}),
      },
    },
  };
}
