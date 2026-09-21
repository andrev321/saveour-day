"use client";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  FileButton,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  siteConfigSchema,
  type SiteConfig,
  type MediaAsset,
} from "@wedding/domain";
import { Fields, CollectionFields } from "./ConfigFields";
import { apiFetch } from "./Dashboard";
import { browserDb } from "../lib/browser";
type Job = {
  id: string;
  release_id: string;
  status: string;
  url?: string;
  error?: string;
  created_at?: string;
};
type RevisionResponse = { revision: number };
type SignedUpload = { id: string; path: string; token: string };
type DomainResponse = { verified?: boolean };
export type EditorData = {
  site: {
    id: string;
    name: string;
    domain?: string;
    vercel_project_id?: string;
  };
  draft: { config: SiteConfig; revision: number };
  deployments: Job[];
  releases: { id: string; created_at: string }[];
  media: { id: string; manifest: MediaAsset }[];
  urls: Record<string, string>;
};
export function Editor({
  initial,
  admin = false,
  demo = false,
}: {
  initial: EditorData;
  admin?: boolean;
  demo?: boolean;
}) {
  const [data, setData] = useState(initial),
    [config, setConfig] = useState(initial.draft.config),
    [saved, setSaved] = useState(JSON.stringify(initial.draft.config));
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [width, setWidth] = useState<string>("390"),
    [variant, setVariant] = useState(config.defaultVariant);
  const [confirm, setConfirm] = useState<"publish" | string | null>(null),
    [email, setEmail] = useState(""),
    [domain, setDomain] = useState(initial.site.domain || "");
  const frame = useRef<HTMLIFrameElement>(null),
    demoSnapshots = useRef(new Map<string, SiteConfig>());
  const dirty = JSON.stringify(config) !== saved;
  const validation = siteConfigSchema.safeParse(config);
  const preview = useRef({ config, variant, urls: data.urls });
  preview.current = { config, variant, urls: data.urls };
  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (
        e.origin === location.origin &&
        e.source === frame.current?.contentWindow &&
        e.data?.type === "preview-ready"
      )
        frame.current?.contentWindow?.postMessage(
          { type: "preview-config", ...preview.current },
          location.origin,
        );
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, []);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage(
      { type: "preview-config", config, variant, urls: data.urls },
      location.origin,
    );
  }, [config, variant, data.urls]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const endpoint = `/api/sites/${data.site.id}`;
  async function action<T = unknown>(action: string, payload: unknown) {
    return apiFetch<T>(endpoint, {
      method: "POST",
      body: JSON.stringify({ action, payload }),
    });
  }
  async function reload() {
    const next = await apiFetch<EditorData>(endpoint);
    setData(next);
  }
  async function task(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    await task(async () => {
      const parsed = siteConfigSchema.parse(config);
      const result = demo
        ? { revision: data.draft.revision + 1 }
        : await apiFetch<RevisionResponse>(endpoint, {
            method: "PATCH",
            body: JSON.stringify({
              revision: data.draft.revision,
              config: parsed,
            }),
          });
      setConfig(parsed);
      setSaved(JSON.stringify(parsed));
      setData({
        ...data,
        draft: { config: parsed, revision: result.revision },
      });
      setMessage("Szkic zapisany. Publiczna strona nie została zmieniona.");
    });
  }
  async function publish() {
    const requested = confirm;
    setConfirm(null);
    await task(async () => {
      if (demo) {
        const id = crypto.randomUUID();
        const snapshot =
          requested === "publish"
            ? structuredClone(data.draft.config)
            : demoSnapshots.current.get(requested!);
        if (!snapshot) throw new Error("Brak wydania demonstracyjnego");
        demoSnapshots.current.set(id, structuredClone(snapshot));
        setData({
          ...data,
          deployments: [
            {
              id,
              release_id: id,
              status: "simulation",
              created_at: new Date().toISOString(),
            },
            ...data.deployments,
          ],
          releases: [
            { id, created_at: new Date().toISOString() },
            ...data.releases,
          ],
        });
        setMessage("Symulacja zakończona. Nie utworzono wdrożenia Vercel.");
        return;
      }
      await action(
        requested === "publish" ? "publish" : "restore",
        requested === "publish"
          ? { revision: data.draft.revision }
          : { releaseId: requested },
      );
      await reload();
      setMessage("Publikacja uruchomiona. Odśwież status za chwilę.");
    });
  }
  async function upload(file: File | null) {
    if (!file) return;
    await task(async () => {
      if (demo)
        throw new Error(
          "Upload wymaga połączenia z Supabase. Demonstracja nie wysyła plików.",
        );
      if (file.size > 8388608)
        throw new Error("Maksymalny rozmiar zdjęcia: 8 MB");
      const signed = await action<SignedUpload>("prepare-upload", {
        type: file.type,
        size: file.size,
      });
      const { error } = await browserDb()
        .storage.from("site-media")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw new Error("Upload nie powiódł się");
      const media = await action<MediaAsset>("finalize-upload", {
        id: signed.id,
      });
      setConfig((current) => ({
        ...current,
        media: [...current.media, media],
        hero: { ...current.hero, mediaId: current.hero.mediaId || media.id },
      }));
      await reload();
    });
  }
  function replace(key: keyof SiteConfig, value: unknown) {
    setConfig((current) => ({ ...current, [key]: value }));
  }
  const active = data.deployments.some((d) =>
    ["preparing", "building"].includes(d.status),
  );
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">
              PRACOWNIA ZAPROSZEŃ
            </Text>
            <Title order={1}>{data.site.name}</Title>
          </div>
          <Group>
            <Badge color={dirty ? "orange" : "green"}>
              {dirty ? "Niezapisane zmiany" : `Szkic #${data.draft.revision}`}
            </Badge>
            <Button component="a" href="/" variant="subtle">
              Realizacje
            </Button>
          </Group>
        </Group>
        {demo ? (
          <Alert title="Demonstracja lokalna">
            Zmiany są przechowywane tylko do odświeżenia strony. Publikacja jest
            symulowana i nie łączy się z Vercel.
          </Alert>
        ) : null}
        {message ? <Alert role="status">{message}</Alert> : null}
        {!validation.success ? (
          <Alert color="red" title="Popraw konfigurację" role="alert">
            {validation.error.issues.slice(0, 8).map((i, index) => (
              <Text size="sm" key={index}>
                {i.path.join(".")}: {i.message}
              </Text>
            ))}
          </Alert>
        ) : null}
        <Group>
          <Button
            onClick={save}
            loading={busy}
            disabled={!dirty || !validation.success}
          >
            Zapisz szkic
          </Button>
          <Button
            onClick={() => setConfirm("publish")}
            disabled={dirty || busy || !validation.success || active}
            color="dark"
          >
            {demo ? "Symuluj publikację" : "Publikuj stronę"}
          </Button>
          <Button
            variant="subtle"
            onClick={() => {
              const blob = new Blob([JSON.stringify(config, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${config.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Eksport konfiguracji
          </Button>
        </Group>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <Card withBorder p="lg">
            <Tabs defaultValue="content">
              <Tabs.List>
                <Tabs.Tab value="content">Treści</Tabs.Tab>
                <Tabs.Tab value="structure">Sekcje</Tabs.Tab>
                <Tabs.Tab value="media">Zdjęcia</Tabs.Tab>
                <Tabs.Tab value="settings">Ustawienia</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="content" pt="lg">
                <Stack>
                  <Title order={3}>Para</Title>
                  <Fields
                    config={config}
                    value={config.couple}
                    onChange={(v) => replace("couple", v)}
                  />
                  <Title order={3}>Pierwszy ekran</Title>
                  <Fields
                    config={config}
                    value={{
                      ...config.hero,
                      mediaId: config.hero.mediaId || "",
                      mobileMediaId: config.hero.mobileMediaId || "",
                    }}
                    onChange={(v) => {
                      if (!v.mediaId) delete v.mediaId;
                      if (!v.mobileMediaId) delete v.mobileMediaId;
                      replace("hero", v);
                    }}
                  />
                  <Title order={3}>Miejsca</Title>
                  <CollectionFields
                    name="venues"
                    config={config}
                    onChange={setConfig}
                  />
                  <Title order={3}>Wydarzenia</Title>
                  <CollectionFields
                    name="events"
                    config={config}
                    onChange={setConfig}
                  />
                  <Title order={3}>Kontakty</Title>
                  <CollectionFields
                    name="contacts"
                    config={config}
                    onChange={setConfig}
                  />
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="structure" pt="lg">
                <Stack>
                  <Title order={3}>Sekcje</Title>
                  <CollectionFields
                    name="sections"
                    config={config}
                    onChange={setConfig}
                  />
                  <Title order={3}>Warianty zaproszenia</Title>
                  <CollectionFields
                    name="variants"
                    config={config}
                    onChange={setConfig}
                  />
                  <Select
                    label="Domyślny wariant"
                    data={config.variants.map((v) => ({
                      value: v.id,
                      label: v.label,
                    }))}
                    value={config.defaultVariant}
                    allowDeselect={false}
                    onChange={(v) => replace("defaultVariant", v)}
                  />
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="media" pt="lg">
                <Stack>
                  <FileButton
                    onChange={upload}
                    accept="image/png,image/jpeg,image/webp"
                  >
                    {(props) => (
                      <Button {...props} loading={busy}>
                        Dodaj zdjęcie
                      </Button>
                    )}
                  </FileButton>
                  <Text size="sm" c="dimmed">
                    JPEG, PNG lub WebP; do 8 MB i 20 megapikseli.
                  </Text>
                  {data.media
                    .filter((m) => !config.media.some((c) => c.id === m.id))
                    .map((m) => (
                      <Button
                        key={m.id}
                        variant="light"
                        onClick={() =>
                          setConfig({
                            ...config,
                            media: [...config.media, m.manifest],
                          })
                        }
                      >
                        Dodaj zapisane zdjęcie {m.id.slice(0, 8)}
                      </Button>
                    ))}
                  {config.media.map((media, index) => (
                    <Card withBorder key={media.id}>
                      <Text size="sm" mb="sm">
                        Zdjęcie {index + 1}
                      </Text>
                      <TextInput
                        label="Opis alternatywny (pusty dla dekoracji)"
                        value={media.alt}
                        onChange={(e) => {
                          const next = structuredClone(config);
                          next.media[index].alt = e.currentTarget.value;
                          setConfig(next);
                        }}
                      />
                      {(
                        [
                          "focalX",
                          "focalY",
                          "mobileFocalX",
                          "mobileFocalY",
                        ] as const
                      ).map((key) => (
                        <NumberInput
                          key={key}
                          label={
                            {
                              focalX: "Kadr desktop: poziomo",
                              focalY: "Kadr desktop: pionowo",
                              mobileFocalX: "Kadr mobile: poziomo",
                              mobileFocalY: "Kadr mobile: pionowo",
                            }[key]
                          }
                          min={0}
                          max={100}
                          value={media[key]}
                          onChange={(v) => {
                            const next = structuredClone(config);
                            next.media[index][key] = Number(v);
                            setConfig(next);
                          }}
                        />
                      ))}
                    </Card>
                  ))}
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="settings" pt="lg">
                <Stack>
                  <Select
                    label="Motyw kolorystyczny"
                    data={[
                      { value: "ivory", label: "Krem i złoto" },
                      { value: "sage", label: "Szałwia i kość słoniowa" },
                      { value: "wine", label: "Bordo i jasne tło" },
                    ]}
                    value={config.theme}
                    allowDeselect={false}
                    onChange={(v) => replace("theme", v)}
                  />
                  <Title order={3}>Udostępnianie</Title>
                  <Fields
                    config={config}
                    value={config.metadata}
                    onChange={(v) => replace("metadata", v)}
                  />
                  <Title order={3}>Etykiety i stopka</Title>
                  <Fields
                    config={config}
                    value={config.copy}
                    onChange={(v) => replace("copy", v)}
                  />
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Card>
          <Stack>
            <Group>
              <Select
                label="Podgląd wariantu"
                data={config.variants.map((v) => ({
                  value: v.id,
                  label: v.label,
                }))}
                value={variant}
                onChange={(v) => setVariant(v || config.defaultVariant)}
              />
              <Select
                label="Szerokość ekranu"
                data={["320", "390", "768", "1440"]}
                value={width}
                onChange={(v) => setWidth(v || "390")}
              />
            </Group>
            <div className="admin-preview">
              <div
                className="admin-preview-inner"
                style={{ width: Number(width) }}
              >
                <iframe
                  ref={frame}
                  src="/preview"
                  title="Podgląd zaproszenia"
                />
              </div>
            </div>
            <Text size="xs" c="dimmed">
              Podgląd korzysta z tego samego renderera co opublikowana strona.
              Przy błędnych danych pozostaje ostatnia prawidłowa wersja.
            </Text>
          </Stack>
        </SimpleGrid>
        <Card withBorder>
          <Title order={2} mb="md">
            Historia publikacji
          </Title>
          <Stack>
            {!data.deployments.length ? (
              <Text c="dimmed">Nie opublikowano jeszcze żadnej wersji.</Text>
            ) : null}
            {data.deployments.map((job) => (
              <Group key={job.id} justify="space-between">
                <div>
                  <Badge>{job.status}</Badge>
                  <Text size="sm">
                    {job.created_at
                      ? new Date(job.created_at).toLocaleString("pl-PL")
                      : job.id}
                  </Text>
                  {job.error ? (
                    <Text c="red" size="sm">
                      {job.error}
                    </Text>
                  ) : null}
                </div>
                <Group>
                  {job.url ? (
                    <Button
                      component="a"
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="subtle"
                    >
                      Otwórz
                    </Button>
                  ) : null}
                  {["preparing", "building"].includes(job.status) ? (
                    <Button
                      variant="light"
                      loading={busy}
                      onClick={() =>
                        task(async () => {
                          await action("sync", { id: job.id });
                          await reload();
                        })
                      }
                    >
                      Odśwież status
                    </Button>
                  ) : null}
                  {["ready", "simulation"].includes(job.status) ? (
                    <Button
                      variant="subtle"
                      disabled={busy || active}
                      onClick={() => setConfirm(job.release_id)}
                    >
                      Przywróć wydanie
                    </Button>
                  ) : null}
                  {admin && job.status === "preparing" ? (
                    <Button
                      color="red"
                      variant="subtle"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Czy sprawdzono Vercel i potwierdzono brak aktywnego wdrożenia?",
                          )
                        )
                          void task(async () => {
                            await action("resolve-failed", { id: job.id });
                            await reload();
                          });
                      }}
                    >
                      Zamknij po kontroli Vercel
                    </Button>
                  ) : null}
                </Group>
              </Group>
            ))}
          </Stack>
        </Card>
        {admin && !demo ? (
          <Card withBorder>
            <Title order={2} mb="md">
              Administracja realizacją
            </Title>
            <Stack>
              <Button
                variant="light"
                disabled={busy || !!data.site.vercel_project_id}
                onClick={() =>
                  task(async () => {
                    await action("connect", {});
                    await reload();
                  })
                }
              >
                {data.site.vercel_project_id
                  ? "Projekt Vercel połączony"
                  : "Utwórz projekt Vercel"}
              </Button>
              <Group align="end">
                <TextInput
                  label="E-mail klienta"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <Button
                  onClick={() =>
                    task(async () => {
                      await action("invite", { email });
                      setMessage("Zaproszenie wysłane.");
                    })
                  }
                >
                  Zaproś klienta
                </Button>
              </Group>
              <Group align="end">
                <TextInput
                  label="Domena klienta"
                  value={domain}
                  onChange={(e) => setDomain(e.currentTarget.value)}
                />
                <Button
                  onClick={() =>
                    task(async () => {
                      const result = await action<DomainResponse>("domain", {
                        domain,
                      });
                      setMessage(
                        result.verified
                          ? "Domena zweryfikowana."
                          : "Domena dodana. Dokończ konfigurację DNS w Vercel → Settings → Domains.",
                      );
                      await reload();
                    })
                  }
                >
                  Przypisz domenę
                </Button>
              </Group>
            </Stack>
          </Card>
        ) : null}
        <Modal
          opened={!!confirm}
          onClose={() => setConfirm(null)}
          title={
            confirm === "publish" ? "Publikacja strony" : "Przywrócenie wydania"
          }
        >
          <Stack>
            <Text>
              Treści i zdjęcia tego wydania staną się publiczne. Zmiany w
              późniejszym szkicu nie zmienią opublikowanej wersji.
            </Text>
            <Button onClick={publish}>
              {demo ? "Uruchom symulację" : "Potwierdź publikację"}
            </Button>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
