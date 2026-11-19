"use client";

import { ActionIcon, Group, Menu, useMantineColorScheme } from "@mantine/core";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { usePanelI18n } from "../lib/i18n";
import { LanguageSelect } from "./LanguageSelect";

const copy = {
  pl: {
    appearance: "Wygląd panelu",
    light: "Jasny",
    dark: "Ciemny",
    auto: "Systemowy",
  },
  en: {
    appearance: "Panel appearance",
    light: "Light",
    dark: "Dark",
    auto: "System",
  },
  de: {
    appearance: "Darstellung",
    light: "Hell",
    dark: "Dunkel",
    auto: "System",
  },
};

export function PanelPreferences({ compact = false }: { compact?: boolean }) {
  const { language } = usePanelI18n();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const text = copy[language];
  return (
    <Group
      gap="xs"
      wrap="nowrap"
      align={compact ? "center" : "end"}
      data-ui="panel-preferences"
      data-compact={compact ? "true" : undefined}
      onClick={(event) => event.stopPropagation()}
    >
      <LanguageSelect showLabel={!compact} />
      <Menu position="bottom-end" withinPortal={false}>
        <Menu.Target>
          <ActionIcon
            variant={compact ? "default" : "subtle"}
            size={compact ? 36 : "md"}
            aria-label={text.appearance}
            title={text.appearance}
          >
            <SunIcon size={20} className="panel-light-icon" />
            <MoonIcon size={20} className="panel-dark-icon" />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{text.appearance}</Menu.Label>
          {(
            [
              ["light", SunIcon],
              ["dark", MoonIcon],
              ["auto", DesktopIcon],
            ] as const
          ).map(([value, Icon]) => (
            <Menu.RadioItem
              key={value}
              value={value}
              checked={colorScheme === value}
              rightSection={<Icon size={18} />}
              onChange={() => setColorScheme(value)}
              closeMenuOnClick
            >
              {text[value]}
            </Menu.RadioItem>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
}
