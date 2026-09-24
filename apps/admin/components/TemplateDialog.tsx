"use client";
import type { ReactNode } from "react";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import type { InvitationLocale } from "@invitations/domain";
import type { TemplateId } from "@invitations/domain/templates";
import { TemplatePicker } from "./TemplatePicker";
import { usePanelI18n } from "../lib/i18n";
import { templateUi } from "../lib/template-i18n";

export function TemplateDialog({
  opened,
  onClose,
  title,
  templateId,
  locale,
  onTemplate,
  onLocale,
  onSubmit,
  submitLabel,
  busy = false,
  error,
  reset = false,
  disabled = false,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  templateId: TemplateId | null;
  locale: InvitationLocale;
  onTemplate: (id: TemplateId) => void;
  onLocale: (locale: InvitationLocale) => void;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  error?: string;
  reset?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const { language } = usePanelI18n();
  const tt = templateUi[language];
  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      size="lg"
      centered
      closeOnClickOutside={!busy}
      closeOnEscape={!busy}
      withCloseButton={!busy}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !disabled && templateId) onSubmit();
        }}
      >
        <Stack>
          {children}
          <TemplatePicker
            templateId={templateId}
            locale={locale}
            onTemplate={onTemplate}
            onLocale={onLocale}
            disabled={busy}
          />
          {reset && (
            <>
              <Alert color="orange">{tt.warning}</Alert>
              <Text size="sm" c="dimmed">
                {tt.retained}
              </Text>
            </>
          )}
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" disabled={busy} onClick={onClose}>
              {tt.cancel}
            </Button>
            <Button
              type="submit"
              color={reset ? "orange" : undefined}
              disabled={disabled || !templateId}
              loading={busy}
            >
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
