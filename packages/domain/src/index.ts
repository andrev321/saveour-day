import { z } from "zod";
import { themeNames, themeDesigns, themes } from "./lib/themes.ts";
import { contrastRatio } from "./lib/colors.ts";
import { isSampleMedia } from "./lib/sample-media.ts";
export {
  samplePhotoGroups,
  samplePhotoOptions,
  selectSamplePhoto,
  type SamplePhotoGroup,
} from "./lib/sample-photo-options.ts";
export {
  samplePhoto,
  samplePhotos,
  isSampleMedia,
  isSampleMediaSource,
} from "./lib/sample-media.ts";
export {
  contrastRatio,
  colorLuminance,
  isDarkColor,
  textOnColor,
} from "./lib/colors.ts";
export {
  themeNames,
  themeDesigns,
  themes,
  themePalettes,
  matchingThemePalette,
  applyTheme,
  applyThemePalette,
  type ThemeName,
  type ThemeDesign,
  type ThemeAppearance,
  type ThemePalette,
} from "./lib/themes.ts";

const text = z.string().trim().min(1).max(500);
const paragraph = z.string().trim().max(6000).default("");
export const idSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Użyj małych liter, cyfr i myślników");
export const httpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    // Refinements also run for strings that failed the preceding URL check.
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "Wymagany adres HTTPS bez danych logowania");
const optionalUrl = z.union([z.literal(""), httpsUrl]).default("");
const hexColor = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Użyj koloru HEX, np. #AABBCC");
export type InvitationLocale = "pl-PL" | "en-GB" | "de-DE";
export const invitationLocales = ["pl-PL", "en-GB", "de-DE"] as const;
const designSchema = z
  .object({
    paper: hexColor,
    surface: hexColor,
    ink: hexColor,
    accent: hexColor,
  })
  .strict();
const mapUrl = optionalUrl.refine((value) => {
  if (!value) return true;
  try {
    const u = new URL(value);
    return (
      ["www.google.com", "maps.google.com"].includes(u.hostname) &&
      (u.pathname.startsWith("/maps/embed") ||
        u.searchParams.get("output") === "embed")
    );
  } catch {
    return false;
  }
}, "Mapa musi być adresem osadzania Google Maps");
const imageSource = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      /^\/media\/[a-zA-Z0-9_./-]+\.(webp|jpe?g|png|avif)$/.test(value) &&
      !value.includes(".."),
    "Obraz musi pochodzić z biblioteki mediów",
  );
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Nieprawidłowa data");
const blurDataUrlSchema = z
  .string()
  .max(4096)
  .refine(
    (value) => /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/.test(value),
    "Nieprawidłowy podgląd zdjęcia",
  );
export const mediaSchema = z
  .object({
    id: idSchema,
    src: imageSource,
    alt: z.string().max(300).default(""),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
    variants: z
      .array(
        z
          .object({ src: imageSource, width: z.number().int().positive() })
          .strict(),
      )
      .max(8)
      .default([]),
    blurDataUrl: blurDataUrlSchema.optional(),
  })
  .strict()
  .refine((media) => {
    const reserved =
      media.id.startsWith("example-") ||
      [media.src, ...media.variants.map((v) => v.src)].some((src) =>
        src.startsWith("/media/examples/"),
      );
    return !reserved || isSampleMedia(media);
  }, "Nieprawidłowe zdjęcie przykładowe");
const venueSchema = z
  .object({
    id: idSchema,
    name: text,
    address: z.string().max(500).default(""),
    description: paragraph,
    mapUrl,
    navigationUrl: optionalUrl,
  })
  .strict();
const eventSchema = z
  .object({
    id: idSchema,
    title: text,
    date: date.optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    dateLabel: z.string().max(200).default(""),
    venueId: idSchema.optional(),
    url: optionalUrl,
  })
  .strict();
export const cropSchema = z
  .object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) })
  .strict();
export const deviceCropsSchema = z
  .object({
    desktop: cropSchema.optional(),
    tablet: cropSchema.optional(),
    mobile: cropSchema.optional(),
  })
  .strict();
export type DeviceCrops = z.infer<typeof deviceCropsSchema>;
const references = (max: number) =>
  z
    .array(idSchema)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, "Powtórzone odwołanie");
