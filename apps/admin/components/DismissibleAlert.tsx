"use client";

import { Alert, type AlertProps } from "@mantine/core";
import { useState } from "react";
import { usePanelI18n } from "../lib/i18n";

export function DismissibleAlert({ onClose, ...props }: AlertProps) {
  const [dismissed, setDismissed] = useState(false);
  const { language } = usePanelI18n();
  if (dismissed) return null;
  return (
    <Alert
      {...props}
      withCloseButton
      closeButtonLabel={
        language === "pl"
          ? "Zamknij powiadomienie"
          : language === "en"
            ? "Dismiss notification"
            : "Benachrichtigung schließen"
      }
      onClose={() => {
        setDismissed(true);
        onClose?.();
      }}
    />
  );
}
