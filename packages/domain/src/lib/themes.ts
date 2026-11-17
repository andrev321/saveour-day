import type { SiteConfig } from "../index.ts";

// Stable IDs preserve existing drafts, published invitations and API payloads.
export const themeNames = [
  "classic",
  "botanical",
  "editorial",
  "evening",
  "celebration",
] as const;
export type ThemeName = (typeof themeNames)[number];
export type ThemeDesign = {
  paper: string;
  surface: string;
  ink: string;
  accent: string;
};
export type ThemeAppearance = {
  icons: boolean;
  decorations: "none" | "subtle" | "full";
};
type Labels = { pl: string; en: string; de: string };
export type ThemePalette = { id: string; labels: Labels; design: ThemeDesign };
type ThemeDefinition = {
  name: string;
  labels: Labels;
  description: Labels;
  design: ThemeDesign;
  headingFont: string;
  bodyFont: string;
  radius: string;
  layout: "split" | "overlay";
  appearance: ThemeAppearance;
};
function palette(
  id: string,
  pl: string,
  en: string,
  de: string,
  paper: string,
  surface: string,
  ink: string,
  accent: string,
): ThemePalette {
  return {
    id,
    labels: { pl, en, de },
    design: { paper, surface, ink, accent },
  };
}
/** Curated palettes work independently of the event category. */
export const themePalettes: Record<ThemeName, readonly ThemePalette[]> = {
  classic: [
    palette(
      "porcelain",
      "Porcelana i wino",
      "Porcelain & wine",
      "Porzellan & Wein",
      "#f8f5ef",
      "#efebe4",
      "#4b292b",
      "#75474a",
    ),
    palette(
      "champagne",
      "Szampan",
      "Champagne",
      "Champagner",
      "#f7f2e8",
      "#eee5d4",
      "#3f3428",
      "#7a5831",
    ),
    palette(
      "graphite",
      "Grafit",
      "Graphite",
      "Graphit",
      "#f4f3f0",
      "#e8e8e3",
      "#272c2c",
      "#525d5a",
    ),
    palette(
      "midnight",
      "Atrament",
      "Ink",
      "Tinte",
      "#242833",
      "#303644",
      "#f6f0e5",
      "#d4bc91",
    ),
  ],
  botanical: [
    palette(
      "olive",
      "Oliwka",
      "Olive",
      "Olive",
      "#f1f0e5",
      "#e5e9da",
      "#304939",
      "#526844",
    ),
    palette(
      "sage",
      "Szałwia",
      "Sage",
      "Salbei",
      "#f2f5ef",
      "#e1e9dc",
      "#30473b",
      "#4d6652",
    ),
    palette(
      "terracotta",
      "Terakota",
      "Terracotta",
      "Terrakotta",
      "#fbf1e7",
      "#f0dfd1",
      "#503c31",
      "#8b4e36",
    ),
    palette(
      "forest",
      "Leśna zieleń",
      "Forest",
      "Waldgrün",
      "#1d392d",
      "#274636",
      "#ecebdc",
      "#b7c69a",
    ),
  ],
  editorial: [
    palette(
      "cobalt",
      "Kobalt",
      "Cobalt",
      "Kobalt",
      "#f4f5f0",
      "#e7eae5",
      "#242823",
      "#253e8d",
    ),
    palette(
      "graphite",
      "Monochrom",
      "Monochrome",
      "Monochrom",
      "#f5f4f1",
      "#e5e4e0",
      "#252525",
      "#474747",
    ),
    palette(
      "moss",
      "Mech",
      "Moss",
      "Moos",
      "#f3f2e9",
      "#e5e7d7",
      "#293d2e",
      "#4e653d",
    ),
    palette(
      "midnight",
      "Nocny błękit",
      "Night blue",
      "Nachtblau",
      "#171d2d",
      "#232c40",
      "#eff2f5",
      "#a7bff0",
    ),
  ],
  evening: [
    palette(
      "midnight",
      "Północ",
      "Midnight",
      "Mitternacht",
      "#141b21",
      "#20292f",
      "#f4ebda",
      "#cab48d",
    ),
    palette(
      "champagne",
      "Espresso i szampan",
      "Espresso & champagne",
      "Espresso & Champagner",
      "#2a2624",
      "#3b3430",
      "#ebdec4",
      "#cfb58d",
    ),
    palette(
      "emerald",
      "Szmaragd",
      "Emerald",
      "Smaragd",
      "#122b28",
      "#1e3b34",
      "#f1eee1",
      "#c6c998",
    ),
    palette(
      "pearl",
      "Perła",
      "Pearl",
      "Perle",
      "#f4f0e9",
      "#e8e2d7",
      "#282c32",
      "#685232",
    ),
  ],
  celebration: [
    palette(
      "rose",
      "Róż i śliwka",
      "Rose & plum",
      "Rosé & Pflaume",
      "#f1dfe1",
      "#e2d8e2",
      "#553142",
      "#734658",
    ),
    palette(
      "apricot",
      "Morela",
      "Apricot",
      "Aprikose",
      "#fbebdf",
      "#f0d9c7",
      "#663c32",
      "#8d493b",
    ),
    palette(
      "lavender",
      "Lawenda",
      "Lavender",
      "Lavendel",
      "#eeebf7",
      "#dcd9ec",
      "#3c3659",
      "#615189",
    ),
    palette(
      "ocean",
      "Morski",
      "Ocean",
      "Meer",
      "#e7f0f1",
      "#d2e4e4",
      "#24464d",
      "#326675",
    ),
  ],
};
export const themes: Record<ThemeName, ThemeDefinition> = {
  classic: {
    name: "The Modern Vow",
    labels: {
      pl: "Klasyczna elegancja",
      en: "Classic elegance",
      de: "Klassische Eleganz",
    },
    description: {
      pl: "Typografia i spokojna symetria. Na uroczystości, jubileusze i eleganckie spotkania.",
      en: "Typography and quiet symmetry. For ceremonies, anniversaries and elegant gatherings.",
      de: "Typografie und ruhige Symmetrie. Für Feiern, Jubiläen und elegante Treffen.",
    },
    design: themePalettes.classic[0].design,
    headingFont: '"Bodoni Moda", Georgia, serif',
    bodyFont: '"DM Sans", sans-serif',
    radius: "0",
    layout: "split",
    appearance: { icons: false, decorations: "subtle" },
  },
  botanical: {
    name: "Olive Atelier",
    labels: {
      pl: "Botaniczny ogród",
      en: "Botanical garden",
      de: "Botanischer Garten",
    },
    description: {
      pl: "Naturalna lekkość i botaniczny detal. Na plener, spotkania rodzinne i warsztaty.",
      en: "Natural lightness and botanical details. For outdoor parties, family gatherings and workshops.",
      de: "Natürliche Leichtigkeit und botanische Details. Für Gartenfeste, Familientreffen und Workshops.",
    },
    design: themePalettes.botanical[0].design,
    headingFont: '"Cormorant Garamond", Georgia, serif',
    bodyFont: '"DM Sans", sans-serif',
    radius: "2px",
    layout: "split",
    appearance: { icons: false, decorations: "subtle" },
  },
  editorial: {
    name: "Gallery 12",
    labels: {
      pl: "Nowoczesny editorial",
      en: "Modern editorial",
      de: "Modernes Editorial",
    },
    description: {
      pl: "Graficzny układ, mocne litery i kolor. Na wydarzenia firmowe, premiery i przyjęcia.",
      en: "Graphic layouts, bold type and colour. For company events, launches and celebrations.",
      de: "Grafische Gestaltung, starke Schrift und Farbe. Für Firmenevents, Premieren und Feiern.",
    },
    design: themePalettes.editorial[0].design,
    headingFont: '"DM Sans", sans-serif',
    bodyFont: '"DM Sans", sans-serif',
    radius: "0",
    layout: "split",
    appearance: { icons: false, decorations: "none" },
  },
  evening: {
    name: "Midnight Cinema",
    labels: { pl: "Wieczorowy blask", en: "Evening glow", de: "Abendglanz" },
    description: {
      pl: "Filmowy kadr i subtelny blask. Na gale, kolacje, jubileusze i wieczorne przyjęcia.",
      en: "Cinematic framing and a subtle glow. For galas, dinners, anniversaries and evening parties.",
      de: "Filmische Bilder und dezenter Glanz. Für Galas, Dinner, Jubiläen und Abendveranstaltungen.",
    },
    design: themePalettes.evening[0].design,
    headingFont: '"Bodoni Moda", Georgia, serif',
    bodyFont: '"DM Sans", sans-serif',
    radius: "2px",
    layout: "overlay",
    appearance: { icons: false, decorations: "none" },
  },
  celebration: {
    name: "Modern Muse",
    labels: {
      pl: "Radosne świętowanie",
      en: "Joyful celebration",
      de: "Fröhliches Feiern",
    },
    description: {
      pl: "Miękka typografia i pola koloru. Na urodziny, rocznice i osobiste okazje.",
      en: "Soft typography and colour blocks. For birthdays, anniversaries and personal occasions.",
      de: "Weiche Typografie und Farbflächen. Für Geburtstage, Jubiläen und persönliche Anlässe.",
    },
    design: themePalettes.celebration[0].design,
    headingFont: "Fraunces, Georgia, serif",
    bodyFont: '"DM Sans", sans-serif',
    radius: "2px",
    layout: "split",
    appearance: { icons: false, decorations: "subtle" },
  },
};
export const themeDesigns = Object.fromEntries(
  themeNames.map((id) => [id, themes[id].design]),
) as Record<ThemeName, ThemeDesign>;

/** Infer presets from persisted colors: no palette metadata can become stale after custom edits. */
export function matchingThemePalette(theme: ThemeName, design: ThemeDesign) {
  return themePalettes[theme].find((preset) =>
    (Object.keys(preset.design) as (keyof ThemeDesign)[]).every(
      (key) => preset.design[key].toLowerCase() === design[key].toLowerCase(),
    ),
  );
}
export function applyTheme(config: SiteConfig, theme: ThemeName): SiteConfig {
  if (config.theme === theme) return config;
  const preset = themes[theme];
  return {
    ...config,
    theme,
    design: { ...preset.design },
    appearance: { ...preset.appearance },
    hero: { ...config.hero, layout: preset.layout },
  };
}
export function applyThemePalette(config: SiteConfig, id: string): SiteConfig {
  const preset = themePalettes[config.theme].find((item) => item.id === id);
  if (!preset)
    throw new Error("Unknown palette for " + config.theme + ": " + id);
  return { ...config, design: { ...preset.design } };
}
