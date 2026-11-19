"use client";

import { Group, Select } from "@mantine/core";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";
import { LanguageFlag } from "./LanguageFlag";

export function LanguageSelect({ showLabel = true }: { showLabel?: boolean }) {
  const { language, setLanguage, t } = usePanelI18n();
  return (
    <Select
      aria-label={t("language")}
      label={showLabel ? t("language") : undefined}
      w={showLabel ? undefined : 136}
      data={[
        { value: "pl", label: "Polski" },
        { value: "en", label: "English" },
        { value: "de", label: "Deutsch" },
      ]}
      value={language}
      leftSection={<LanguageFlag language={language} />}
      leftSectionPointerEvents="none"
      renderOption={({ option }) => (
        <Group gap="xs" wrap="nowrap">
          <LanguageFlag language={option.value as PanelLanguage} />
          <span>{option.label}</span>
        </Group>
      )}
      allowDeselect={false}
      onChange={(value) => {
        if (value) setLanguage(value as PanelLanguage);
      }}
    />
  );
}
