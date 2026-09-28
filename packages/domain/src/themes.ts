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
type ThemeDefinition = {
  labels: { pl: string; en: string; de: string };
  design: ThemeDesign;
  headingFont: string;
  bodyFont: string;
  radius: string;
  layout: "split" | "overlay";
  appearance: ThemeAppearance;
};
export const themes: Record<ThemeName, ThemeDefinition> = {
  classic: {
    labels: {
      pl: "Klasyczna elegancja",
      en: "Classic elegance",
      de: "Klassische Eleganz",
    },
    design: {
      paper: "#faf7f1",
      surface: "#fffdfb",
      ink: "#34322d",
      accent: "#6c501b",
    },
    headingFont: '"Playfair Display", Georgia, serif',
    bodyFont: "Inter, sans-serif",
    radius: "0",
    layout: "split",
    appearance: { icons: false, decorations: "subtle" },
  },
  botanical: {
    labels: {
      pl: "Botaniczny ogród",
      en: "Botanical garden",
      de: "Botanischer Garten",
    },
    design: {
      paper: "#f3f5ed",
      surface: "#fcfdf9",
      ink: "#293a2d",
      accent: "#486039",
    },
    headingFont: '"Cormorant Garamond", Georgia, serif',
    bodyFont: "Inter, sans-serif",
    radius: "28px",
    layout: "split",
    appearance: { icons: true, decorations: "subtle" },
  },
  editorial: {
    labels: {
      pl: "Nowoczesny editorial",
      en: "Modern editorial",
      de: "Modernes Editorial",
    },
    design: {
      paper: "#f7f7f4",
      surface: "#ffffff",
      ink: "#222625",
      accent: "#2948a6",
    },
    headingFont: '"DM Sans", sans-serif',
    bodyFont: '"DM Sans", sans-serif',
    radius: "0",
    layout: "split",
    appearance: { icons: false, decorations: "none" },
  },
  evening: {
    labels: { pl: "Wieczorowy blask", en: "Evening glow", de: "Abendglanz" },
    design: {
      paper: "#191e30",
      surface: "#232a40",
      ink: "#f7f1e7",
      accent: "#dfc18c",
    },
    headingFont: '"Bodoni Moda", Georgia, serif',
    bodyFont: "Inter, sans-serif",
    radius: "2px",
    layout: "overlay",
    appearance: { icons: true, decorations: "subtle" },
  },
  celebration: {
    labels: {
      pl: "Radosne świętowanie",
      en: "Joyful celebration",
      de: "Fröhliches Feiern",
    },
    design: {
      paper: "#fff1e8",
      surface: "#fffaf5",
      ink: "#33304a",
      accent: "#3449a0",
    },
    headingFont: "Fraunces, Georgia, serif",
    bodyFont: '"Nunito Sans", sans-serif',
    radius: "32px",
    layout: "split",
    appearance: { icons: true, decorations: "full" },
  },
};
export const themeDesigns = Object.fromEntries(
  themeNames.map((id) => [id, themes[id].design]),
) as Record<ThemeName, ThemeDesign>;
