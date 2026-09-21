"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
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
type Site = { id: string; name: string; domain?: string };
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
export function Dashboard({ configured }: { configured: boolean }) {
  const { t } = usePanelI18n();
  const [sites, setSites] = useState<Site[]>([]),
    [admin, setAdmin] = useState(false),
    [logged, setLogged] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
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
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">
              PRACOWNIA ZAPROSZEŃ
            </Text>
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
        {logged && admin ? (
          <Card withBorder>
            <Group align="end">
              <TextInput
                label={t("siteName")}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
              <Button
                disabled={!name.trim()}
                onClick={async () => {
                  try {
                    const site = await apiFetch<Site>("/api/sites", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });
                    window.location.href = `/sites/${site.id}`;
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                {t("createSite")}
              </Button>
              <Badge>{t("admin")}</Badge>
            </Group>
          </Card>
        ) : null}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {sites.map((site) => (
            <Card key={site.id} withBorder>
              <Stack>
                <Title order={2} size="h3">
                  {site.name}
                </Title>
                <Text c="dimmed">{site.domain || t("domainMissing")}</Text>
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