const sectionBase = { id: idSchema, title: text, body: paragraph };
export const sectionSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...sectionBase,
      type: z.literal("timeline"),
      eventIds: references(50),
    })
    .strict(),
  z
    .object({ ...sectionBase, type: z.literal("venue"), venueId: idSchema })
    .strict(),
  z
    .object({
      ...sectionBase,
      type: z.literal("contact"),
      contactIds: references(10),
    })
    .strict(),
  z.object({ ...sectionBase, type: z.literal("text") }).strict(),
  z
    .object({
      ...sectionBase,
      type: z.literal("gallery"),
      mediaIds: references(30),
      crops: z.record(idSchema, deviceCropsSchema).default({}),
    })
    .strict(),
]);
export type Section = z.infer<typeof sectionSchema>;
const variantSchema = z
  .object({
    id: idSchema,
    slug: idSchema,
    label: text,
    dateLabel: z.string().max(200).default(""),
    eventIds: references(50),
    sections: z
      .array(z.object({ sectionId: idSchema, visible: z.boolean() }).strict())
      .max(30),
  })
  .strict();
const currentConfigSchema = z
  .object({
    schemaVersion: z.literal(3),
    id: idSchema,
    locale: z.enum(invitationLocales),
    timeZone: z.literal("Europe/Warsaw"),
    identity: z.object({ displayName: z.string().trim().max(500) }).strict(),
    hero: z
      .object({
        eyebrow: z.string().trim().max(500),
        title: z.string().trim().max(500),
        description: paragraph,
        dateLabel: z.string().trim().max(500),
        mediaId: idSchema.optional(),
        mobileMediaId: idSchema.optional(),
        tabletMediaId: idSchema.optional(),
        layout: z.enum(["overlay", "split"]),
        crops: deviceCropsSchema.default({}),
      })
      .strict(),
    theme: z.enum(themeNames),
    appearance: z
      .object({
        icons: z.boolean(),
        decorations: z.enum(["none", "subtle", "full"]),
      })
      .strict()
      .optional(),
    design: designSchema.optional(),
    metadata: z
      .object({
        title: text,
        description: z.string().max(300),
        indexing: z.boolean().default(false),
      })
      .strict(),
    copy: z
      .object({
        navigate: text,
        showMap: text,
        eventLink: text,
        call: text,
        sms: text,
        copyPhone: text,
        copied: text,
        footer: z.string().trim().max(500),
        variantLabel: text,
      })
      .strict(),
    contacts: z
      .array(
        z
          .object({
            id: idSchema,
            name: text,
            phone: z
              .string()
              .transform((value) => value.replace(/[\s()-]/g, ""))
              .pipe(z.string().regex(/^\+?[0-9]{7,15}$/)),
          })
          .strict(),
      )
      .max(10),
    media: z.array(mediaSchema).max(30),
    venues: z.array(venueSchema).max(30),
    events: z.array(eventSchema).max(50),
    sections: z.array(sectionSchema).max(30),
    variants: z.array(variantSchema).min(1).max(10),
    defaultVariant: idSchema,
  })
  .strict()
  .transform((value) => ({
    ...value,
    design: value.design ?? themeDesigns[value.theme],
    appearance: value.appearance ?? themes[value.theme].appearance,
  }))
  .superRefine((value, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (contrastRatio(value.design.ink, value.design.paper) < 4.5)
      issue(
        ["design", "ink"],
        "Tekst musi mieć kontrast co najmniej 4.5:1 względem tła strony",
      );
    if (contrastRatio(value.design.accent, value.design.paper) < 3)
      issue(
        ["design", "accent"],
        "Akcent musi mieć kontrast co najmniej 3:1 względem tła strony",
      );
    for (const collection of [
      "contacts",
      "media",
      "venues",
      "events",
      "sections",
      "variants",
    ] as const) {
      const seen = new Set<string>();
      value[collection].forEach((item, index) => {
        if (seen.has(item.id))
          issue([collection, index, "id"], "Powtórzony identyfikator");
        seen.add(item.id);
      });
    }
    const ref = (
      collection:
        "media" | "venues" | "events" | "sections" | "variants" | "contacts",
      id: string | undefined,
      path: (string | number)[],
    ) => {
      if (id && !value[collection].some((item) => item.id === id))
        issue(path, "Odwołanie do nieistniejącego elementu");
    };
    ref("variants", value.defaultVariant, ["defaultVariant"]);
    ref("media", value.hero.mediaId, ["hero", "mediaId"]);
    ref("media", value.hero.mobileMediaId, ["hero", "mobileMediaId"]);
    ref("media", value.hero.tabletMediaId, ["hero", "tabletMediaId"]);
    value.events.forEach((event, i) =>
      ref("venues", event.venueId, ["events", i, "venueId"]),
    );
    value.sections.forEach((s, i) => {
      if (s.type === "venue")
        ref("venues", s.venueId, ["sections", i, "venueId"]);
      if (s.type === "timeline")
        s.eventIds.forEach((id, j) =>
          ref("events", id, ["sections", i, "eventIds", j]),
        );
      if (s.type === "contact")
        s.contactIds.forEach((id, j) =>
          ref("contacts", id, ["sections", i, "contactIds", j]),
        );
      if (s.type === "gallery") {
        s.mediaIds.forEach((id, j) =>
          ref("media", id, ["sections", i, "mediaIds", j]),
        );
        for (const id of Object.keys(s.crops))
          if (!s.mediaIds.includes(id))
            issue(
              ["sections", i, "crops", id],
              "Kadr musi dotyczyć zdjęcia w tej galerii",
            );
      }
    });
    const slugs = new Set<string>();
    value.variants.forEach((v, i) => {
      if (slugs.has(v.slug))
        issue(["variants", i, "slug"], "Powtórzony adres wariantu");
      slugs.add(v.slug);
      v.eventIds.forEach((id, j) =>
        ref("events", id, ["variants", i, "eventIds", j]),
      );
      if (
        new Set(v.sections.map((p) => p.sectionId)).size !== v.sections.length
      )
        issue(["variants", i, "sections"], "Powtórzone odwołanie");
      v.sections.forEach((p, j) =>
        ref("sections", p.sectionId, ["variants", i, "sections", j]),
      );
    });
  });
