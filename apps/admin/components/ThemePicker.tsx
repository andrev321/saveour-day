"use client";
import {
  themes,
  themeNames,
  themePalettes,
  matchingThemePalette,
  applyTheme,
  applyThemePalette,
  type SiteConfig,
  type ThemeDesign,
  type ThemeName,
} from "@invitations/domain";
import {
  SimpleGrid,
  Stack,
  Switch,
  Select,
  Text,
  Group,
  Badge,
} from "@mantine/core";
import { styled } from "styled-components";
import { usePanelI18n } from "../lib/i18n";

const Choice = styled.button`
  padding: 8px;
  text-align: left;
  cursor: pointer;
  background: var(--panel-surface);
  color: var(--panel-text);
  border: 2px solid var(--panel-choice-border);
  border-radius: 12px;
  min-width: 0;
  font: inherit;
  &[aria-pressed="true"] {
    border-color: var(--panel-accent);
    box-shadow: 0 0 0 1px var(--panel-accent);
  }
  &:focus-visible {
    outline: 3px solid var(--panel-accent);
    outline-offset: 3px;
  }
`;
const Miniature = styled.div<{ $theme: ThemeName; $design: ThemeDesign }>`
  height: 150px;
  overflow: hidden;
  padding: 18px;
  margin-bottom: 8px;
  background: ${({ $design: d }) => d.paper};
  color: ${({ $design: d }) => d.ink};
  font-family: ${({ $theme }) => themes[$theme].headingFont};
  .mini-hero {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-bottom: 16px;
    flex-direction: row-reverse;
  }
  .mini-photo {
    width: 40%;
    height: 65px;
    flex-shrink: 0;
    background: ${({ $design: d }) => `linear-gradient(135deg, ${d.accent}55, ${d.accent}18)`};
  }
  .mini-title {
    font-size: 23px;
    line-height: 1.1;
  }
  .mini-modules {
    display: flex;
    gap: 8px;
  }
  .mini-module {
    flex: 1;
    height: 32px;
    background: ${({ $design: d }) => d.surface};
    border: 1px solid ${({ $design: d }) => `${d.accent}55`};
    border-radius: ${({ $theme }) => themes[$theme].radius};
  }
  &[data-theme="classic"] .mini-hero {
    justify-content: center;
    text-align: center;
  }
  &[data-theme="classic"] .mini-photo {
    display: none;
  }
  &[data-theme="classic"] .mini-module {
    background: transparent;
    border: 0;
    border-top: 1px solid currentColor;
  }
  &[data-theme="botanical"] .mini-photo {
    border-radius: 0 28px 0 0;
  }
  &[data-theme="editorial"] .mini-title {
    font-weight: 600;
    letter-spacing: -1px;
  }
  &[data-theme="editorial"] .mini-module {
    background: transparent;
    border: 0;
    border-top: 1px solid currentColor;
  }
  &[data-theme="evening"] .mini-hero {
    background: ${({ $design: d }) => d.surface};
    justify-content: flex-end;
    align-items: flex-end;
    min-height: 85px;
    padding: 14px;
  }
  &[data-theme="evening"] .mini-photo {
    display: none;
  }
  &[data-theme="celebration"] .mini-photo {
    background: ${({ $design: d }) => d.surface};
    border: 8px solid ${({ $design: d }) => d.surface};
    height: 90px;
  }
  &[data-theme="editorial"] .mini-modules {
    background: ${({ $design: d }) => d.accent};
    height: 15px;
  }
  &[data-theme="editorial"] .mini-module {
    display: none;
  }
  .mini-title {
    overflow-wrap: anywhere;
    min-width: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;
const PaletteChoice = styled(Choice)`
  padding: 12px;
  border-width: 1px;
  border-radius: 8px;
  &[aria-pressed="true"] {
    background: var(--panel-choice-selected);
  }
`;
const Swatches = styled.div`
  display: flex;
  height: 28px;
  overflow: hidden;
  border: 1px solid #00000020;
  border-radius: 3px;
  margin-bottom: 8px;
  > span {
    flex: 1;
  }
