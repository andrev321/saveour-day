"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { TemplateId } from "@invitations/domain/templates";
import type { InvitationLocale } from "@invitations/domain";
import { invitationLocaleFor, usePanelI18n } from "../lib/i18n";
import { TemplatePicker } from "./TemplatePicker";
export type ProjectStartValues = {
  name: string;
  templateId: TemplateId;
  locale: InvitationLocale;
};
export function ProjectStart({
  onCreate,
}: {
  onCreate: (values: ProjectStartValues) => Promise<void> | void;
}) {
  const { language, t } = usePanelI18n();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [chosenLocale, setLocale] = useState<InvitationLocale | null>(null);
  const locale = chosenLocale || invitationLocaleFor(language);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Card withBorder>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!templateId || !name.trim() || busy) return;
          setBusy(true);
          setError("");
          try {
            await onCreate({ name: name.trim(), templateId, locale });
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Nie udało się utworzyć zaproszenia",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Stack>
          <Title order={2}>
            {language === "pl"
              ? "Wybierz szablon na początek"
              : language === "en"
                ? "Choose a starting template"
                : "Wähle eine Startvorlage"}
          </Title>
          <Text c="dimmed">
            {language === "pl"
              ? "Zacznij od gotowego szablonu albo wybierz puste zaproszenie. Następnie otworzymy konfigurator."
              : language === "en"
                ? "Start with a template or choose a blank invitation. Then continue to the editor."
                : "Beginne mit einer Vorlage oder einer leeren Einladung. Danach öffnet sich der Editor."}
          </Text>
          <TextInput
            label={t("siteName")}
            value={name}
            maxLength={200}
            required
            onChange={(e) => setName(e.currentTarget.value)}
            disabled={busy}
          />
          <TemplatePicker
            templateId={templateId}
            locale={locale}
            onTemplate={setTemplateId}
            onLocale={setLocale}
            disabled={busy}
          />
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            disabled={!name.trim() || !templateId}
            loading={busy}
          >
            {t("createSite")}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
