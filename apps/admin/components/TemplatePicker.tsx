"use client";
import { Group, Select, Stack, Text } from "@mantine/core";
import {
  templateCatalog,
  type TemplateId,
} from "@invitations/domain/templates";
import { invitationLocales, type InvitationLocale } from "@invitations/domain";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";
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
      <Text size="sm" c="dimmed">
        {catalog.find((t) => t.id === templateId)?.description}
      </Text>
    </Stack>
  );
}
