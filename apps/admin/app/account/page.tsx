"use client";
import { useState } from "react";
import { Button, Container, PasswordInput, Stack, Title } from "@mantine/core";
import { ActionButton } from "../../components/ActionButton";
import { useOperation } from "@invitations/ui/loading";
import { toast } from "@invitations/ui/toast";
import { browserDb } from "../../lib/browser";
import { usePanelI18n } from "../../lib/i18n";
import { BrandLogo } from "@invitations/ui/brand";
import { PanelPreferences } from "../../components/PanelPreferences";
export default function Account() {
  const { t } = usePanelI18n();
  const [password, setPassword] = useState("");
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
            try {
              const { error } = await browserDb().auth.updateUser({ password });
              if (error) toast.error(t("passwordError"));
              else toast.success(t("passwordSaved"));
            } catch {
              toast.error(t("passwordError"));
            } finally {
              end();
            }
          }}
        >
          {t("savePassword")}
        </ActionButton>
        <Button component="a" href="/" variant="subtle">
          {t("backToProjects")}
        </Button>
      </Stack>
    </Container>
  );
}
