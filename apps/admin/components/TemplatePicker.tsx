"use client";
import { Group, Select, Stack, Text } from "@mantine/core";
import {
  templateCatalog,
  type TemplateId,
} from "@invitations/domain/templates";
import {
  themes,
  invitationLocales,
  type InvitationLocale,
} from "@invitations/domain";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";
import { ThemePreview } from "./ThemePicker";
import { LanguageFlag } from "./LanguageFlag";
export function TemplatePicker({
  templateId,
  locale,
  onTemplate,
  onLocale,
  disabled = false,
}: {
  templateId: TemplateId | null;
  disabled?: boolean;
  locale: InvitationLocale;
  onTemplate: (id: TemplateId) => void;
  onLocale: (locale: InvitationLocale) => void;
}) {
  const { language } = usePanelI18n();
  const catalog = templateCatalog(locale);
  const selected = catalog.find((t) => t.id === templateId);
  return (
    <Stack gap="xs">
      <Select
        label={
          language === "pl"
            ? "Szablon startowy"
            : language === "en"
              ? "Starting template"
              : "Startvorlage"
        }
        value={templateId}
        disabled={disabled}
        placeholder={
          language === "pl"
            ? "Wybierz szablon lub puste zaproszenie"
            : language === "en"
              ? "Choose a template or blank invitation"
              : "Vorlage oder leere Einladung wählen"
        }
        data={catalog.map((t) => ({ value: t.id, label: t.label }))}
        allowDeselect={false}
        onChange={(value) => value && onTemplate(value as TemplateId)}
      />
      <Select
        label={
          language === "pl"
            ? "Język treści szablonu"
            : language === "en"
              ? "Template content language"
              : "Sprache der Vorlage"
        }
        value={locale}
        leftSection={
          <LanguageFlag language={locale.slice(0, 2) as PanelLanguage} />
        }
        leftSectionPointerEvents="none"
        renderOption={({ option }) => (
          <Group gap="xs" wrap="nowrap">
            <LanguageFlag
              language={option.value.slice(0, 2) as PanelLanguage}
            />
            <span>{option.label}</span>
          </Group>
        )}
        disabled={disabled}
        data={invitationLocales.map((value, i) => ({
          value,
          label: ["Polski", "English", "Deutsch"][i],
        }))}
        allowDeselect={false}
        onChange={(value) => value && onLocale(value as InvitationLocale)}
      />
      {selected && (
        <div>
          <ThemePreview
            theme={selected.style.theme}
            design={selected.style.design}
            title={selected.label}
          />
          <Text size="sm" fw={600}>
            {themes[selected.style.theme].name} ·{" "}
            {themes[selected.style.theme].labels[language]}
          </Text>
        </div>
      )}
      <Text size="sm" c="dimmed">
        {selected?.description}
      </Text>
    </Stack>
  );
}
