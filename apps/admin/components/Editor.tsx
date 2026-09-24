"use client";
import {
  publishedConfigSchema,
  siteConfigSchema,
  themeDesigns,
  type InvitationLocale,
  type MediaAsset,
  type SiteConfig,
} from "@invitations/domain";
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  FloppyDiskIcon as IconDeviceFloppy,
  DownloadSimpleIcon as IconDownload,
  PaperPlaneTiltIcon as IconRocket,
  UploadSimpleIcon as IconUpload,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import * as S from "./preview.styles";

import { createTemplate, type TemplateId } from "@invitations/domain/templates";
import { useLocalStorage } from "@mantine/hooks";
import { browserDb } from "../lib/browser";
import { usePanelI18n } from "../lib/i18n";
import { templateUi } from "../lib/template-i18n";
import { workspaceUi } from "../lib/workspace-i18n";
import { CollectionFields, Fields } from "./ConfigFields";
import { apiFetch } from "./Dashboard";
import { EditorWorkspace } from "./EditorWorkspace";
import { DismissibleAlert } from "./DismissibleAlert";
import { GuestManagement } from "./GuestManagement";
import { LanguageSelect } from "./LanguageSelect";
import { PreviewCanvas } from "./PreviewCanvas";
import { PreviewToolbar } from "./PreviewToolbar";
import { TemplateDialog } from "./TemplateDialog";
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
  const ui = workspaceUi[language];
  const [preferredWidth, setWidth] = useLocalStorage({
    key: "invitations-view-v1-device",
    defaultValue: "390",
  });
  const width = ["320", "390", "768", "1440"].includes(preferredWidth)
    ? preferredWidth
    : "390";
  const [fit, setFit] = useLocalStorage({
    key: "invitations-view-v1-fit",
    defaultValue: true,
  });
  const [data, setData] = useState(initial),
    [config, setConfig] = useState(initial.draft.config),
    [saved, setSaved] = useState(JSON.stringify(initial.draft.config));
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
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
  // Keep the last valid draft for both existing and newly opened preview frames.
  if (validation.success)
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
    if (!validation.success) return;
    for (const current of [frame.current, expandedFrame.current])
      current?.contentWindow?.postMessage(
        { type: "preview-config", config, variant, urls: data.urls },
        location.origin,
      );
  }, [config, variant, data.urls, validation.success]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const endpoint = `/api/sites/${data.site.id}`;
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [templateLocale, setTemplateLocale] = useState<InvitationLocale>(
    config.locale,
  );
  const [templateConfirm, setTemplateConfirm] = useState(false);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const demoDrafts = useRef(new Map<string, SiteConfig>());
  function openTemplateDialog() {
    setSnapshotId(null);
    setTemplateId(null);
    setTemplateLocale(config.locale);
    setMessage("");
    setTemplateConfirm(true);
  }
  async function replaceDraft() {
    if (!snapshotId && !templateId) return;
    await task(async () => {
      let result: { config: SiteConfig; revision: number };
      if (demo) {
        const next = snapshotId
          ? demoDrafts.current.get(snapshotId)
          : createTemplate(
              templateId!,
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
  const previewControls = (
    <PreviewToolbar
      width={width}
      onWidth={setWidth}
      fit={fit}
      onFit={setFit}
      variant={variant}
      onVariant={setVariant}
      variants={config.variants}
      expanded={previewOpen}
      onExpand={() => setPreviewOpen((value) => !value)}
    />
  );
  return (
    <EditorWorkspace
      title={<Title order={1}>{data.site.name}</Title>}
      headerTools={
        <Tooltip label={tt.change}>
          <ActionIcon
            variant="subtle"
            size="lg"
            aria-label={tt.change}
            disabled={busy}
            onClick={openTemplateDialog}
          >
            <SquaresFourIcon size={22} weight="duotone" />
          </ActionIcon>
        </Tooltip>
      }
      status={
        <Badge color={dirty ? "orange" : "forest"}>
          {dirty ? t("unsaved") : `${t("draft")} #${data.draft.revision}`}
        </Badge>
      }
      save={
        <>
          {" "}
          <Button
            onClick={save}
            loading={busy}
            disabled={!dirty || !validation.success}
            leftSection={<IconDeviceFloppy size={16} />}
          >
            {t("save")}
          </Button>
        </>
      }
      actions={
        <>
          {" "}
          <Button
            onClick={() => setConfirm("publish")}
            disabled={dirty || busy || !readyToPublish}
            color="forest"
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
          <LanguageSelect />
        </>
      }
      notices={
        <>
          {" "}
          {demo ? (
            <DismissibleAlert title={t("localDemo")}>
              {language === "pl"
                ? "Zmiany są przechowywane tylko do odświeżenia strony. Publikacja jest symulowana i nie łączy się z Vercel."
                : language === "en"
                  ? "Changes are kept only until the page is refreshed. Publishing is simulated and does not connect to Vercel."
                  : "Änderungen bleiben nur bis zum Aktualisieren der Seite erhalten. Die Veröffentlichung wird simuliert und stellt keine Verbindung zu Vercel her."}
            </DismissibleAlert>
          ) : null}
          {message ? (
            <DismissibleAlert
              key={message}
              role="status"
              onClose={() => setMessage("")}
            >
              {message}
            </DismissibleAlert>
          ) : null}
          {!validation.success ? (
            <DismissibleAlert
              key={JSON.stringify(
                validation.error.issues.map(({ path, code, message }) => ({
                  path,
                  code,
                  message,
                })),
              )}
              color="red"
              title={t("validation")}
              role="alert"
            >
              {validation.error.issues.slice(0, 8).map((i, index) => (
                <Text size="sm" key={index}>
                  {i.path.join(".")}: {i.message}
                </Text>
              ))}
            </DismissibleAlert>
          ) : null}
          {!config.identity.displayName.trim() && (
            <DismissibleAlert>
              {language === "pl"
                ? "Uzupełnij główny napis, aby opublikować zaproszenie."
                : language === "en"
                  ? "Add a main heading before publishing."
                  : "Ergänze die Hauptüberschrift vor der Veröffentlichung."}
            </DismissibleAlert>
          )}
        </>
      }
      onResetView={() => {
        setWidth("390");
        setFit(true);
      }}
      preview={
        <>
          {!previewOpen && previewControls}
          <PreviewCanvas
            width={Number(width)}
            fit={fit}
            frame={frame}
            title={t("preview")}
          />
        </>
      }
      dialogs={
        <>
          <TemplateDialog
            opened={templateConfirm && !snapshotId}
            onClose={() => setTemplateConfirm(false)}
            title={tt.change}
            templateId={templateId}
            locale={templateLocale}
            onTemplate={setTemplateId}
            onLocale={setTemplateLocale}
            onSubmit={() => void replaceDraft()}
            submitLabel={tt.replace}
            busy={busy}
            error={message}
            reset
          />
          <Modal
            opened={templateConfirm && !!snapshotId}
            onClose={() => !busy && setTemplateConfirm(false)}
            title={tt.restore}
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
          <Modal
            opened={!!confirm}
            onClose={() => setConfirm(null)}
            title={
              confirm === "publish" ? t("publishTitle") : t("restoreTitle")
            }
          >
            <Stack>
              <Text>{t("publishWarning")}</Text>
              <Button onClick={publish}>
                {demo ? t("startSimulation") : t("confirmPublish")}
              </Button>
            </Stack>
          </Modal>

          <Modal.Root
            opened={previewOpen}
            onClose={() => setPreviewOpen(false)}
            fullScreen
          >
            <Modal.Overlay />
            <Modal.Content>
              <S.PreviewDialog>
                <S.PreviewDialogHeader>
                  <S.PreviewDialogTitle>{ui.live}</S.PreviewDialogTitle>
                  {previewControls}
                </S.PreviewDialogHeader>
                <S.PreviewDialogBody>
                  <PreviewCanvas
                    width={Number(width)}
                    fit={fit}
                    frame={expandedFrame}
                    title={t("preview")}
                  />
                </S.PreviewDialogBody>
              </S.PreviewDialog>
            </Modal.Content>
          </Modal.Root>
        </>
      }
    >
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
                ["focalX", "focalY", "mobileFocalX", "mobileFocalY"] as const
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
                  ? "Kopie szkicu"
                  : language === "en"
                    ? "Draft backups"
                    : "Entwurfssicherungen"}
              </Accordion.Control>
              <Accordion.Panel>
                <Stack>
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

      <Tabs.Panel value="history">
        {" "}
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
      </Tabs.Panel>
      <Tabs.Panel value="guests">
        {" "}
        {!demo && (
          <GuestManagement
            key={data.releases[0]?.id || `draft-${data.draft.revision}`}
            siteId={data.site.id}
          />
        )}
        {demo && <Alert>{ui.demoGuests}</Alert>}
      </Tabs.Panel>
    </EditorWorkspace>
  );
}
