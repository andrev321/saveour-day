"use client";
import { maxPhotoFileBytes, preparePhotoUpload } from "../lib/prepare-photo-upload";
import { ActionButton } from "./ActionButton";
import { LoadingState, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import {
  publishedConfigSchema,
  siteConfigSchema,
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
  Select,
  Stack,
  Tabs,
  Text,
  Title,
  Tooltip,
  Checkbox,
} from "@mantine/core";
import {
  FloppyDiskIcon as IconDeviceFloppy,
  PaperPlaneTiltIcon as IconRocket,
  UploadSimpleIcon as IconUpload,
  SquaresFourIcon,
  ArrowCounterClockwiseIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import * as S from "./preview.styles";

import { createTemplate, type TemplateId } from "@invitations/domain/templates";
import { useLocalStorage } from "@mantine/hooks";
import { usePanelI18n } from "../lib/i18n";
import { templateUi } from "../lib/template-i18n";
import { workspaceUi } from "../lib/workspace-i18n";
import { Fields } from "./ConfigFields";
import { MediaUrlsContext } from "./PhotoReference";
import {
  createDraftTabSnapshot,
  mergeDraft,
  parseDraftTabSnapshot,
  useDraft,
} from "../lib/use-draft";
import { publicationWarnings } from "@invitations/domain/readiness";
import { ApiError, apiFetch } from "./Dashboard";
import { EditorWorkspace } from "./EditorWorkspace";
import { PreparationChecklist } from "./PreparationChecklist";
import { DismissibleAlert } from "./DismissibleAlert";
import { GuestManagement } from "./GuestManagement";
import { PanelPreferences } from "./PanelPreferences";
import { PreviewCanvas } from "./PreviewCanvas";
import { PreviewToolbar } from "./PreviewToolbar";
import { ContentEditor } from "./ContentEditor";
import { VariantManager } from "./VariantManager";
import { deviceWidths } from "./DeviceSelector";
import { PhotoLibrary } from "./PhotoLibrary";
import { ThemePicker } from "./ThemePicker";
import { TemplateDialog } from "./TemplateDialog";
type RevisionResponse = { revision: number };
const draftFieldLabelKeys: Partial<Record<keyof SiteConfig, string>> = {
  identity: "identity",
  hero: "hero",
  events: "events",
  contacts: "contacts",
  venues: "venues",
  media: "media",
  variants: "pages",
  sections: "structure",
  theme: "theme",
  design: "colors",
  appearance: "appearance",
  copy: "labelsFooter",
  metadata: "settings",
  locale: "language",
  defaultVariant: "mainPage",
};

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
  media: { id: string; manifest: MediaAsset; status?: string }[];
  urls: Record<string, string>;
  publishedConfig?: SiteConfig | null;
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
  const [data, setData] = useState(initial);
  const { config, setConfig, reset, current, undo, redo, canUndo, canRedo } =
    useDraft(initial.draft.config);
  const [saved, setSaved] = useState(JSON.stringify(initial.draft.config));
  const [saveError, setSaveError] = useState("");
  const [recovery, setRecovery] = useState<SiteConfig | null>(null);
  const [conflict, setConflict] = useState<{
    remote: EditorData;
    merged: SiteConfig;
    fields: (keyof SiteConfig)[];
  } | null>(null);
  const [remoteFields, setRemoteFields] = useState<string[]>([]);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const saving = useRef(false);
  const localKey = `invitation-draft-v1:${initial.site.id}`;
  const serverDraft = useRef(initial.draft);
  const label = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      try {
        const raw = sessionStorage.getItem(localKey);
        if (raw) {
          const recovered = parseDraftTabSnapshot(
            raw,
            initial.site.id,
            initial.draft.config,
          );
          if (recovered) setRecovery(recovered);
          else sessionStorage.removeItem(localKey);
        }
      } catch {
        /* Saving still works when storage is unavailable. */
      }
      setRecoveryReady(true);
    });
    return () => {
      alive = false;
    };
  }, [localKey, initial]);
  const [message, setMessage] = useState(""),
    [variant, setVariant] = useState(config.defaultVariant),
    [previewOpen, setPreviewOpen] = useState(false);
  const { operation, busy, start, end } = useOperation();
  const [uploadName, setUploadName] = useState("");
  const [editRequest, setEditRequest] = useState(0);
  const [activePanel, setActivePanel] = useState<string | null>("content");
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const currentVariant = config.variants.some((v) => v.id === variant)
    ? variant
    : config.defaultVariant;
  const selectionRef = useRef({ config, currentVariant });
  selectionRef.current = { config, currentVariant };
  const [confirm, setConfirm] = useState<"publish" | string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null),
    expandedFrame = useRef<HTMLIFrameElement>(null),
    demoSnapshots = useRef(new Map<string, SiteConfig>());
  const dirty = JSON.stringify(config) !== saved;
  const warnings = publicationWarnings(config, language);
  const publishedConfig = data.publishedConfig;
  const unpublishedChanges =
    !publishedConfig ||
    JSON.stringify(config) !== JSON.stringify(publishedConfig);
  useEffect(() => {
    if (!recoveryReady || recovery) return;
    try {
      if (dirty) sessionStorage.setItem(localKey, createDraftTabSnapshot(config));
      else sessionStorage.removeItem(localKey);
    } catch {
      /* Restricted browsers may disable tab storage. */
    }
  }, [config, dirty, localKey, recoveryReady, recovery]);
  const validation = siteConfigSchema.safeParse(config);
  const readyToPublish = publishedConfigSchema.safeParse(config).success;
  const preview = useRef({ config, variant: currentVariant, urls: data.urls });
  // Keep the last valid draft for both existing and newly opened preview frames.
  if (validation.success)
    preview.current = { config, variant: currentVariant, urls: data.urls };
  useEffect(() => {
    const handle = (e: MessageEvent) => {
      if (
        e.origin === location.origin &&
        [
          frame.current?.contentWindow,
          expandedFrame.current?.contentWindow,
        ].includes(e.source as Window) &&
        e.data?.type === "preview-select-section"
      ) {
        const { config, currentVariant } = selectionRef.current;
        if (
          e.data.id === "hero" ||
          config.variants
            .find((v) => v.id === currentVariant)
            ?.sections.some((p) => p.sectionId === e.data.id)
        ) {
          setSelectedSection(e.data.id);
          setActivePanel("content");
          setPreviewOpen(false);
          setEditRequest((n) => n + 1);
        }
      }

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
        {
          type: "preview-config",
          config,
          variant: currentVariant,
          urls: data.urls,
        },
        location.origin,
      );
  }, [config, currentVariant, data.urls, validation.success]);
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
    await task("template", async () => {
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
      reset(result.config);
      serverDraft.current = result;
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
  async function task(name: string, fn: () => Promise<void>) {
    if (saving.current || !start(name)) return;
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      end();
    }
  }
  async function save(automatic = false) {
    if (saving.current || conflict || recovery || !start("save")) return;
    saving.current = true;
    setSaveError("");
    const sent = current.current;
    const base = serverDraft.current;
    try {
      const parsed = siteConfigSchema.parse(sent);
      const result = demo
        ? { revision: base.revision + 1 }
        : await apiFetch<RevisionResponse>(endpoint, {
            method: "PATCH",
            body: JSON.stringify({ revision: base.revision, config: parsed }),
          });
      serverDraft.current = { config: parsed, revision: result.revision };
      // Acknowledging a save must not create an undo step or replace newer edits.
      setSaved(JSON.stringify(sent));
      setData((previous) => ({ ...previous, draft: serverDraft.current }));
      if (!automatic)
        setMessage(
          label(
            "Szkic zapisany. Publikacja wymaga osobnego zatwierdzenia.",
            "Draft saved. Publish separately to update the invitation.",
            "Entwurf gespeichert. Zum Aktualisieren bitte veröffentlichen.",
          ),
        );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && !demo) {
        try {
          const remote = await apiFetch<EditorData>(endpoint);
          const merged = mergeDraft(
            base.config,
            current.current,
            remote.draft.config,
          );
          setRemoteFields([]);
          setConflict({
            remote,
            merged: merged.config,
            fields: merged.conflicts,
          });
        } catch (readError) {
          setSaveError((readError as Error).message);
        }
      } else setSaveError((error as Error).message);
    } finally {
      saving.current = false;
      end();
    }
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (
      !dirty ||
      busy ||
      !validation.success ||
      saveError ||
      conflict ||
      recovery ||
      !recoveryReady ||
      demo
    )
      return;
    const timer = window.setTimeout(() => void saveRef.current(true), 1800);
    return () => window.clearTimeout(timer);
  }, [
    dirty,
    busy,
    validation.success,
    saveError,
    conflict,
    recovery,
    recoveryReady,
    demo,
    config,
  ]);
  async function publish() {
    if (dirty || saving.current) {
      setMessage(
        label(
          "Poczekaj na zapis szkicu przed publikacją.",
          "Wait for the draft to save before publishing.",
          "Vor Veröffentlichung auf Speicherung warten.",
        ),
      );
      return;
    }
    const requested = confirm;
    setConfirm(null);
    await task(requested === "publish" ? "publish" : "restore", async () => {
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
    await task("upload", async () => {
      setUploadName(file.name);
      if (demo) throw new Error(t("uploadNeedsSupabase"));
      if (file.size > maxPhotoFileBytes) throw new Error(t("maxPhotoSize"));
      const image = await preparePhotoUpload(file).catch(() => null);
      if (!image) throw new Error(t("photoPreparationFailed"));
      const response = await fetch(`${endpoint}/media`, {
        method: "POST",
        headers: { "Content-Type": image.type },
        body: image,
      });
      if (response.status === 413) throw new Error(t("photoPreparationFailed"));
      const result = response.headers.get("content-type")?.includes("application/json")
        ? await response.json().catch(() => null)
        : null;
      if (!response.ok || !result) {
        throw new Error(result?.error || t("uploadFailed"));
      }
      const media = result as MediaAsset;
      await reload();
      setConfig((current) =>
        current.media.length >= 30
          ? current
          : {
              ...current,
              media: [...current.media, media],
              hero: {
                ...current.hero,
                mediaId: current.hero.mediaId || media.id,
              },
            },
      );
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
      expanded={previewOpen}
      onExpand={() => setPreviewOpen((value) => !value)}
    />
  );
  const workspace = (
    <EditorWorkspace
      editRequest={editRequest}
      active={activePanel}
      onActive={setActivePanel}
      title={<Title order={1}>{data.site.name}</Title>}
      headerTools={
        <Group wrap="nowrap" mt="md">
          <VariantManager
            config={config}
            onChange={setConfig}
            active={currentVariant}
            onSelect={(id) => {
              setVariant(id);
              setSelectedSection(null);
            }}
          />
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
        </Group>
      }
      status={
        <Badge color={dirty ? "orange" : "brand"}>
          {operation === "save"
            ? loadingText(language, "save")
            : dirty
              ? t("unsaved")
              : label("Szkic zapisany", "Draft saved", "Entwurf gespeichert")}
        </Badge>
      }
      save={
        <>
          {" "}
          <ActionButton
            onClick={() => void save()}
            loading={operation === "save"}
            disabled={busy || !dirty || !validation.success}
            leftSection={<IconDeviceFloppy size={16} />}
          >
            {t("save")}
          </ActionButton>
        </>
      }
      actions={
        <>
          {" "}
          <ActionButton
            onClick={() => setConfirm("publish")}
            loading={operation === "publish"}
            pendingLabel={loadingText(language, "publish")}
            disabled={dirty || busy || !readyToPublish}
            color="brand"
            leftSection={<IconRocket size={16} />}
          >
            {demo ? t("simulate") : t("publish")}
          </ActionButton>
          <Tooltip label={label("Cofnij", "Undo", "Rückgängig")}>
            <ActionIcon
              aria-label={label("Cofnij", "Undo", "Rückgängig")}
              disabled={!canUndo}
              onClick={undo}
            >
              <ArrowCounterClockwiseIcon size={20} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={label("Ponów", "Redo", "Wiederholen")}>
            <ActionIcon
              aria-label={label("Ponów", "Redo", "Wiederholen")}
              disabled={!canRedo}
              onClick={redo}
            >
              <ArrowClockwiseIcon size={20} />
            </ActionIcon>
          </Tooltip>
          <PanelPreferences />
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
          <Text size="sm" c="dimmed">
            {data.site.published_release_id
              ? unpublishedChanges
                ? label(
                    "Goście widzą poprzednią publikację. Masz zmiany w szkicu.",
                    "Guests see the previous publication. Your draft has changes.",
                    "Gäste sehen die vorherige Veröffentlichung. Der Entwurf enthält Änderungen.",
                  )
                : label(
                    "Goście widzą tę wersję zaproszenia.",
                    "Guests see this version.",
                    "Gäste sehen diese Version.",
                  )
              : label(
                  "Zaproszenie nie jest jeszcze opublikowane.",
                  "The invitation is not published yet.",
                  "Die Einladung ist noch nicht veröffentlicht.",
                )}
          </Text>
          {saveError && (
            <Alert color="red" role="alert">
              <Text>{saveError}</Text>
              <Button mt="sm" onClick={() => void save()}>
                {label("Ponów zapis", "Retry save", "Erneut speichern")}
              </Button>
            </Alert>
          )}
          {!data.site.published_release_id && (
            <PreparationChecklist
              siteId={initial.site.id}
              language={language}
              onSelect={setActivePanel}
              onReview={() => setConfirm("publish")}
              reviewDisabled={!readyToPublish || dirty || busy}
            />
          )}
          {operation && operation !== "save" && (
            <LoadingState
              compact
              label={loadingText(
                language,
                operation === "publish"
                  ? "publish"
                  : operation === "restore"
                    ? "restore"
                    : operation === "upload"
                      ? "upload"
                      : "template",
              )}
              slowLabel={loadingText(language, "slow")}
            />
          )}
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
                <Button
                  key={index}
                  display="block"
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    const root = String(i.path[0]);
                    setActivePanel(
                      ["design", "theme", "appearance"].includes(root)
                        ? "appearance"
                        : ["metadata", "copy"].includes(root)
                          ? "settings"
                          : "content",
                    );
                    const section =
                      root === "sections"
                        ? config.sections[Number(i.path[1])]?.id
                        : root === "hero" || root === "identity"
                          ? "hero"
                          : config.sections.find((s) =>
                              root === "events"
                                ? s.type === "timeline"
                                : root === "venues"
                                  ? s.type === "venue"
                                  : root === "contacts"
                                    ? s.type === "contact"
                                    : false,
                            )?.id;
                    setSelectedSection(section || null);
                    setEditRequest((n) => n + 1);
                  }}
                >
                  {i.message}
                </Button>
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
          <Modal
            opened={!!recovery}
            onClose={() => {}}
            title={label(
              "Odzyskaj niezapisany szkic",
              "Recover unsaved draft",
              "Ungespeicherten Entwurf wiederherstellen",
            )}
            closeOnClickOutside={false}
            closeOnEscape={false}
            withCloseButton={false}
          >
            <Stack>
              <Text>
                {label(
                  "Znaleziono zmiany z poprzedniej sesji tej karty. Możesz je odzyskać lub zachować wersję zapisaną na serwerze.",
                  "This tab has changes from a previous session. Recover them or keep the server version.",
                  "Dieser Tab enthält Änderungen aus einer früheren Sitzung. Wiederherstellen oder Serverversion behalten.",
                )}
              </Text>
              <Button
                onClick={() => {
                  if (recovery) setConfig(recovery);
                  setRecovery(null);
                }}
              >
                {label(
                  "Odzyskaj szkic",
                  "Recover draft",
                  "Entwurf wiederherstellen",
                )}
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  try {
                    sessionStorage.removeItem(localKey);
                  } catch {
                    /* Optional storage. */
                  }
                  setRecovery(null);
                }}
              >
                {label(
                  "Zachowaj wersję serwera",
                  "Keep server version",
                  "Serverversion behalten",
                )}
              </Button>
            </Stack>
          </Modal>
          <Modal
            opened={!!conflict}
            onClose={() => {}}
            title={label(
              "Połącz zmiany z innej sesji",
              "Merge changes from another session",
              "Änderungen zusammenführen",
            )}
            closeOnClickOutside={false}
            closeOnEscape={false}
            withCloseButton={false}
          >
            <Stack>
              <Text>
                {label(
                  "Twoje zmiany są zachowane. Niezależne zmiany zostaną połączone. Dla konfliktów wybierz wersję z serwera; niezaznaczone pola zachowają Twoją wersję.",
                  "Your edits are preserved. Independent changes will be merged. Select conflicting fields to keep the server version; unselected fields keep your edits.",
                  "Ihre Änderungen bleiben erhalten. Unabhängige Änderungen werden zusammengeführt. Ausgewählte Konfliktfelder übernehmen die Serverversion.",
                )}
              </Text>
              {conflict?.fields.map((key) => (
                <Checkbox
                  key={key}
                  label={`${t(draftFieldLabelKeys[key] || "settings")} — ${label("użyj wersji serwera", "use server version", "Serverversion verwenden")}`}
                  checked={remoteFields.includes(key)}
                  onChange={(e) =>
                    setRemoteFields((previous) =>
                      e.currentTarget.checked
                        ? [...previous, key]
                        : previous.filter((v) => v !== key),
                    )
                  }
                />
              ))}
              <Button
                onClick={() => {
                  if (!conflict) return;
                  const merged = { ...conflict.merged };
                  for (const key of remoteFields)
                    Object.assign(merged, {
                      [key]:
                        conflict.remote.draft.config[key as keyof SiteConfig],
                    });
                  serverDraft.current = conflict.remote.draft;
                  setData(conflict.remote);
                  setSaved(JSON.stringify(conflict.remote.draft.config));
                  setConfig(merged);
                  setConflict(null);
                  setSaveError("");
                }}
              >
                {label(
                  "Zastosuj połączenie",
                  "Apply merge",
                  "Zusammenführung übernehmen",
                )}
              </Button>
            </Stack>
          </Modal>
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
                <ActionButton
                  color="red"
                  loading={operation === "template"}
                  pendingLabel={loadingText(language, "template")}
                  onClick={() => void replaceDraft()}
                >
                  {tt.replace}
                </ActionButton>
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
              {confirm === "publish" && (
                <>
                  <Text fw={600}>
                    {label(
                      "Sprawdź przed publikacją",
                      "Check before publishing",
                      "Vor Veröffentlichung prüfen",
                    )}
                  </Text>
                  {warnings.length ? (
                    warnings.map((warning, index) => (
                      <Alert key={index} color="orange">
                        <Text>{warning.message}</Text>
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => {
                            setConfirm(null);
                            setActivePanel(warning.panel);
                            setSelectedSection(warning.section);
                            setEditRequest((n) => n + 1);
                          }}
                        >
                          {label("Przejdź do poprawy", "Review", "Prüfen")}
                        </Button>
                      </Alert>
                    ))
                  ) : (
                    <Text>
                      {label(
                        "Treść przeszła podstawową kontrolę.",
                        "Content passed the basic checks.",
                        "Grundprüfung bestanden.",
                      )}
                    </Text>
                  )}
                  <Text size="sm">
                    {label(
                      "Sprawdź też termin RSVP i dostęp w zakładce Goście.",
                      "Also check the RSVP deadline and access in Guests.",
                      "Auch Rückmeldefrist und Zugang unter Gäste prüfen.",
                    )}
                  </Text>
                </>
              )}

              <Button onClick={publish} disabled={dirty || busy}>
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
      <Tabs.Panel value="content" pt="lg">
        <ContentEditor
          key={currentVariant}
          config={config}
          onChange={setConfig}
          variantId={currentVariant}
          selected={selectedSection}
          onSelect={setSelectedSection}
          device={
            Number(width) < 768
              ? "mobile"
              : Number(width) < 1024
                ? "tablet"
                : "desktop"
          }
          onDevice={(device) => setWidth(deviceWidths[device])}
        />
      </Tabs.Panel>
      <Tabs.Panel value="appearance" pt="lg">
        <Stack>
          <ThemePicker config={config} onChange={setConfig} />
          <Title order={3}>{t("colors")}</Title>
          <Fields
            config={config}
            value={config.design}
            onChange={(value) => replace("design", value)}
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
              <ActionButton
                {...props}
                loading={operation === "upload"}
                disabled={busy}
                pendingLabel={loadingText(language, "upload")}
                leftSection={<IconUpload size={16} />}
              >
                {language === "pl"
                  ? "Dodaj zdjęcie"
                  : language === "en"
                    ? "Add photo"
                    : "Foto hinzufügen"}
              </ActionButton>
            )}
          </FileButton>
          <Text size="sm" c="dimmed">
            {language === "pl"
              ? "JPEG, PNG lub WebP do 10 MB. Duże zdjęcia zmniejszamy automatycznie."
              : language === "en"
                ? "JPEG, PNG or WebP up to 10 MB. Large photos are resized automatically."
                : "JPEG, PNG oder WebP bis zu 10 MB. Große Fotos werden automatisch verkleinert."}
          </Text>
          {operation === "upload" && (
            <Card withBorder aria-busy="true">
              <Text size="sm">{uploadName}</Text>
              <LoadingState compact label={loadingText(language, "upload")} />
            </Card>
          )}
          <PhotoLibrary
            config={config}
            library={data.media}
            urls={data.urls}
            onChange={setConfig}
            canDelete={!dirty && !busy}
            onDelete={async (id) => {
              if (dirty || busy) throw new Error("Najpierw zapisz szkic.");
              if (demo) {
                setData((current) => ({
                  ...current,
                  media: current.media.filter((m) => m.id !== id),
                }));
                return;
              }
              try {
                await action("delete-media", { id });
                setData((current) => ({
                  ...current,
                  media: current.media.filter((m) => m.id !== id),
                }));
              } finally {
                await reload();
              }
            }}
          />
        </Stack>
      </Tabs.Panel>
      <Tabs.Panel value="settings" pt="lg">
        <Stack>
          <Title order={3}>{t("sharing")}</Title>
          <Fields
            config={config}
            value={config.metadata}
            onChange={(v) => replace("metadata", v)}
          />
          <Title order={3}>{t("labelsFooter")}</Title>
          <Fields
            config={config}
            value={Object.fromEntries(
              Object.entries(config.copy).filter(([key]) => key !== "footer"),
            )}
            onChange={(v) => replace("copy", { ...config.copy, ...v })}
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
            key={data.site.published_release_id || "draft"}
            siteId={data.site.id}
          />
        )}
        {demo && <Alert>{ui.demoGuests}</Alert>}
      </Tabs.Panel>
    </EditorWorkspace>
  );
  return <MediaUrlsContext value={data.urls}>{workspace}</MediaUrlsContext>;
}
