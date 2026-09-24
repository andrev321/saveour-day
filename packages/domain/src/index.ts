import { z } from "zod";

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
export type ThemeName = "ivory" | "sage" | "wine";
export type InvitationLocale = "pl-PL" | "en-GB" | "de-DE";
export const invitationLocales = ["pl-PL", "en-GB", "de-DE"] as const;
export type ThemeDesign = {
  paper: string;
  surface: string;
  ink: string;
  accent: string;
};
export const themeDesigns: Record<ThemeName, ThemeDesign> = {
  ivory: {
    paper: "#faf7f1",
    surface: "#fffdfb",
    ink: "#34322d",
    accent: "#6c501b",
  },
  sage: {
    paper: "#f5f7f1",
    surface: "#fcfdf9",
    ink: "#2f3a2c",
    accent: "#3b5025",
  },
  wine: {
    paper: "#fbf5f5",
    surface: "#fffafb",
    ink: "#3d2a2e",
    accent: "#773044",
  },
} as const;
const designSchema = z
  .object({
    paper: hexColor,
    surface: hexColor,
    ink: hexColor,
    accent: hexColor,
  })
  .strict();
const contrastRatio = (first: string, second: string) => {
  const luminance = (color: string) => {
    const channels = [1, 3, 5].map(
      (offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255,
    );
    const [red, green, blue] = channels.map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
};
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
export const mediaSchema = z
  .object({
    id: idSchema,
    src: imageSource,
    alt: z.string().max(300).default(""),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
    focalX: z.number().min(0).max(100).default(50),
    focalY: z.number().min(0).max(100).default(50),
    mobileFocalX: z.number().min(0).max(100).default(50),
    mobileFocalY: z.number().min(0).max(100).default(50),
    variants: z
      .array(
        z
          .object({ src: imageSource, width: z.number().int().positive() })
          .strict(),
      )
      .max(8)
      .default([]),
  })
  .strict();
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
const sectionSchema = z
  .object({
    id: idSchema,
    type: z.enum(["timeline", "venue", "contact", "text", "gallery"]),
    title: text,
    body: paragraph,
    enabled: z.boolean().default(true),
    venueId: idSchema.optional(),
    mediaIds: z.array(idSchema).max(30).default([]),
  })
  .strict();
const variantSchema = z
  .object({
    id: idSchema,
    slug: idSchema,
    label: text,
    dateLabel: z.string().max(200).default(""),
    eventIds: z.array(idSchema).max(50),
    sectionIds: z.array(idSchema).max(30),
    hiddenEventIds: z.array(idSchema).max(50).optional(),
    hiddenSectionIds: z.array(idSchema).max(30).optional(),
  })
  .strict();
const currentConfigSchema = z
  .object({
    schemaVersion: z.literal(2),
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
        layout: z.enum(["overlay", "split"]),
      })
      .strict(),
    theme: z.enum(["ivory", "sage", "wine"]),
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
    variants: value.variants.map((variant) => ({
      ...variant,
      hiddenEventIds:
        variant.id === value.defaultVariant
          ? []
          : (variant.hiddenEventIds ??
            value.events
              .map((event) => event.id)
              .filter((id) => !variant.eventIds.includes(id))),
      hiddenSectionIds:
        variant.id === value.defaultVariant
          ? []
          : (variant.hiddenSectionIds ??
            value.sections
              .map((section) => section.id)
              .filter((id) => !variant.sectionIds.includes(id))),
      eventIds:
        variant.id === value.defaultVariant
          ? value.events.map((event) => event.id)
          : [
              ...variant.eventIds,
              ...value.events
                .map((event) => event.id)
                .filter((id) => !variant.eventIds.includes(id)),
            ],
      sectionIds:
        variant.id === value.defaultVariant
          ? value.sections.map((section) => section.id)
          : [
              ...variant.sectionIds,
              ...value.sections
                .map((section) => section.id)
                .filter((id) => !variant.sectionIds.includes(id)),
            ],
    })),
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
      collection: "media" | "venues" | "events" | "sections" | "variants",
      id: string | undefined,
      path: (string | number)[],
    ) => {
      if (id && !value[collection].some((item) => item.id === id))
        issue(path, "Odwołanie do nieistniejącego elementu");
    };
    ref("variants", value.defaultVariant, ["defaultVariant"]);
    ref("media", value.hero.mediaId, ["hero", "mediaId"]);
    ref("media", value.hero.mobileMediaId, ["hero", "mobileMediaId"]);
    value.events.forEach((event, i) =>
      ref("venues", event.venueId, ["events", i, "venueId"]),
    );
    value.sections.forEach((section, i) => {
      if (section.type === "venue" && !section.venueId)
        issue(["sections", i, "venueId"], "Sekcja miejsca wymaga lokalizacji");
      ref("venues", section.venueId, ["sections", i, "venueId"]);
      section.mediaIds.forEach((id, j) =>
        ref("media", id, ["sections", i, "mediaIds", j]),
      );
    });
    const slugs = new Set<string>();
    value.variants.forEach((variant, i) => {
      if (slugs.has(variant.slug))
        issue(["variants", i, "slug"], "Powtórzony adres wariantu");
      slugs.add(variant.slug);
      for (const field of [
        "eventIds",
        "sectionIds",
        "hiddenEventIds",
        "hiddenSectionIds",
      ] as const) {
        if (new Set(variant[field]).size !== variant[field].length)
          issue(["variants", i, field], "Powtórzone odwołanie");
        variant[field].forEach((id, j) =>
          ref(
            field === "eventIds" || field === "hiddenEventIds"
              ? "events"
              : "sections",
            id,
            ["variants", i, field, j],
          ),
        );
      }
      for (const [hiddenField, orderedField] of [
        ["hiddenEventIds", "eventIds"],
        ["hiddenSectionIds", "sectionIds"],
      ] as const) {
        variant[hiddenField].forEach((id, j) => {
          if (!variant[orderedField].includes(id))
            issue(
              ["variants", i, hiddenField, j],
              "Ukryty element musi należeć do kolejności strony",
            );
        });
      }
    });
  });
/** Convert historical snapshots without changing their stored representation. */
export function upgradeConfig(input: unknown): unknown {
  if (
    !input ||
    typeof input !== "object" ||
    !("schemaVersion" in input) ||
    input.schemaVersion !== 1
  )
    return input;
  const value = input as Record<string, unknown>;
  const names = z
    .object({ firstName: text, secondName: text })
    .strict()
    .safeParse(value.couple);
  if (!names.success || "identity" in value) return input;
  const { couple: _couple, ...rest } = value;
  void _couple;
  return {
    ...rest,
    schemaVersion: 2,
    identity: {
      displayName: names.data.firstName + " & " + names.data.secondName,
    },
  };
}
export const siteConfigSchema = z.preprocess(
  upgradeConfig,
  currentConfigSchema,
);
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
