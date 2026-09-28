"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Modal,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { browserDb } from "../lib/browser";
import { usePanelI18n } from "../lib/i18n";
import { LanguageSelect } from "./LanguageSelect";
import { ProjectStart } from "./ProjectStart";
import { BrandLogo } from "@invitations/ui/brand";
type Site = {
  id: string;
  name: string;
  public_slug?: string;
  published_release_id?: string | null;
};
type SitesResponse = { sites: Site[]; admin: boolean };

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : {};
  if (!response.ok)
    throw new Error(result.error || "The operation could not be completed");
  return result as T;
}
export function Dashboard({
  configured,
  emailConfirmed = false,
}: {
  configured: boolean;
  emailConfirmed?: boolean;
}) {
  const { t } = usePanelI18n();
  const [confirmationOpen, setConfirmationOpen] = useState(emailConfirmed);
  function dismissConfirmation() {
    setConfirmationOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("emailConfirmed");
    window.history.replaceState(window.history.state, "", url);
  }
  const [sites, setSites] = useState<Site[]>([]),
    [admin, setAdmin] = useState(false),
    [logged, setLogged] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (configured) {
      let alive = true;
      apiFetch<SitesResponse>("/api/sites")
        .then((data) => {
          if (alive) {
            setSites(data.sites);
            setAdmin(data.admin);
            setLogged(true);
          }
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }
  }, [configured]);
  async function login() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await browserDb().auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(t("invalidLogin"));
      window.location.reload();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Container size="lg" py={48}>
      <Modal
        opened={confirmationOpen}
        onClose={dismissConfirmation}
        title={t("emailConfirmedTitle")}
        centered
      >
        <Stack>
          <Text>{t("emailConfirmedBody")}</Text>
          <Button onClick={dismissConfirmation}>
            {t("emailConfirmedContinue")}
          </Button>
        </Stack>
      </Modal>
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <BrandLogo animated height={56} style={{ marginBottom: 12 }} />
            <Title>{t("dashboard")}</Title>
          </div>
          <LanguageSelect />
          {logged ? (
            <Button
              variant="subtle"
              onClick={async () => {
                await browserDb().auth.signOut();
                window.location.reload();
              }}
            >
              {t("logout")}
            </Button>
          ) : null}
        </Group>
        {!configured ? (
          <Alert title={t("setup")}>
            {t("setupDescription")}
            <br />
            <Button component="a" href="/demo" mt="md">
              {t("demo")}
            </Button>
          </Alert>
        ) : null}
        {message ? (
          <Alert color="red" role="alert">
            {message}
          </Alert>
        ) : null}
        {configured && !logged ? (
          <Card withBorder maw={460}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void login();
              }}
            >
              <Stack>
                <Title order={2}>{t("login")}</Title>
                <TextInput
                  label={t("email")}
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <PasswordInput
                  label={t("password")}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <Button type="submit" loading={busy}>
                  {t("login")}
                </Button>
                <Button
                  variant="light"
                  disabled={busy || !email || password.length < 12}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const { error } = await browserDb().auth.signUp({
                        email,
                        password,
                        options: {
                          emailRedirectTo: location.origin + "/auth/confirm",
                        },
                      });
                      setMessage(
                        error
                          ? error.message
                          : "Sprawdź e-mail, aby potwierdzić konto. Następnie zaloguj się.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Utwórz konto
                </Button>
                <Text size="sm">
                  Nowe konto: hasło musi mieć co najmniej 12 znaków.
                </Text>
                <Button
                  variant="subtle"
                  disabled={!email}
                  onClick={async () => {
                    await browserDb().auth.resetPasswordForEmail(email, {
                      redirectTo: `${location.origin}/account`,
                    });
                    setMessage(t("resetSent"));
                  }}
                >
                  {t("forgot")}
                </Button>
              </Stack>
            </form>
          </Card>
        ) : null}
        {logged && (
          <>
            {admin && <Badge>{t("admin")}</Badge>}
            <ProjectStart
              onCreate={async (values) => {
                const site = await apiFetch<Site>("/api/sites", {
                  method: "POST",
                  body: JSON.stringify(values),
                });
                window.location.href = `/sites/${site.id}`;
              }}
            />
          </>
        )}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {sites.map((site) => (
            <Card key={site.id} withBorder>
              <Stack>
                <Title order={2} size="h3">
                  {site.name}
                </Title>
                <Text c="dimmed">
                  {site.published_release_id ? "Opublikowana" : "Szkic"}
                </Text>
                <Button
                  component="a"
                  href={`/sites/${site.id}`}
                  variant="light"
                >
                  {t("edit")}
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
        {logged && !sites.length ? <Text>{t("noSites")}</Text> : null}
      </Stack>
    </Container>
  );
}
