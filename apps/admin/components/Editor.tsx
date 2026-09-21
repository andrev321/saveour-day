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
  themeDesigns,
  type SiteConfig,
  type MediaAsset,
} from "@wedding/domain";
import { createDemo, isUnmodifiedTemplate } from "@wedding/domain/demo";
import { Fields, CollectionFields } from "./ConfigFields";
import { apiFetch } from "./Dashboard";
import { browserDb } from "../lib/browser";
import { invitationLocaleFor, usePanelI18n } from "../lib/i18n";
import { LanguageSelect } from "./LanguageSelect";
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
  const { language, t } = usePanelI18n();
  const [data, setData] = useState(initial),
    [config, setConfig] = useState(initial.draft.config),
    [saved, setSaved] = useState(JSON.stringify(initial.draft.config));
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [width, setWidth] = useState<string>("390"),
    [variant, setVariant] = useState(config.defaultVariant),
    [previewOpen, setPreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | string | null>(null),
    [email, setEmail] = useState(""),
    [domain, setDomain] = useState(initial.site.domain || "");
  const frame = useRef<HTMLIFrameElement>(null),
    expandedFrame = useRef<HTMLIFrameElement>(null),
    demoSnapshots = useRef(new Map<string, SiteConfig>());
  const dirty = JSON.stringify(config) !== saved;
  const validation = siteConfigSchema.safeParse(config);
  const preview = useRef({ config, variant, urls: data.urls });
  const previousLanguage = useRef(language);
  preview.current = { config, variant, urls: data.urls };
  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (
        e.origin === location.origin &&
        [
          frame.current?.contentWindow,
          expandedFrame.current?.contentWindow,
        ].includes(e.source as Window) &&
        e.data?.type === "preview-ready"
      )
        (e.source as Window).postMessage(
          { type: "preview-config", ...preview.current },
          location.origin,
        );
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, []);
  useEffect(() => {
    for (const current of [frame.current, expandedFrame.current])
      current?.contentWindow?.postMessage(
        { type: "preview-config", config, variant, urls: data.urls },
        location.origin,
      );
  }, [config, variant, data.urls]);
  useEffect(() => {
    if (previousLanguage.current === language) return;
    previousLanguage.current = language;
    if (!isUnmodifiedTemplate(config)) return;
    const template = createDemo(config.id, invitationLocaleFor(language));
    setConfig(template);
    setVariant(template.defaultVariant);
    setMessage(t("languageChanged"));
  }, [config, language, t]);
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
      setMessage(t("savedDraft"));
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
        setMessage(t("simulationDone"));
        return;
      }
      await action(
        requested === "publish" ? "publish" : "restore",
        requested === "publish"
          ? { revision: data.draft.revision }
          : { releaseId: requested },
      );
      await reload();
      setMessage(t("publicationStarted"));
    });
  }
  async function upload(file: File | null) {
    if (!file) return;
    await task(async () => {
      if (demo) throw new Error(t("uploadNeedsSupabase"));
      if (file.size > 8388608) throw new Error(t("maxPhotoSize"));
      const signed = await action<SignedUpload>("prepare-upload", {
        type: file.type,
        size: file.size,
      });
      const { error } = await browserDb()
        .storage.from("site-media")
        .uploadToSignedUrl(signed.path, signed.token, file, {
          contentType: file.type,
        });
      if (error) throw new Error(t("uploadFailed"));
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
            <LanguageSelect />
            <Badge color={dirty ? "orange" : "green"}>
              {dirty ? t("unsaved") : `${t("draft")} #${data.draft.revision}`}
            </Badge>
            <Button component="a" href="/" variant="subtle">
              {t("projects")}
            </Button>
          </Group>
        </Group>
        {demo ? (
          <Alert title={t("localDemo")}>
            {language === "pl"
              ? "Zmiany są przechowywane tylko do odświeżenia strony. Publikacja jest symulowana i nie łączy się z Vercel."
              : language === "en"
                ? "Changes are kept only until the page is refreshed. Publishing is simulated and does not connect to Vercel."
                : "Änderungen bleiben nur bis zum Aktualisieren der Seite erhalten. Die Veröffentlichung wird simuliert und stellt keine Verbindung zu Vercel her."}
          </Alert>
        ) : null}
        {message ? <Alert role="status">{message}</Alert> : null}
        {!validation.success ? (
          <Alert color="red" title={t("validation")} role="alert">
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
            {t("save")}
          </Button>
          <Button
            onClick={() => setConfirm("publish")}
            disabled={dirty || busy || !validation.success || active}
            color="dark"
          >
            {demo ? t("simulate") : t("publish")}
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
            {t("export")}
          </Button>
        </Group>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <Card withBorder p="lg">
            <Tabs defaultValue="page">
              <Tabs.List>
                <Tabs.Tab value="page">{t("page")}</Tabs.Tab>
                <Tabs.Tab value="media">{t("media")}</Tabs.Tab>
                <Tabs.Tab value="settings">{t("settings")}</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="page" pt="lg">
                <Stack>
                  <Title order={3}>{t("hero")}</Title>
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
                  <Title order={3}>{t("couple")}</Title>
                  <Fields
                    config={config}
                    value={config.couple}
                    onChange={(v) => replace("couple", v)}
                  />
                  <Title order={3}>{t("venues")}</Title>
                  <CollectionFields
                    name="venues"
                    config={config}
                    onChange={setConfig}
                  />
                  <Title order={3}>{t("events")}</Title>
                  <CollectionFields
                    name="events"
                    config={config}
                    onChange={setConfig}
                  />
                  <Title order={3}>{t("contacts")}</Title>
                  <CollectionFields
                    name="contacts"
                    config={config}
                    onChange={setConfig}
                  />
                  <Title order={3}>{t("structure")}</Title>
                  <CollectionFields
                    name="sections"
                    config={config}
                    onChange={setConfig}
                  />
                  <Title order={3}>{t("pages")}</Title>
                  <CollectionFields
                    name="variants"
                    config={config}
                    onChange={setConfig}
                  />
                  <Select
                    label={t("mainPage")}
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
                        {language === "pl"
                          ? "Dodaj zdjęcie"
                          : language === "en"
                            ? "Add photo"
                            : "Foto hinzufügen"}
                      </Button>
                    )}
                  </FileButton>
                  <Text size="sm" c="dimmed">
                    {language === "pl"
                      ? "JPEG, PNG lub WebP; do 8 MB i 20 megapikseli."
                      : language === "en"
                        ? "JPEG, PNG or WebP; up to 8 MB and 20 megapixels."
                        : "JPEG, PNG oder WebP; bis zu 8 MB und 20 Megapixel."}
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
                        {language === "pl"
                          ? "Dodaj zapisane zdjęcie"
                          : language === "en"
                            ? "Add saved photo"
                            : "Gespeichertes Foto hinzufügen"}{" "}
                        {m.id.slice(0, 8)}
                      </Button>
                    ))}
                  {config.media.map((media, index) => (
                    <Card withBorder key={media.id}>
                      <Text size="sm" mb="sm">
                        {language === "pl"
                          ? "Zdjęcie"
                          : language === "en"
                            ? "Photo"
                            : "Foto"}{" "}
                        {index + 1}
                      </Text>
                      <TextInput
                        label={
                          language === "pl"
                            ? "Opis alternatywny (pusty dla dekoracji)"
                            : language === "en"
                              ? "Alternative description (leave empty for decoration)"
                              : "Alternativbeschreibung (für Dekoration leer lassen)"
                        }
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
                              focalX: t("focalDesktopX"),
                              focalY: t("focalDesktopY"),
                              mobileFocalX: t("focalMobileX"),
                              mobileFocalY: t("focalMobileY"),
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
                    label={t("theme")}
                    data={[
                      {
                        value: "ivory",
                        label:
                          language === "pl"
                            ? "Krem i złoto"
                            : language === "en"
                              ? "Ivory and gold"
                              : "Elfenbein und Gold",
                      },
                      {
                        value: "sage",
                        label:
                          language === "pl"
                            ? "Szałwia i kość słoniowa"
                            : language === "en"
                              ? "Sage and ivory"
                              : "Salbei und Elfenbein",
                      },
                      {
                        value: "wine",
                        label:
                          language === "pl"
                            ? "Bordo i jasne tło"
                            : language === "en"
                              ? "Wine and light background"
                              : "Bordeaux und heller Hintergrund",
                      },
                    ]}
                    value={config.theme}
                    allowDeselect={false}
                    onChange={(value) => {
                      if (!value) return;
                      const theme = value as SiteConfig["theme"];
                      setConfig((current) => ({
                        ...current,
                        theme,
                        design: themeDesigns[theme],
                      }));
                    }}
                  />
                  <Title order={3}>{t("colors")}</Title>
                  <Fields
                    config={config}
                    value={config.design}
                    onChange={(value) => replace("design", value)}
                  />
                  <Title order={3}>{t("sharing")}</Title>
                  <Fields
                    config={config}
                    value={config.metadata}
                    onChange={(v) => replace("metadata", v)}
                  />
                  <Title order={3}>{t("labelsFooter")}</Title>
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
                label={t("preview")}
                data={config.variants.map((v) => ({
                  value: v.id,
                  label: v.label,
                }))}
                value={variant}
                onChange={(v) => setVariant(v || config.defaultVariant)}
              />
              <Select
                label={t("screenWidth")}
                data={["320", "390", "768", "1440"]}
                value={width}
                onChange={(v) => setWidth(v || "390")}
              />
              <Button variant="light" onClick={() => setPreviewOpen(true)}>
                {t("openPreview")}
              </Button>
            </Group>
            <div className="admin-preview">
              <div
                className="admin-preview-inner"
                style={{ width: Number(width) }}
              >
                <iframe ref={frame} src="/preview" title={t("preview")} />
              </div>
            </div>
            <Text size="xs" c="dimmed">
              {language === "pl"
                ? "Podgląd korzysta z tego samego renderera co opublikowana strona. Przy błędnych danych pozostaje ostatnia prawidłowa wersja."
                : language === "en"
                  ? "The preview uses the same renderer as the published site. Invalid data leaves the last valid version visible."
                  : "Die Vorschau verwendet denselben Renderer wie die veröffentlichte Seite. Bei ungültigen Daten bleibt die letzte gültige Version sichtbar."}
            </Text>
          </Stack>
        </SimpleGrid>
        <Modal
          opened={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={t("preview")}
          fullScreen
        >
          <iframe
            ref={expandedFrame}
            src="/preview"
            title={t("preview")}
            style={{ border: 0, height: "calc(100vh - 5.5rem)", width: "100%" }}
          />
          <Button
            mt="sm"
            variant="subtle"
            onClick={() => setPreviewOpen(false)}
          >
            {t("closePreview")}
          </Button>
        </Modal>
        <Card withBorder>
          <Title order={2} mb="md">
            {t("history")}
          </Title>
          <Stack>
            {!data.deployments.length ? (
              <Text c="dimmed">
                {language === "pl"
                  ? "Nie opublikowano jeszcze żadnej wersji."
                  : language === "en"
                    ? "No version has been published yet."
                    : "Es wurde noch keine Version veröffentlicht."}
              </Text>
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
                      {language === "pl"
                        ? "Otwórz"
                        : language === "en"
                          ? "Open"
                          : "Öffnen"}
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
                      {language === "pl"
                        ? "Odśwież status"
                        : language === "en"
                          ? "Refresh status"
                          : "Status aktualisieren"}
                    </Button>
                  ) : null}
                  {["ready", "simulation"].includes(job.status) ? (
                    <Button
                      variant="subtle"
                      disabled={busy || active}
                      onClick={() => setConfirm(job.release_id)}
                    >
                      {language === "pl"
                        ? "Przywróć wydanie"
                        : language === "en"
                          ? "Restore release"
                          : "Version wiederherstellen"}
                    </Button>
                  ) : null}
                  {admin && job.status === "preparing" ? (
                    <Button
                      color="red"
                      variant="subtle"
                      onClick={() => {
                        if (window.confirm(t("resolveConfirm")))
                          void task(async () => {
                            await action("resolve-failed", { id: job.id });
                            await reload();
                          });
                      }}
                    >
                      {t("resolveFailed")}
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
              {t("administration")}
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
                  ? t("vercelConnected")
                  : t("createVercel")}
              </Button>
              <Group align="end">
                <TextInput
                  label={t("clientEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <Button
                  onClick={() =>
                    task(async () => {
                      await action("invite", { email });
                      setMessage(t("invitationSent"));
                    })
                  }
                >
                  {t("inviteClient")}
                </Button>
              </Group>
              <Group align="end">
                <TextInput
                  label={t("clientDomain")}
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
                          ? t("domainVerified")
                          : t("domainAdded"),
                      );
                      await reload();
                    })
                  }
                >
                  {t("assignDomain")}
                </Button>
              </Group>
            </Stack>
          </Card>
        ) : null}
        <Modal
          opened={!!confirm}
          onClose={() => setConfirm(null)}
          title={confirm === "publish" ? t("publishTitle") : t("restoreTitle")}
        >
          <Stack>
            <Text>{t("publishWarning")}</Text>
            <Button onClick={publish}>
              {demo ? t("startSimulation") : t("confirmPublish")}
            </Button>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
