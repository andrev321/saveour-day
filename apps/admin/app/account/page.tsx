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
import { browserDb } from "../../lib/browser";
import { usePanelI18n } from "../../lib/i18n";
import { BrandLogo } from "@invitations/ui/brand";
export default function Account() {
  const { t } = usePanelI18n();
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  return (
    <Container size="xs" py={80}>
      <Stack>
        <BrandLogo height={52} />
        <Title>{t("setPassword")}</Title>
        <PasswordInput
          label={t("newPassword")}
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          autoComplete="new-password"
        />
        <Button
          disabled={password.length < 12}
          onClick={async () => {
            const { error } = await browserDb().auth.updateUser({ password });
            setMessage(error ? t("passwordError") : t("passwordSaved"));
          }}
        >
          {t("savePassword")}
        </Button>
        {message ? <Alert>{message}</Alert> : null}
        <Button component="a" href="/" variant="subtle">
          {t("backToProjects")}
        </Button>
      </Stack>
    </Container>
  );
}
