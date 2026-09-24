"use client";
import { useEffect, useRef, useState } from "react";
import {
  IconDeviceFloppy,
  IconDownload,
  IconFileText,
  IconLayoutList,
  IconMaximize,
  IconFiles,
  IconPhoto,
  IconRocket,
  IconSettings,
  IconUpload,
} from "@tabler/icons-react";
import {
  Accordion,
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
  publishedConfigSchema,
  type InvitationLocale,
  themeDesigns,
  type SiteConfig,
  type MediaAsset,
} from "@invitations/domain";

import { Fields, CollectionFields } from "./ConfigFields";
import { apiFetch } from "./Dashboard";
import { browserDb } from "../lib/browser";
import { usePanelI18n } from "../lib/i18n";
import {
  createTemplate,
  templateCatalog,
  type TemplateId,
} from "@invitations/domain/templates";
import { templateUi } from "../lib/template-i18n";
import { TemplatePicker } from "./TemplatePicker";
import { GuestManagement } from "./GuestManagement";
import { LanguageSelect } from "./LanguageSelect";
type RevisionResponse = { revision: number };
type SignedUpload = { id: string; path: string; token: string };
export type EditorData = {
  site: {
    id: string;
    name: string;
    domain?: string;
    published_release_id?: string | null;
  };
  draft: { config: SiteConfig; revision: number };
  releases: { id: string; created_at: string }[];
  snapshots?: { id: string; created_at: string; revision: number }[];
  media: { id: string; manifest: MediaAsset }[];
  urls: Record<string, string>;
};
export function Editor({
  initial,
  demo = false,
}: {
  initial: EditorData;
  demo?: boolean;
}) {
  const { language, t } = usePanelI18n();
  const tt = templateUi[language];
  const [data, setData] = useState(initial),
    [config, setConfig] = useState(initial.draft.config),
    [saved, setSaved] = useState(JSON.stringify(initial.draft.config));
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [width, setWidth] = useState<string>("390"),
    [variant, setVariant] = useState(config.defaultVariant),
    [previewOpen, setPreviewOpen] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null),
    expandedFrame = useRef<HTMLIFrameElement>(null),
    demoSnapshots = useRef(new Map<string, SiteConfig>());
  const dirty = JSON.stringify(config) !== saved;
  const validation = siteConfigSchema.safeParse(config);
  const readyToPublish = publishedConfigSchema.safeParse(config).success;
  const preview = useRef({ config, variant, urls: data.urls });
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
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const endpoint = `/api/sites/${data.site.id}`;
  const [templateId, setTemplateId] = useState<TemplateId>("wedding-reception");
  const [templateLocale, setTemplateLocale] = useState<InvitationLocale>(
    config.locale,
  );
  const [templateConfirm, setTemplateConfirm] = useState(false);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const demoDrafts = useRef(new Map<string, SiteConfig>());
  const templateLabel = templateCatalog(templateLocale).find(
    (t) => t.id === templateId,
  )?.label;
  async function replaceDraft() {
    await task(async () => {
      let result: { config: SiteConfig; revision: number };
      if (demo) {
        const next = snapshotId
          ? demoDrafts.current.get(snapshotId)
          : createTemplate(
              templateId,
              config.id,
              templateLocale,
              undefined,
              data.draft.config.defaultVariant,
            );
        if (!next) throw new Error(tt.missing);
        const id = crypto.randomUUID();
        demoDrafts.current.set(id, structuredClone(data.draft.config));
        result = {
          config: structuredClone(next),
          revision: data.draft.revision + 1,
        };
        setData({
          ...data,
          draft: result,
          snapshots: [
            {
              id,
              created_at: new Date().toISOString(),
              revision: data.draft.revision,
            },
            ...(data.snapshots || []),
          ],
        });
      } else {
        result = await action(snapshotId ? "restore-draft" : "reset-template", {
          revision: data.draft.revision,
          templateId,
          locale: templateLocale,
          snapshotId: snapshotId || undefined,
        });
        await reload();
      }
      setConfig(result.config);
      setSaved(JSON.stringify(result.config));
      setVariant(result.config.defaultVariant);
      setTemplateConfirm(false);
      setMessage(tt.saved);
    });
  }
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
      if (requested === "publish")
        publishedConfigSchema.parse(data.draft.config);
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
      setMessage(
        "Opublikowano. Stały adres strony jest gotowy do udostępnienia.",
      );
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
            <Button
              component="a"
              href="/"
              variant="subtle"
              leftSection={<IconLayoutList size={16} />}
            >
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
            leftSection={<IconDeviceFloppy size={16} />}
          >
            {t("save")}
          </Button>
          <Button
            onClick={() => setConfirm("publish")}
            disabled={dirty || busy || !readyToPublish}
            color="dark"
            leftSection={<IconRocket size={16} />}
          >
            {demo ? t("simulate") : t("publish")}
          </Button>
          <Button
            variant="subtle"
            leftSection={<IconDownload size={16} />}
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
        {!readyToPublish && (
          <Alert>
            {language === "pl"
              ? "Uzupełnij główny napis, aby opublikować zaproszenie."
              : language === "en"
                ? "Add a main heading before publishing."
                : "Ergänze die Hauptüberschrift vor der Veröffentlichung."}
          </Alert>
        )}
        <Modal
          opened={templateConfirm}
          onClose={() => !busy && setTemplateConfirm(false)}
          title={snapshotId ? tt.restore : `${tt.apply}: ${templateLabel}?`}
        >
          <Stack>
            {message && (
              <Alert color="red" role="status">
                {message}
              </Alert>
            )}
            <Text>{tt.warning}</Text>
            <Text>{tt.retained}</Text>
            <Group>
              <Button
                variant="default"
                disabled={busy}
                onClick={() => setTemplateConfirm(false)}
              >
                {tt.cancel}
              </Button>
              <Button
                color="red"
                loading={busy}
                onClick={() => void replaceDraft()}
              >
                {tt.replace}
              </Button>
            </Group>
          </Stack>
        </Modal>
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          <Card withBorder p="lg">
            <Tabs defaultValue="page">
              <Tabs.List>
                <Tabs.Tab value="page" leftSection={<IconFileText size={15} />}>
                  {t("page")}
                </Tabs.Tab>
                <Tabs.Tab
                  value="sections"
                  leftSection={<IconLayoutList size={15} />}
                >
                  {t("structure")}
                </Tabs.Tab>
                <Tabs.Tab value="pages" leftSection={<IconFiles size={15} />}>
                  {t("pages")}
                </Tabs.Tab>
                <Tabs.Tab value="media" leftSection={<IconPhoto size={15} />}>
                  {t("media")}
                </Tabs.Tab>
                <Tabs.Tab
                  value="settings"
                  leftSection={<IconSettings size={15} />}
                >
                  {t("settings")}
                </Tabs.Tab>
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
                  <Title order={3}>{t("identity")}</Title>
                  <Fields
                    config={config}
                    value={config.identity}
                    onChange={(v) => replace("identity", v)}
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
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="sections" pt="lg">
                <Stack>
                  <Title order={3}>{t("structure")}</Title>
                  <CollectionFields
                    name="sections"
                    config={config}
                    onChange={setConfig}
                  />
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="pages" pt="lg">
                <Stack>
                  <Title order={3}>{t("pages")}</Title>
                  <CollectionFields
                    name="variants"
                    config={config}
                    onChange={setConfig}
                    onPageSelect={setVariant}
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
                      <Button
                        {...props}
                        loading={busy}
                        leftSection={<IconUpload size={16} />}
                      >
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
                  <Accordion variant="separated">
                    <Accordion.Item value="template-reset">
                      <Accordion.Control>
                        {language === "pl"
                          ? "Zmiana szablonu i kopie szkicu"
                          : language === "en"
                            ? "Change template and draft backups"
                            : "Vorlage ändern und Entwurfssicherungen"}
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack>
                          <TemplatePicker
                            templateId={templateId}
                            locale={templateLocale}
                            onTemplate={setTemplateId}
                            onLocale={setTemplateLocale}
                          />
                          <Button
                            variant="light"
                            disabled={busy}
                            onClick={() => {
                              setSnapshotId(null);
                              setMessage("");
                              setTemplateConfirm(true);
                            }}
                          >
                            {tt.change}
                          </Button>
                          {!!data.snapshots?.length && (
                            <Group align="end">
                              <Select
                                label={tt.snapshot}
                                placeholder={tt.chooseSnapshot}
                                value={snapshotId}
                                onChange={setSnapshotId}
                                data={data.snapshots.map((s) => ({
                                  value: s.id,
                                  label: `${tt.revision} ${s.revision} · ${new Date(s.created_at).toLocaleString()}`,
                                }))}
                              />
                              <Button
                                variant="subtle"
                                disabled={!snapshotId || busy}
                                onClick={() => {
                                  setMessage("");
                                  setTemplateConfirm(true);
                                }}
                              >
                                {tt.restore}
                              </Button>
                            </Group>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
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
              <Button
                variant="light"
                onClick={() => setPreviewOpen(true)}
                leftSection={<IconMaximize size={16} />}
              >
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
          size="calc(100vw - 4rem)"
          yOffset="2rem"
          xOffset="2rem"
          classNames={{
            content: "expanded-preview-modal",
            body: "expanded-preview-modal-body",
          }}
          overlayProps={{ backgroundOpacity: 0.24, blur: 1 }}
          transitionProps={{ transition: "pop", duration: 180 }}
        >
          <Stack h="100%" gap="sm">
            <Group>
              <Select
                label={t("preview")}
                data={config.variants.map((page) => ({
                  value: page.id,
                  label: page.label,
                }))}
                value={variant}
                onChange={(value) => setVariant(value || config.defaultVariant)}
              />
              <Select
                label={t("screenWidth")}
                data={["320", "390", "768", "1024", "1440"]}
                value={width}
                onChange={(value) => setWidth(value || "390")}
              />
              <Button variant="subtle" onClick={() => setPreviewOpen(false)}>
                {t("closePreview")}
              </Button>
            </Group>
            <div className="expanded-preview-frame">
              <div style={{ width: Number(width) }}>
                <iframe
                  ref={expandedFrame}
                  src="/preview"
                  title={t("preview")}
                />
              </div>
            </div>
          </Stack>
        </Modal>
        <Card withBorder>
          <Title order={2} mb="md">
            {t("history")}
          </Title>
          <Stack>
            {!data.releases.length ? (
              <Text c="dimmed">
                {language === "pl"
                  ? "Nie opublikowano jeszcze żadnej wersji."
                  : language === "en"
                    ? "No version has been published yet."
                    : "Es wurde noch keine Version veröffentlicht."}
              </Text>
            ) : null}
            {data.releases.map((job) => (
              <Group key={job.id} justify="space-between">
                <div>
                  <Badge>
                    {demo
                      ? "simulation"
                      : job.id === data.site.published_release_id
                        ? "active"
                        : "snapshot"}
                  </Badge>
                  <Text size="sm">
                    {job.created_at
                      ? new Date(job.created_at).toLocaleString("pl-PL")
                      : job.id}
                  </Text>
                </div>
                <Group>
                  <Button
                    variant="subtle"
                    disabled={busy}
                    onClick={() => setConfirm(job.id)}
                  >
                    {language === "pl"
                      ? "Przywróć wydanie"
                      : language === "en"
                        ? "Restore release"
                        : "Version wiederherstellen"}
                  </Button>
                </Group>
              </Group>
            ))}
          </Stack>
        </Card>
        {!demo && (
          <GuestManagement
            key={data.releases[0]?.id || `draft-${data.draft.revision}`}
            siteId={data.site.id}
          />
        )}
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
