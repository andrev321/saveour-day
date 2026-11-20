"use client";
import { ActionButton } from "./ActionButton";
import { NoticePopover } from "./NoticePopover";
import { LoadingState, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { toast } from "@invitations/ui/toast";
import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Menu,
  PasswordInput,
  Radio,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Modal,
  Accordion,
  Pagination,
  SimpleGrid,
  Skeleton,
  Switch,
} from "@mantine/core";
import {
  DotsThreeVerticalIcon,
  DownloadSimpleIcon,
  FileCsvIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { apiFetch } from "./Dashboard";
import {
  csvFile,
  parseGuestCsv,
  type ImportedInvitation,
} from "@invitations/domain/operations";
import {
  invitationDisplayName,
  summarizeRsvp,
  type RsvpAttendanceMode,
} from "@invitations/domain/invitation";
import { summarizeQuestions } from "@invitations/domain/rsvp-questions";
import { detectGuestCollisions } from "@invitations/domain/hybrid-rsvp";
import {
  formatRsvpCsv,
  type InvitationRow,
  type Management,
} from "../lib/guest-management";
import { usePanelI18n } from "../lib/i18n";
import { copyToClipboard } from "../lib/clipboard";
import {
  InvitationEditorModal,
  type InvitationEditorSubmit,
} from "./InvitationEditorModal";
import {
  InvitationShareModal,
  type ShareInvitationTarget,
} from "./InvitationShareModal";
import { CopyableLinkRow } from "./CopyableLinkRow";
import { InvitationTable } from "./InvitationTable";
import { RsvpQuestionsEditor } from "./RsvpQuestionsEditor";
import { RsvpSummaryCards } from "./RsvpSummaryCards";
import { QrCodeCard } from "./QrCodeCard";
import { FilterGrid } from "./form-layout.styles";
import { ModalStickyFooter } from "./modal-layout.styles";
function localDeadline(iso: string | null) {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
function deadlineIso(value: string) {
  if (!value) return null;
  let result = Date.parse(value + "Z");
  for (let n = 0; n < 3; n++)
    result +=
      Date.parse(value + "Z") -
      Date.parse(localDeadline(new Date(result).toISOString()) + "Z");
  if (localDeadline(new Date(result).toISOString()) !== value)
    throw new Error(
      "Ta godzina nie istnieje w strefie Europe/Warsaw. Wybierz inną.",
    );
  return new Date(result).toISOString();
}
export function GuestManagement({ siteId }: { siteId: string }) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [confirmation, setConfirmation] = useState<{
    action: string;
    payload: unknown;
    description: string;
  } | null>(null);
  const [imported, setImported] = useState<ImportedInvitation[]>([]);
  const [importId, setImportId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importLinks, setImportLinks] = useState<
    { id?: string; label: string; url: string; shortCode?: string | null }[]
  >([]);
  function download(name: string, content: string) {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  const endpoint = `/api/sites/${siteId}/guests`;
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [data, setData] = useState<Management | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const { operation, busy, start, end } = useOperation();
  const operationMessage = loadingText(
    language,
    operation === "import"
      ? "import"
      : operation === "create"
        ? "create"
        : operation === "unpublish"
          ? "unpublish"
          : operation === "rotate"
            ? "rotate"
            : operation === "revoke"
              ? "revoke"
              : "save",
  );
  const [mode, setMode] = useState("public"),
    [code, setCode] = useState(""),
    [variant, setVariant] = useState(""),
    [deadline, setDeadline] = useState("");
  const [rsvpEnabled, setRsvpEnabled] = useState(true);
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [attendanceMode, setAttendanceMode] =
    useState<RsvpAttendanceMode>("overall");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [shareModal, setShareModal] = useState<ShareInvitationTarget | null>(
    null,
  );
  const [sessionLinks, setSessionLinks] = useState<Record<string, string>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<InvitationRow | null>(
    null,
  );
  const csvInputRef = useRef<HTMLInputElement>(null);
  function openShareModal(
    params: Omit<ShareInvitationTarget, "variantLabel"> & { variantId: string },
    variants: { id: string; label: string }[],
  ) {
    const variantLabel = variants.find((v) => v.id === params.variantId)?.label;
    setShareModal({
      groupName: params.groupName,
      guests: params.guests,
      variantLabel,
      url: params.url,
      shortCode: params.shortCode,
      isPersonalUrl: params.isPersonalUrl,
      justCreated: params.justCreated,
    });
  }
  function accept(result: Management) {
    setData(result);
    setMode(result.site.access_mode);
    setVariant(result.site.public_variant_id || result.variants[0]?.id || "");
    setDeadline(localDeadline(result.site.rsvp_deadline));
    setRsvpEnabled(result.site.rsvp_enabled ?? true);
    setAllowSelfRegistration(result.site.allow_self_registration ?? false);
    setAttendanceMode(result.site.rsvp_attendance_mode ?? "overall");
    setSelectedEventIds(result.site.rsvp_event_ids ?? []);
  }
  useEffect(() => {
    let alive = true;
    apiFetch<Management>(endpoint)
      .then((result) => {
        if (alive) {
          setData(result);
          setMode(result.site.access_mode);
          setVariant(
            result.site.public_variant_id || result.variants[0]?.id || "",
          );
          setDeadline(localDeadline(result.site.rsvp_deadline));
          setRsvpEnabled(result.site.rsvp_enabled ?? true);
          setAllowSelfRegistration(
            result.site.allow_self_registration ?? false,
          );
          setAttendanceMode(result.site.rsvp_attendance_mode ?? "overall");
          setSelectedEventIds(result.site.rsvp_event_ids ?? []);
        }
      })
      .catch((e) => {
        if (alive) {
          setLoadFailed(true);
          toast.error(e.message);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [endpoint, loadAttempt]);
  function copyText(text: string, successText: string) {
    return copyToClipboard(text, successText, language);
  }
  async function action(action: string, payload: unknown) {
    if (!start(action)) return false;
    try {
      const result = await apiFetch<{
        url?: string;
        shortCode?: string | null;
        links?: {
          id?: string;
          label: string;
          url: string;
          shortCode?: string | null;
        }[];
        alreadyImported?: boolean;
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ action, payload }),
      });
      if (action === "import") {
        setImported([]);
        setImportOpen(false);
        setImportLinks(result.links || []);
      }
      const refreshed = await apiFetch<Management>(endpoint);
      if (
        action === "settings" ||
        action === "rsvp-options" ||
        action === "save-questions"
      ) {
        accept(refreshed);
        if (action === "settings") setCode("");
      } else setData(refreshed);
      if (action === "create" && result.url) {
        const createdPayload = payload as ImportedInvitation;
        const matched = refreshed.invitations.find(
          (i) => i.short_code && i.short_code === result.shortCode,
        );
        if (matched) {
          setSessionLinks((old) => ({ ...old, [matched.id]: result.url! }));
        }
        openShareModal(
          {
            groupName: createdPayload.groupName ?? null,
            guests: createdPayload.guests,
            variantId: createdPayload.variantId,
            url: result.url,
            shortCode: result.shortCode ?? null,
            isPersonalUrl: true,
            justCreated: true,
          },
          refreshed.variants,
        );
      }
      if (action === "rotate" && result.url) {
        const rotatePayload = payload as { id: string };
        setSessionLinks((old) => ({
          ...old,
          [rotatePayload.id]: result.url!,
        }));
      }
      setConfirmation(null);
      setEditorOpen(false);
      setEditingInvite(null);
      if (result.alreadyImported) {
        toast.info(
          labelText(
            "Ten import został już zapisany. Nie utworzono duplikatów.",
            "This import was already saved. No duplicates created.",
            "Dieser Import wurde bereits gespeichert. Keine Duplikate erstellt.",
          ),
        );
      } else {
        toast.success(labelText("Zapisano.", "Saved.", "Gespeichert."));
      }
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      end();
    }
  }
  function handleEditorSubmit(submission: InvitationEditorSubmit) {
    if (submission.action === "quick-import") {
      void action("import", {
        requestId: crypto.randomUUID(),
        entries: submission.entries,
      });
      return;
    }
    void action(submission.action, submission.payload);
  }
  const options = (data?.variants || []).map((v) => ({
    value: v.id,
    label: v.label,
  }));
  const answerMap = new Map(
    data?.answers.map((a) => [
      `${a.invitation_id}:${a.guest_id}:${a.event_id}`,
      a.attending,
    ]) || [],
  );
  const active =
    data?.invitations.filter(
      (i) => !i.revoked && i.review_status !== "pending_match",
    ) || [];
  const pendingInvitations =
    data?.invitations.filter(
      (i) => !i.revoked && i.review_status === "pending_match",
    ) || [];
  const collisions = detectGuestCollisions(active);
  const events = [
    ...new Map(
      active.flatMap((i) => i.events.map((e) => [e.id, e] as const)),
    ).values(),
  ];
  const rsvpSummary = summarizeRsvp(active, data?.answers || []);
  const answeredGuestIds = new Set(
    (data?.answers || []).map((a) => a.guest_id),
  );
  const questionSummaries = summarizeQuestions(
    data?.questions || [],
    data?.questionAnswers || [],
    active.map((inv) => ({
      id: inv.id,
      variantId: inv.variant_id,
      attendingGuestIds: inv.guests
        .filter((g) => {
          const st = rsvpSummary.byGuest.get(g.id);
          return st === "attending" || st === "partial";
        })
        .map((g) => g.id),
    })),
  );
  const filtered = (data?.invitations || []).filter(
    (i) =>
      `${i.group_name ?? ""} ${i.short_code} ${i.guests.map((g) => g.name ?? "").join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all"
        ? true
        : filter === "revoked"
          ? i.revoked
          : filter === "pending_match"
            ? !i.revoked && i.review_status === "pending_match"
            : !i.revoked &&
              i.review_status !== "pending_match" &&
              rsvpSummary.byInvitation.get(i.id) === filter),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice(
    (Math.min(page, totalPages) - 1) * 20,
    Math.min(page, totalPages) * 20,
  );
  return (
    <div aria-busy={loading}>
      <Stack>
        <Title order={2}>
          {labelText(
            "Publikacja, goście i odpowiedzi",
            "Guests and responses",
            "Gäste und Antworten",
          )}
        </Title>
        {busy && (
          <LoadingState
            compact
            label={operationMessage}
            slowLabel={loadingText(language, "slow")}
          />
        )}
        {loading && (
          <Stack gap="lg">
            <LoadingState
              compact
              label={labelText(
                "Wczytujemy zaproszenia i odpowiedzi RSVP…",
                "Loading invitations and RSVP responses…",
                "Einladungen und Antworten werden geladen…",
              )}
              slowLabel={loadingText(language, "slow")}
            />
            <Stack aria-hidden="true" gap="lg">
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                {[0, 1, 2].map((index) => (
                  <Card withBorder key={index}>
                    <Skeleton height={16} width="75%" mb="sm" />
                    <Skeleton height={28} width={48} />
                  </Card>
                ))}
              </SimpleGrid>
              <Skeleton height={24} width="45%" />
              {[0, 1, 2].map((index) => (
                <Card withBorder key={index}>
                  <Stack gap="sm">
                    <Skeleton height={20} width="40%" />
                    <Skeleton height={14} width="60%" />
                    <Skeleton height={14} width="80%" />
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        )}
        {!loading && !data && loadFailed && (
          <Button
            variant="light"
            onClick={() => {
              setLoadFailed(false);
              setLoading(true);
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            {labelText("Spróbuj ponownie", "Try again", "Erneut versuchen")}
          </Button>
        )}
        {data && (
          <>
            {!data.site.rsvp_enabled && (
              <Group gap="xs" align="center">
                <Badge color="blue" variant="light">
                  {labelText(
                    "Tryb informacyjny jest aktywny",
                    "Info-only mode is active",
                    "Infomodus ist aktiv",
                  )}
                </Badge>
                <NoticePopover
                  color="blue"
                  title={labelText(
                    "Tryb informacyjny jest aktywny",
                    "Info-only mode is active",
                    "Infomodus ist aktiv",
                  )}
                  label={labelText(
                    "Tryb informacyjny jest aktywny",
                    "Info-only mode is active",
                    "Infomodus ist aktiv",
                  )}
                >
                  {labelText(
                    "Goście nie widzą wyszukiwarki ani formularza RSVP na stronie zaproszenia. Możesz ponownie włączyć RSVP w sekcji „Publikacja i dostęp”.",
                    "Guests cannot see the RSVP lookup or form on the invitation page. You can re-enable RSVP under “Publication and access”.",
                    "Gäste sehen weder die RSVP-Suche noch das Formular auf der Einladungsseite. Sie können RSVP unter „Veröffentlichung und Zugang“ wieder aktivieren.",
                  )}
                </NoticePopover>
              </Group>
            )}
            <RsvpSummaryCards
              summary={rsvpSummary}
              events={events}
              questionSummaries={questionSummaries}
            />
            <Accordion variant="separated" transitionDuration={0}>
              <Accordion.Item value="access">
                <Accordion.Control>
                  {labelText(
                    "Publikacja i dostęp",
                    "Publication and access",
                    "Veröffentlichung und Zugang",
                  )}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <Group
                      justify="space-between"
                      align="center"
                      gap="xs"
                      wrap="wrap"
                    >
                      <Group gap="xs" align="center">
                        <Badge
                          color={
                            data.site.published_release_id ? "green" : "gray"
                          }
                        >
                          {data.site.published_release_id
                            ? labelText(
                                "Opublikowana",
                                "Published",
                                "Veröffentlicht",
                              )
                            : labelText(
                                "Nieopublikowana",
                                "Unpublished",
                                "Nicht veröffentlicht",
                              )}
                        </Badge>
                        {!data.site.published_release_id && (
                          <NoticePopover
                            color="yellow"
                            label={labelText(
                              "Strona nie jest jeszcze opublikowana — link i kod QR zaczną działać dopiero po opublikowaniu.",
                              "This site is not published yet — the link and QR code will start working only after publishing.",
                              "Diese Seite ist noch nicht veröffentlicht — Link und QR-Code funktionieren erst nach der Veröffentlichung.",
                            )}
                          >
                            {labelText(
                              "Strona nie jest jeszcze opublikowana — link i kod QR zaczną działać dopiero po opublikowaniu.",
                              "This site is not published yet — the link and QR code will start working only after publishing.",
                              "Diese Seite ist noch nicht veröffentlicht — Link und QR-Code funktionieren erst nach der Veröffentlichung.",
                            )}
                          </NoticePopover>
                        )}
                      </Group>
                      {data.site.published_release_id && (
                        <Button
                          color="red"
                          variant="subtle"
                          size="xs"
                          disabled={busy}
                          onClick={() =>
                            setConfirmation({
                              action: "unpublish",
                              payload: {},
                              description: labelText(
                                "Zaproszenie przestanie być dostępne dla wszystkich gości. Treść i odpowiedzi zostaną zachowane.",
                                "The invitation will become unavailable to all guests. Content and answers will be kept.",
                                "Die Einladung wird für alle Gäste gesperrt. Inhalte und Antworten bleiben erhalten.",
                              ),
                            })
                          }
                        >
                          {labelText(
                            "Wycofaj publikację",
                            "Unpublish",
                            "Veröffentlichung zurückziehen",
                          )}
                        </Button>
                      )}
                    </Group>
                    <div data-ui="publication-url-wrapper">
                      <CopyableLinkRow
                        value={data.url}
                        copyLabel={labelText(
                          "Kopiuj adres strony",
                          "Copy general link",
                          "Allgemeinen Link kopieren",
                        )}
                        copiedMessage={labelText(
                          "Skopiowano adres strony.",
                          "General invitation link copied.",
                          "Allgemeiner Einladungslink kopiert.",
                        )}
                        openAction={
                          data.site.published_release_id
                            ? {
                                label: labelText(
                                  "Otwórz stronę",
                                  "Open invitation",
                                  "Einladung öffnen",
                                ),
                                href: data.url,
                              }
                            : undefined
                        }
                      />
                    </div>
                    <QrCodeCard url={data.url} />
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        try {
                          void action("settings", {
                            mode,
                            code: code || undefined,
                            variant,
                            deadline: deadlineIso(deadline),
                            version: data.site.access_version,
                          });
                        } catch (error) {
                          toast.error((error as Error).message);
                        }
                      }}
                    >
                      <Stack>
                        <Select
                          label={labelText(
                            "Dostęp do całej realizacji",
                            "Invitation access",
                            "Zugang zur Einladung",
                          )}
                          value={mode}
                          onChange={(v) => setMode(v || "public")}
                          data={[
                            {
                              value: "public",
                              label: labelText(
                                "Publiczny",
                                "Public",
                                "Öffentlich",
                              ),
                            },
                            {
                              value: "code",
                              label: labelText(
                                "Wspólny kod dostępu",
                                "Shared access code",
                                "Gemeinsamer Zugangscode",
                              ),
                            },
                          ]}
                        />
                        {mode === "code" && (
                          <PasswordInput
                            label={labelText(
                              "Nowy kod dostępu (minimum 8 znaków)",
                              "New access code (at least 8 characters)",
                              "Neuer Zugangscode (mindestens 8 Zeichen)",
                            )}
                            description={labelText(
                              "Pozostaw puste, aby zachować istniejący kod.",
                              "Leave empty to keep the existing code.",
                              "Leer lassen, um den bisherigen Code zu behalten.",
                            )}
                            value={code}
                            onChange={(e) => setCode(e.currentTarget.value)}
                            minLength={8}
                            maxLength={128}
                          />
                        )}
                        <Select
                          label={labelText(
                            "Wariant strony ogólnej",
                            "General invitation variant",
                            "Variante der allgemeinen Einladung",
                          )}
                          description={labelText(
                            "Wariant musi istnieć w opublikowanej wersji. Najpierw opublikuj zmiany struktury.",
                            "The variant must exist in the published version. Publish structural changes first.",
                            "Die Variante muss veröffentlicht sein. Strukturänderungen zuerst veröffentlichen.",
                          )}
                          data={options}
                          value={variant}
                          onChange={(v) => setVariant(v || "")}
                          required
                        />
                        <TextInput
                          type="datetime-local"
                          label={labelText(
                            "Termin RSVP — czas w Polsce (Europe/Warsaw)",
                            "RSVP deadline — Poland time",
                            "Antwortfrist — polnische Zeit",
                          )}
                          value={deadline}
                          onChange={(e) => setDeadline(e.currentTarget.value)}
                        />
                        <Text size="sm">
                          {labelText(
                            "Zapis ustawień unieważni dotychczasowe sesje dostępu. Cofnięcie treści nie zmienia ustawień ani odpowiedzi.",
                            "Saving settings invalidates existing access sessions. Restoring content does not change settings or responses.",
                            "Neue Einstellungen beenden bestehende Sitzungen. Wiederherstellung von Inhalten ändert keine Einstellungen oder Antworten.",
                          )}
                        </Text>
                        <ActionButton
                          disabled={busy}
                          type="submit"
                          loading={operation === "settings"}
                        >
                          {labelText(
                            "Zapisz ustawienia dostępu",
                            "Save access settings",
                            "Zugangseinstellungen speichern",
                          )}
                        </ActionButton>
                      </Stack>
                    </form>
                    <Card withBorder>
                      <Stack gap="sm">
                        <Text fw={600}>
                          {labelText(
                            "Tryb RSVP i samorejestracja",
                            "RSVP mode & self-registration",
                            "RSVP-Modus & Selbstregistrierung",
                          )}
                        </Text>
                        <Switch
                          label={labelText(
                            "Włącz RSVP na stronie (wyłącz dla trybu czysto informacyjnego)",
                            "Enable RSVP on site (disable for info-only mode)",
                            "RSVP auf der Seite aktivieren (für reinen Infomodus deaktivieren)",
                          )}
                          checked={rsvpEnabled}
                          onChange={(e) =>
                            setRsvpEnabled(e.currentTarget.checked)
                          }
                        />
                        <Switch
                          label={labelText(
                            "Pozwól gościom spoza listy na samorejestrację (kolejka do akceptacji)",
                            "Allow unlisted guests to self-register (approval queue)",
                            "Selbstregistrierung nicht gelisteter Gäste erlauben",
                          )}
                          checked={allowSelfRegistration}
                          disabled={!rsvpEnabled}
                          onChange={(e) =>
                            setAllowSelfRegistration(e.currentTarget.checked)
                          }
                        />
                        {rsvpEnabled &&
                          (() => {
                            const availableEvents = data.availableEvents || [];
                            const savedMode =
                              data.site.rsvp_attendance_mode ?? "overall";
                            const savedEventIds =
                              data.site.rsvp_event_ids ?? [];
                            const fallbackVariants =
                              attendanceMode === "events" &&
                              selectedEventIds.length > 0
                                ? data.variants.filter(
                                    (v) =>
                                      !availableEvents.some(
                                        (ev) =>
                                          selectedEventIds.includes(ev.id) &&
                                          ev.variantIds.includes(v.id),
                                      ),
                                  )
                                : [];
                            const modeChanged = attendanceMode !== savedMode;
                            const removedAnsweredEvent =
                              attendanceMode === "events" &&
                              savedMode === "events" &&
                              savedEventIds.some(
                                (id) =>
                                  !selectedEventIds.includes(id) &&
                                  data.answers.some((a) => a.event_id === id),
                              );
                            const hasExistingAnswers = data.answers.length > 0;
                            const showChangeWarning =
                              hasExistingAnswers &&
                              (modeChanged || removedAnsweredEvent);

                            return (
                              <Stack gap="xs" pt="xs">
                                <Radio.Group
                                  label={labelText(
                                    "O co pytamy w RSVP",
                                    "What RSVP asks about",
                                    "Wonach im RSVP gefragt wird",
                                  )}
                                  value={attendanceMode}
                                  onChange={(val) => {
                                    const next = val as RsvpAttendanceMode;
                                    setAttendanceMode(next);
                                    if (
                                      next === "events" &&
                                      selectedEventIds.length === 0 &&
                                      availableEvents.length > 0
                                    ) {
                                      setSelectedEventIds(
                                        availableEvents.map((e) => e.id),
                                      );
                                    }
                                  }}
                                >
                                  <Stack gap="xs" mt={4}>
                                    <Radio
                                      value="overall"
                                      label={labelText(
                                        "Całe wydarzenie jako jedno",
                                        "Whole event as one",
                                        "Gesamte Veranstaltung als Ganzes",
                                      )}
                                      description={labelText(
                                        "Jedno pytanie „Tak / Nie” dla każdej osoby (niezależnie od liczby punktów w programie).",
                                        "One Yes / No question per guest, regardless of schedule items.",
                                        "Eine Ja/Nein-Frage pro Gast, unabhängig von den Programmpunkten.",
                                      )}
                                    />
                                    <Radio
                                      value="events"
                                      label={labelText(
                                        "Wybrane punkty z programu",
                                        "Selected schedule events",
                                        "Ausgewählte Programmpunkte",
                                      )}
                                      description={labelText(
                                        "Osobne pytanie o obecność dla każdego zaznaczonego punktu harmonogramu.",
                                        "Separate attendance question for each selected schedule event.",
                                        "Separate Teilnahmefrage für jeden ausgewählten Programmpunkt.",
                                      )}
                                    />
                                  </Stack>
                                </Radio.Group>

                                {attendanceMode === "events" && (
                                  <Stack gap={6} pl="md">
                                    {availableEvents.length === 0 ? (
                                      <Text size="xs" c="dimmed">
                                        {labelText(
                                          "Brak punktów programu w konfiguracji. Dodaj wydarzenia w Treści lub użyj opcji „Całe wydarzenie jako jedno”.",
                                          "No schedule events configured yet. Add events in Content or use “Whole event as one”.",
                                          "Keine Programmpunkte vorhanden. Füge Programmpunkte unter Inhalt hinzu oder wähle „Gesamte Veranstaltung als Ganzes“.",
                                        )}
                                      </Text>
                                    ) : (
                                      <>
                                        {availableEvents.map((ev) => (
                                          <Checkbox
                                            key={ev.id}
                                            size="sm"
                                            label={ev.title}
                                            checked={selectedEventIds.includes(
                                              ev.id,
                                            )}
                                            onChange={(e) => {
                                              const checked =
                                                e.currentTarget.checked;
                                              setSelectedEventIds((old) =>
                                                checked
                                                  ? old.includes(ev.id)
                                                    ? old
                                                    : [...old, ev.id]
                                                  : old.filter(
                                                      (id) => id !== ev.id,
                                                    ),
                                              );
                                            }}
                                          />
                                        ))}
                                        {selectedEventIds.length === 0 && (
                                          <Text size="xs" c="red">
                                            {labelText(
                                              "Zaznacz co najmniej jeden punkt z programu.",
                                              "Select at least one schedule event.",
                                              "Wähle mindestens einen Programmpunkt aus.",
                                            )}
                                          </Text>
                                        )}
                                      </>
                                    )}
                                    {fallbackVariants.length > 0 && (
                                      <Alert
                                        color="blue"
                                        variant="light"
                                        py="xs"
                                      >
                                        <Text size="xs">
                                          {labelText(
                                            `Warianty bez żadnego z wybranych punktów (${fallbackVariants.map((v) => v.label).join(", ")}): goście tych wariantów zostaną zapytani o obecność na całym wydarzeniu.`,
                                            `Variants with none of the selected events (${fallbackVariants.map((v) => v.label).join(", ")}): guests in these variants will be asked about the whole event.`,
                                            `Varianten ohne ausgewählten Programmpunkt (${fallbackVariants.map((v) => v.label).join(", ")}): Gäste dieser Varianten werden nach der gesamten Veranstaltung gefragt.`,
                                          )}
                                        </Text>
                                      </Alert>
                                    )}
                                  </Stack>
                                )}

                                {showChangeWarning && (
                                  <Alert color="yellow" variant="light" py="xs">
                                    <Text size="xs">
                                      {labelText(
                                        "Część gości już odpowiedziała. Zmiana trybu lub odznaczenie punktu sprawi, że dotychczasowe odpowiedzi nie będą widoczne w nowym układzie (nie zostaną usunięte).",
                                        "Some guests have already responded. Changing the mode or unchecking an event will hide previous answers in the new layout (they will not be deleted).",
                                        "Einige Gäste haben bereits geantwortet. Durch das Ändern des Modus oder Abwählen eines Punktes werden bisherige Antworten im neuen Layout nicht angezeigt (nicht gelöscht).",
                                      )}
                                    </Text>
                                  </Alert>
                                )}
                              </Stack>
                            );
                          })()}
                        <ActionButton
                          disabled={
                            busy ||
                            (rsvpEnabled &&
                              attendanceMode === "events" &&
                              selectedEventIds.length === 0)
                          }
                          loading={operation === "rsvp-options"}
                          onClick={() =>
                            void action("rsvp-options", {
                              rsvpEnabled,
                              allowSelfRegistration:
                                rsvpEnabled && allowSelfRegistration,
                              attendance: rsvpEnabled
                                ? {
                                    mode: attendanceMode,
                                    eventIds: selectedEventIds,
                                  }
                                : undefined,
                              version: data.site.access_version,
                            })
                          }
                        >
                          {labelText(
                            "Zapisz tryb RSVP",
                            "Save RSVP mode",
                            "RSVP-Modus speichern",
                          )}
                        </ActionButton>
                      </Stack>
                    </Card>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="questions">
                <Accordion.Control>
                  {labelText(
                    "Pytania do gości",
                    "Guest questions",
                    "Fragen an Gäste",
                  )}
                </Accordion.Control>
                <Accordion.Panel>
                  <RsvpQuestionsEditor
                    key={data.site.access_version}
                    initialQuestions={data.questions || []}
                    questionAnswers={data.questionAnswers || []}
                    variants={options}
                    locale={data.locale}
                    busy={busy}
                    saving={operation === "save-questions"}
                    onSave={(nextQuestions) =>
                      void action("save-questions", {
                        questions: nextQuestions,
                        version: data.site.access_version,
                      })
                    }
                  />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
            <Group gap="xs">
              <Button
                disabled={busy}
                onClick={() => {
                  setEditingInvite(null);
                  setEditorOpen(true);
                }}
              >
                {labelText(
                  "Nowe zaproszenie",
                  "New invitation",
                  "Neue Einladung",
                )}
              </Button>
              <Menu position="bottom-start" shadow="md">
                <Menu.Target>
                  <ActionIcon
                    variant="light"
                    size="lg"
                    aria-label={labelText(
                      "Więcej opcji CSV",
                      "More CSV options",
                      "Weitere CSV-Optionen",
                    )}
                    title={labelText(
                      "Import i eksport CSV",
                      "CSV import and export",
                      "CSV-Import und -Export",
                    )}
                  >
                    <DotsThreeVerticalIcon size={20} weight="bold" />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<DownloadSimpleIcon size={16} />}
                    onClick={() =>
                      download(
                        "odpowiedzi-rsvp.csv",
                        formatRsvpCsv(data, answerMap, labelText),
                      )
                    }
                  >
                    {labelText(
                      "Eksport RSVP do CSV",
                      "Export RSVP to CSV",
                      "RSVP als CSV exportieren",
                    )}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<UploadSimpleIcon size={16} />}
                    disabled={busy}
                    onClick={() => csvInputRef.current?.click()}
                  >
                    {labelText(
                      "Importuj gości z CSV",
                      "Import guests from CSV",
                      "Gäste aus CSV importieren",
                    )}
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<FileCsvIcon size={16} />}
                    onClick={() =>
                      download(
                        "goscie-wzor.csv",
                        csvFile([
                          ["grupa", "osoby", "towarzyszace"],
                          [
                            "Rodzina Kowalskich",
                            "Anna Kowalska|Jan Kowalski",
                            "1",
                          ],
                        ]),
                      )
                    }
                  >
                    {labelText(
                      "Pobierz wzór CSV",
                      "Download CSV template",
                      "CSV-Vorlage herunterladen",
                    )}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  if (file.size > 200_000) {
                    toast.error(
                      labelText(
                        "Plik CSV jest za duży (maks. 200 kB).",
                        "CSV file is too large (max. 200 kB).",
                        "CSV-Datei ist zu groß (max. 200 kB).",
                      ),
                    );
                    return;
                  }
                  void file
                    .text()
                    .then((source) => {
                      setImported(
                        parseGuestCsv(
                          source,
                          variant || options[0]?.value || "",
                        ),
                      );
                      setImportId(crypto.randomUUID());
                      setImportOpen(true);
                    })
                    .catch((e) => toast.error(e.message));
                }}
              />
            </Group>
            {!!importLinks.length && (
              <Alert
                title={labelText(
                  "Linki zaimportowanych zaproszeń",
                  "Imported invitation links",
                  "Links importierter Einladungen",
                )}
              >
                <Stack gap="xs">
                  <Text>
                    {labelText(
                      "Zapisz linki i kody w bezpiecznym miejscu. Umożliwiają dostęp do konkretnych zaproszeń.",
                      "Store these links and codes securely. They provide access to individual invitations.",
                      "Links und Codes sicher aufbewahren.",
                    )}
                  </Text>
                  {importLinks.some((l) => l.id && collisions.has(l.id)) && (
                    <Alert color="yellow">
                      {labelText(
                        "Uwaga: wśród zaimportowanych osób są powtarzające się imiona i nazwiska. Przekaż tym osobom wspólny link z kodem weryfikacyjnym albo ich link osobisty.",
                        "Warning: some imported guests share the same name as other invitations. Share the general link with their verification code or their personal link.",
                        "Hinweis: Einige importierte Gäste haben identische Namen. Geben Sie den allgemeinen Link mit Code oder den persönlichen Link weiter.",
                      )}
                    </Alert>
                  )}
                  <Button
                    onClick={() =>
                      download(
                        "linki-zaproszen.csv",
                        csvFile([
                          ["Zaproszenie", "Kod", "Link"],
                          ...importLinks.map((i) => [
                            i.label,
                            i.shortCode || "",
                            i.url,
                          ]),
                        ]),
                      )
                    }
                  >
                    {labelText(
                      "Pobierz linki i kody (CSV)",
                      "Download links & codes (CSV)",
                      "Links & Codes herunterladen (CSV)",
                    )}
                  </Button>
                </Stack>
              </Alert>
            )}
            <InvitationEditorModal
              opened={editorOpen}
              invitation={editingInvite}
              answeredGuestIds={answeredGuestIds}
              variants={options}
              defaultVariantId={variant || options[0]?.value || ""}
              busy={busy}
              saving={
                operation === "create" ||
                operation === "update" ||
                operation === "import"
              }
              onClose={() => {
                setEditorOpen(false);
                setEditingInvite(null);
              }}
              onSubmit={handleEditorSubmit}
            />
            <InvitationShareModal
              target={shareModal}
              onClose={() => setShareModal(null)}
              onAddAnother={() => {
                setShareModal(null);
                setEditingInvite(null);
                setEditorOpen(true);
              }}
            />
            <Title order={3}>
              {labelText(
                "Lista zaproszeń i RSVP",
                "Invitations and RSVP",
                "Einladungen und RSVP",
              )}
            </Title>
            {pendingInvitations.length > 0 && (
              <Alert
                color="orange"
                title={labelText(
                  `Samorejestracje oczekujące na akceptację (${pendingInvitations.length})`,
                  `Self-registrations pending approval (${pendingInvitations.length})`,
                  `Ausstehende Selbstregistrierungen (${pendingInvitations.length})`,
                )}
              >
                <Group justify="space-between" wrap="wrap">
                  <Text size="sm">
                    {labelText(
                      "Goście spoza listy zgłosili swoją obecność. Zatwierdź ich jako nowe zaproszenie lub połącz z istniejącym.",
                      "Unlisted guests submitted an RSVP. Approve as a new invitation or merge with an existing one.",
                      "Nicht gelistete Gäste haben geantwortet. Genehmigen oder mit bestehender Einladung zusammenführen.",
                    )}
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    color="orange"
                    onClick={() => {
                      setFilter("pending_match");
                      setPage(1);
                    }}
                  >
                    {labelText(
                      "Pokaż oczekujące",
                      "Show pending",
                      "Ausstehende anzeigen",
                    )}
                  </Button>
                </Group>
              </Alert>
            )}
            {!data.invitations.length && (
              <Text>
                {labelText(
                  "Dodaj pierwszą osobę lub grupę.",
                  "Add your first person or group.",
                  "Erste Person oder Gruppe hinzufügen.",
                )}
              </Text>
            )}
            <FilterGrid>
              <TextInput
                label={labelText(
                  "Szukaj osoby, grupy lub kodu",
                  "Search person, group or code",
                  "Person, Gruppe oder Code suchen",
                )}
                value={query}
                onChange={(e) => {
                  setQuery(e.currentTarget.value);
                  setPage(1);
                }}
              />
              <Select
                label={labelText("Odpowiedzi", "Responses", "Antworten")}
                value={filter}
                onChange={(v) => {
                  setFilter(v || "all");
                  setPage(1);
                }}
                data={[
                  {
                    value: "all",
                    label: labelText("Wszystkie", "All", "Alle"),
                  },
                  {
                    value: "pending",
                    label: labelText("Czekamy", "Pending", "Offen"),
                  },
                  {
                    value: "partial",
                    label: labelText("Częściowo", "Partial", "Teilweise"),
                  },
                  {
                    value: "answered",
                    label: labelText(
                      "Odpowiedziały",
                      "Answered",
                      "Beantwortet",
                    ),
                  },
                  {
                    value: "pending_match",
                    label: labelText(
                      `Do akceptacji (${pendingInvitations.length})`,
                      `Pending review (${pendingInvitations.length})`,
                      `Ausstehend (${pendingInvitations.length})`,
                    ),
                  },
                  {
                    value: "revoked",
                    label: labelText("Cofnięte", "Revoked", "Widerrufen"),
                  },
                ]}
              />
            </FilterGrid>
            {!filtered.length && !!data.invitations.length && (
              <Text>
                {labelText(
                  "Brak wyników dla wybranych filtrów.",
                  "No matches for these filters.",
                  "Keine Treffer für diese Filter.",
                )}
              </Text>
            )}
            {!!filtered.length && (
              <InvitationTable
                invitations={visible}
                allActiveInvitations={active}
                answerMap={answerMap}
                byGuest={rsvpSummary.byGuest}
                byInvitation={rsvpSummary.byInvitation}
                collisions={collisions}
                questions={data.questions || []}
                questionAnswers={data.questionAnswers || []}
                publicUrl={data.url}
                publishedReleaseId={data.site.published_release_id}
                busy={busy}
                savingRsvp={operation === "rsvp"}
                sessionLinks={sessionLinks}
                onCopy={(text, msg) => void copyText(text, msg)}
                onShowShare={(inv) => {
                  const personal = sessionLinks[inv.id];
                  openShareModal(
                    {
                      groupName: inv.group_name,
                      guests: inv.guests,
                      variantId: inv.variant_id,
                      url: personal ?? data.url,
                      shortCode: inv.short_code,
                      isPersonalUrl: Boolean(personal),
                    },
                    data.variants,
                  );
                }}
                onEdit={(inv) => {
                  setEditingInvite(inv);
                  setEditorOpen(true);
                }}
                onRotate={(inv) =>
                  setConfirmation({
                    action: "rotate",
                    payload: { id: inv.id },
                    description: labelText(
                      "Poprzedni link przestanie dzia�a�. Nowy link trzeba przekaza� ponownie.",
                      "The previous link will stop working. Share the new link again.",
                      "Der bisherige Link wird ung�ltig. Den neuen Link erneut weitergeben.",
                    ),
                  })
                }
                onRevoke={(inv) =>
                  setConfirmation({
                    action: "revoke",
                    payload: { id: inv.id },
                    description: labelText(
                      "To zaproszenie utraci dost�p. Dotychczasowe odpowiedzi zostan� zachowane.",
                      "This invitation will lose access. Existing answers will be kept.",
                      "Diese Einladung verliert den Zugang. Antworten bleiben erhalten.",
                    ),
                  })
                }
                onApprovePending={(id) =>
                  void action("approve-pending", { id })
                }
                onMergePending={(pendingId, targetId, targetGuestId) =>
                  void action("merge-pending", {
                    pendingId,
                    targetId,
                    targetGuestId,
                  })
                }
                onConvertCompanion={(inv, guestId, name) =>
                  void action("convert-companion", {
                    id: inv.id,
                    version: inv.version,
                    guestId,
                    name,
                  })
                }
                onSaveRsvp={(payload) => action("rsvp", payload)}
              />
            )}
            {totalPages > 1 && (
              <Pagination
                total={totalPages}
                value={Math.min(page, totalPages)}
                onChange={setPage}
              />
            )}
          </>
        )}
        <Modal
          opened={!!confirmation}
          onClose={() => !busy && setConfirmation(null)}
          title={labelText(
            "Potwierdź zmianę",
            "Confirm change",
            "Änderung bestätigen",
          )}
        >
          <Stack>
            <Text>{confirmation?.description}</Text>
            <ModalStickyFooter justify="flex-end">
              <Button
                variant="default"
                disabled={busy}
                onClick={() => setConfirmation(null)}
              >
                {labelText("Anuluj", "Cancel", "Abbrechen")}
              </Button>
              <ActionButton
                disabled={busy}
                color="red"
                pendingLabel={operationMessage}
                loading={
                  !!operation &&
                  ["rotate", "revoke", "unpublish"].includes(operation)
                }
                onClick={() => {
                  if (confirmation) {
                    const value = confirmation;
                    void action(value.action, value.payload);
                  }
                }}
              >
                {labelText("Potwierdź", "Confirm", "Bestätigen")}
              </ActionButton>
            </ModalStickyFooter>
          </Stack>
        </Modal>
        <Modal
          opened={importOpen}
          onClose={() => !busy && setImportOpen(false)}
          title={labelText(
            "Podgląd importu",
            "Import preview",
            "Importvorschau",
          )}
        >
          <Stack>
            <Text>
              {labelText(
                "Zaproszenia do utworzenia",
                "Invitations to create",
                "Neue Einladungen",
              )}
              : {imported.length}
            </Text>
            <Select
              label={labelText(
                "Wariant dla importowanych zaproszeń",
                "Variant for imported invitations",
                "Variante für importierte Einladungen",
              )}
              data={options}
              value={imported[0]?.variantId}
              onChange={(v) =>
                setImported((old) =>
                  old.map((i) => ({ ...i, variantId: v || i.variantId })),
                )
              }
            />
            {imported.slice(0, 10).map((entry, i) => (
              <Text size="sm" key={i}>
                {invitationDisplayName({
                  groupName: entry.groupName,
                  guests: entry.guests,
                })}
              </Text>
            ))}
            <Text size="sm">
              {labelText(
                "Istniejące zaproszenia nie zostaną nadpisane. Przed importem sprawdź, czy zaproszenia nie występują już na liście.",
                "Existing invitations will not be overwritten. Check whether these invitations are already on your list.",
                "Bestehende Einladungen werden nicht überschrieben. Prüfen, ob die Einladungen bereits vorhanden sind.",
              )}
            </Text>
            <ModalStickyFooter justify="flex-end">
              <ActionButton
                loading={operation === "import"}
                pendingLabel={loadingText(language, "import")}
                onClick={() =>
                  void action("import", {
                    requestId: importId,
                    entries: imported,
                  })
                }
              >
                {labelText(
                  "Zatwierdź import",
                  "Confirm import",
                  "Import bestätigen",
                )}
              </ActionButton>
            </ModalStickyFooter>
          </Stack>
        </Modal>
      </Stack>
    </div>
  );
}
