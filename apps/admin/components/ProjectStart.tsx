"use client";
import { useState } from "react";
import { Button, TextInput } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";
import type { TemplateId } from "@invitations/domain/templates";
import type { InvitationLocale } from "@invitations/domain";
import { invitationLocaleFor, usePanelI18n } from "../lib/i18n";
import { TemplateDialog } from "./TemplateDialog";
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
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [chosenLocale, setLocale] = useState<InvitationLocale | null>(null);
  const locale = chosenLocale || invitationLocaleFor(language);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function create() {
    if (!templateId || !name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onCreate({ name: name.trim(), templateId, locale });
      // Keep the dialog pending until the new editor replaces this screen.
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        leftSection={<PlusIcon size={20} />}
        onClick={() => {
          setName("");
          setTemplateId(null);
          setLocale(null);
          setError("");
          setOpened(true);
        }}
      >
        {t("createSite")}
      </Button>
      <TemplateDialog
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          language === "pl"
            ? "Wybierz szablon na początek"
            : language === "en"
              ? "Choose a starting template"
              : "Wähle eine Startvorlage"
        }
        templateId={templateId}
        locale={locale}
        onTemplate={setTemplateId}
        onLocale={setLocale}
        onSubmit={() => void create()}
        submitLabel={t("createSite")}
        busy={busy}
        error={error}
        disabled={!name.trim()}
      >
        <TextInput
          label={t("siteName")}
          value={name}
          maxLength={200}
          required
          data-autofocus
          onChange={(e) => setName(e.currentTarget.value)}
          disabled={busy}
        />
      </TemplateDialog>
    </>
  );
}
