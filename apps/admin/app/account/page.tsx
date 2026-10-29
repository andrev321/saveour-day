"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Container,
  PasswordInput,
  Stack,
  Title,
} from "@mantine/core";
import { ActionButton } from "../../components/ActionButton";
import { useOperation } from "@invitations/ui/loading";
import { browserDb } from "../../lib/browser";
import { usePanelI18n } from "../../lib/i18n";
import { BrandLogo } from "@invitations/ui/brand";
import { PanelPreferences } from "../../components/PanelPreferences";
export default function Account() {
  const { t } = usePanelI18n();
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  const { busy, start, end } = useOperation();
  return (
    <Container size="xs" py={80}>
      <Stack>
        <PanelPreferences />
        <BrandLogo height={52} />
        <Title>{t("setPassword")}</Title>
        <PasswordInput
          label={t("newPassword")}
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          autoComplete="new-password"
        />
        <ActionButton
          loading={busy}
          disabled={password.length < 12}
          onClick={async () => {
            if (!start("save")) return;
            setMessage("");
            try {
              const { error } = await browserDb().auth.updateUser({ password });
              setMessage(error ? t("passwordError") : t("passwordSaved"));
            } catch {
              setMessage(t("passwordError"));
            } finally {
              end();
            }
          }}
        >
          {t("savePassword")}
        </ActionButton>
        {message ? <Alert role="status">{message}</Alert> : null}
        <Button component="a" href="/" variant="subtle">
          {t("backToProjects")}
        </Button>
      </Stack>
    </Container>
  );
}
