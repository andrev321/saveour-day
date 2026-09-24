"use client";

import { Group, Select } from "@mantine/core";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";
import { LanguageFlag } from "./LanguageFlag";

export function LanguageSelect() {
  const { language, setLanguage, t } = usePanelI18n();
  return (
    <Select
      aria-label={t("language")}
      label={t("language")}
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
