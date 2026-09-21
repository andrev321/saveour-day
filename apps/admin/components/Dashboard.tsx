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
    throw new Error(result.error || "Nie udało się wykonać operacji");
  return result as T;
}
export function Dashboard({ configured }: { configured: boolean }) {
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
      if (error) throw new Error("Nieprawidłowy e-mail lub hasło");
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
            <Title>Twoje realizacje</Title>
          </div>
          {logged ? (
            <Button
              variant="subtle"
              onClick={async () => {
                await browserDb().auth.signOut();
                window.location.reload();
              }}
            >
              Wyloguj
            </Button>
          ) : null}
        </Group>
        {!configured ? (
          <Alert title="Panel nie jest jeszcze połączony z Supabase">
            Ustaw środowisko według dokumentacji. Dane klientów nie są dostępne
            bez konfiguracji kont.
            <br />
            <Button component="a" href="/demo" mt="md">
              Otwórz lokalną demonstrację
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
                <Title order={2}>Zaloguj się</Title>
                <TextInput
                  label="E-mail"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <PasswordInput
                  label="Hasło"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />
                <Button type="submit" loading={busy}>
                  Zaloguj
                </Button>
                <Button
                  variant="subtle"
                  disabled={!email}
                  onClick={async () => {
                    await browserDb().auth.resetPasswordForEmail(email, {
                      redirectTo: `${location.origin}/account`,
                    });
                    setMessage(
                      "Jeżeli konto istnieje, otrzymasz wiadomość z instrukcją.",
                    );
                  }}
                >
                  Nie pamiętam hasła
                </Button>
              </Stack>
            </form>
          </Card>
        ) : null}
        {logged && admin ? (
          <Card withBorder>
            <Group align="end">
              <TextInput
                label="Nazwa nowej realizacji"
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
                Utwórz realizację
              </Button>
              <Badge>Administrator</Badge>
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
                <Text c="dimmed">
                  {site.domain || "Domena nie została przypisana"}
                </Text>
                <Button
                  component="a"
                  href={`/sites/${site.id}`}
                  variant="light"
                >
                  Edytuj zaproszenie
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
        {logged && !sites.length ? (
          <Text>
            Nie masz jeszcze przypisanych realizacji. Skontaktuj się z
            administratorem.
          </Text>
        ) : null}
      </Stack>
    </Container>
  );
}
