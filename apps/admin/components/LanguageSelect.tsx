"use client";

import { Select } from "@mantine/core";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";

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
      allowDeselect={false}
      onChange={(value) => {
        if (value) setLanguage(value as PanelLanguage);
      }}
    />
  );
}