`;
export function ThemePreview({
  theme,
  design = themes[theme].design,
  title = "Aa",
}: {
  theme: ThemeName;
  design?: ThemeDesign;
  title?: string;
}) {
  return (
    <Miniature
      $theme={theme}
      $design={design}
      data-theme={theme}
      aria-hidden="true"
    >
      <div className="mini-hero">
        <div className="mini-photo" />
        <div className="mini-title">{title}</div>
      </div>
      <div className="mini-modules">
        <div className="mini-module" />
        <div className="mini-module" />
      </div>
    </Miniature>
  );
}
export function ThemePicker({
  config,
  onChange,
}: {
  config: SiteConfig;
  onChange: (config: SiteConfig) => void;
}) {
  const { language } = usePanelI18n();
  const selectedPalette = matchingThemePalette(config.theme, config.design);
  const text =
    language === "pl"
      ? {
          title: "Motyw strony",
          palettes: "Wersja kolorystyczna",
          custom: "Własne kolory",
          preview: "Twoje wydarzenie",
          paletteHint:
            "Paleta zmienia tylko kolory. Możesz je dopasować poniżej — dla dowolnego rodzaju wydarzenia.",
          icons: "Ikony modułów",
          decorations: "Dekoracje",
          levels: ["Brak", "Subtelne", "Pełne"],
          hint: "Zmiana motywu ustawia kolory i oprawę. Treść pozostaje bez zmian.",
        }
      : language === "en"
        ? {
            title: "Page theme",
            palettes: "Colour palette",
            custom: "Custom colours",
            preview: "Your event",
            paletteHint:
              "A palette changes colours only. Adjust them below for any kind of event.",
            icons: "Section icons",
            decorations: "Decorations",
            levels: ["None", "Subtle", "Full"],
            hint: "Changing the theme applies its colors and styling. Your content is preserved.",
          }
        : {
            title: "Seitenmotiv",
            palettes: "Farbpalette",
            custom: "Eigene Farben",
            preview: "Dein Event",
            paletteHint:
              "Eine Palette ändert nur die Farben. Passe sie unten an jeden Anlass an.",
            icons: "Abschnittssymbole",
            decorations: "Dekorationen",
            levels: ["Keine", "Dezent", "Voll"],
            hint: "Das Motiv bestimmt Farben und Gestaltung. Inhalte bleiben erhalten.",
          };
  return (
    <Stack>
      <Text fw={600}>{text.title}</Text>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {themeNames.map((theme) => (
          <Choice
            key={theme}
            type="button"
            aria-pressed={config.theme === theme}
            aria-label={themes[theme].labels[language]}
            onClick={() => onChange(applyTheme(config, theme))}
          >
            <ThemePreview
              theme={theme}
              design={config.theme === theme ? config.design : undefined}
              title={config.identity.displayName || text.preview}
            />
            <Text component="span" size="sm" fw={600}>
              {themes[theme].name}
            </Text>
            <Text size="xs" c="dimmed">
              {themes[theme].labels[language]}
            </Text>
          </Choice>
        ))}
      </SimpleGrid>
      <Text size="sm" c="dimmed">
        {text.hint}
      </Text>
      <Text size="sm">{themes[config.theme].description[language]}</Text>
      <Group justify="space-between">
        <Text fw={600}>{text.palettes}</Text>
        <Badge variant="light" data-ui="selected-palette">
          {selectedPalette?.labels[language] ?? text.custom}
        </Badge>
      </Group>
      <SimpleGrid
        cols={{ base: 2, sm: 2 }}
        role="group"
        aria-label={text.palettes}
      >
        {themePalettes[config.theme].map((palette) => (
          <PaletteChoice
            key={palette.id}
            type="button"
            aria-label={palette.labels[language]}
            aria-pressed={selectedPalette?.id === palette.id}
            onClick={() => onChange(applyThemePalette(config, palette.id))}
          >
            <Swatches aria-hidden="true">
              {Object.entries(palette.design).map(([key, color]) => (
                <span key={key} style={{ backgroundColor: color }} />
              ))}
            </Swatches>
            <Text component="span" size="xs" fw={600}>
              {palette.labels[language]}
            </Text>
          </PaletteChoice>
        ))}
      </SimpleGrid>
      <Text size="xs" c="dimmed">
        {text.paletteHint}
      </Text>
      <Switch
        label={text.icons}
        checked={config.appearance.icons}
        onChange={(e) =>
          onChange({
            ...config,
            appearance: {
              ...config.appearance,
              icons: e.currentTarget.checked,
            },
          })
        }
      />
      <Select
        label={text.decorations}
        allowDeselect={false}
        value={config.appearance.decorations}
        data={["none", "subtle", "full"].map((value, i) => ({
          value,
          label: text.levels[i],
        }))}
        onChange={(value) =>
          value &&
          onChange({
            ...config,
            appearance: {
              ...config.appearance,
              decorations: value as SiteConfig["appearance"]["decorations"],
            },
          })
        }
      />
    </Stack>
  );
}
