"use client";
import {
  themes,
  themeNames,
  type SiteConfig,
  type ThemeDesign,
  type ThemeName,
} from "@invitations/domain";
import { SimpleGrid, Stack, Switch, Select, Text } from "@mantine/core";
import { styled } from "styled-components";
import { usePanelI18n } from "../lib/i18n";

const Choice = styled.button`
  padding: 8px;
  text-align: left;
  cursor: pointer;
  background: white;
  color: #242b59;
  border: 2px solid #d9dfec;
  border-radius: 12px;
  min-width: 0;
  font: inherit;
  &[aria-pressed="true"] {
    border-color: #3d518b;
    box-shadow: 0 0 0 1px #3d518b;
  }
  &:focus-visible {
    outline: 3px solid #3d518b;
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
    border-style: double;
    border-width: 3px;
  }
  &[data-theme="botanical"] .mini-photo {
    border-radius: 50% 50% 4px 4px;
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
    border: 1px solid ${({ $design: d }) => d.accent};
    justify-content: center;
    padding: 12px;
  }
  &[data-theme="evening"] .mini-photo {
    display: none;
  }
  &[data-theme="celebration"] .mini-photo {
    transform: rotate(-7deg);
    border: 5px solid white;
    border-bottom-width: 12px;
  }
`;
export function ThemePreview({
  theme,
  design = themes[theme].design,
  title = "Aa & Aa",
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
  const text =
    language === "pl"
      ? {
          title: "Motyw strony",
          icons: "Ikony modułów",
          decorations: "Dekoracje",
          levels: ["Brak", "Subtelne", "Pełne"],
          hint: "Zmiana motywu ustawia kolory i oprawę. Treść pozostaje bez zmian.",
        }
      : language === "en"
        ? {
            title: "Page theme",
            icons: "Section icons",
            decorations: "Decorations",
            levels: ["None", "Subtle", "Full"],
            hint: "Changing the theme applies its colors and styling. Your content is preserved.",
          }
        : {
            title: "Seitenmotiv",
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
            onClick={() =>
              onChange({
                ...config,
                theme,
                design: { ...themes[theme].design },
                appearance: { ...themes[theme].appearance },
                hero: { ...config.hero, layout: themes[theme].layout },
              })
            }
          >
            <ThemePreview theme={theme} />
            <Text component="span" size="sm" fw={600}>
              {themes[theme].labels[language]}
            </Text>
          </Choice>
        ))}
      </SimpleGrid>
      <Text size="sm" c="dimmed">
        {text.hint}
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