export const siteConfigSchema = currentConfigSchema;
export const publishedConfigSchema = siteConfigSchema.refine(
  (config) => config.identity.displayName.length > 0,
  {
    path: ["identity", "displayName"],
    message: "Uzupełnij główny napis przed publikacją",
  },
);
export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type MediaAsset = z.infer<typeof mediaSchema>;
export function parseSiteConfig(input: unknown): SiteConfig {
  const result = siteConfigSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      result.error.issues
        .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
        .join("\n"),
    );
  return result.data;
}
export function navigationUrl(venue: SiteConfig["venues"][number]): string {
  return (
    venue.navigationUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([venue.name, venue.address].filter(Boolean).join(", "))}`
  );
}

export function visibleSections(
  config: SiteConfig,
  variant: SiteConfig["variants"][number],
): Section[] {
  return variant.sections
    .filter((p) => p.visible)
    .map((p) => config.sections.find((s) => s.id === p.sectionId)!)
    .filter(Boolean);
}

const siteUuidSchema = z.uuid();

/** Returns the relative guest entry path (`/s/<siteIdOrSlug>`) for a Site. */
export function publicSitePath(siteIdOrSlug: string): string {
  return `/s/${siteIdOrSlug}`;
}

/** Resolves the absolute public Site URL against `baseUrl` (`SITE_URL`). */
export function publicSiteUrl(siteIdOrSlug: string, baseUrl: string): string {
  return new URL(publicSitePath(siteIdOrSlug), baseUrl).href;
}

/** Returns the relative household Invitation link path (`/i/<token>`). */
export function invitationTokenPath(token: string): string {
  return `/i/${token}`;
}

/** Resolves the absolute household Invitation URL against `baseUrl` (`SITE_URL`). */
export function invitationTokenUrl(token: string, baseUrl: string): string {
  return new URL(invitationTokenPath(token), baseUrl).href;
}

/** Checks whether a `/s/<key>` route key is a canonical Site UUID (`sites.id`) rather than a legacy `public_slug`. */
export function isSiteUuidKey(key: string): boolean {
  return siteUuidSchema.safeParse(key).success;
}
