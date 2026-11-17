"use client";
import { ActionButton } from "./ActionButton";
import { NoticePopover } from "./NoticePopover";
import { LoadingState, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Modal,
  FileButton,
  Accordion,
  Pagination,
  SimpleGrid,
  Skeleton,
  Switch,
} from "@mantine/core";
import { apiFetch } from "./Dashboard";
import {
  csvFile,
  parseGuestCsv,
  type ImportedInvitation,
} from "@invitations/domain/operations";
import {
  invitationDisplayName,
  summarizeRsvp,
} from "@invitations/domain/invitation";
import { summarizeQuestions } from "@invitations/domain/rsvp-questions";
import {
  detectGuestCollisions,
  formatShareMessage,
} from "@invitations/domain/hybrid-rsvp";
import {
  formatRsvpCsv,
  type InvitationRow,
  type Management,
} from "../lib/guest-management";
import { usePanelI18n } from "../lib/i18n";
import {
  InvitationEditorModal,
  type InvitationEditorSubmit,
} from "./InvitationEditorModal";
import { InvitationTable } from "./InvitationTable";
import { RsvpQuestionsEditor } from "./RsvpQuestionsEditor";
import { RsvpSummaryCards } from "./RsvpSummaryCards";
import { QrCodeCard } from "./QrCodeCard";
import { FilterGrid } from "./form-layout.styles";
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
  const [data, setData] = useState<Management | null>(null),
    [message, setMessage] = useState("");
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
  const [link, setLink] = useState("");
  const [lastShortCode, setLastShortCode] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvite, setEditingInvite] = useState<InvitationRow | null>(
    null,
  );
  function accept(result: Management) {
    setData(result);
    setMode(result.site.access_mode);
    setVariant(result.site.public_variant_id || result.variants[0]?.id || "");
    setDeadline(localDeadline(result.site.rsvp_deadline));
    setRsvpEnabled(result.site.rsvp_enabled ?? true);
    setAllowSelfRegistration(result.site.allow_self_registration ?? false);
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
        }
      })
      .catch((e) => {
        if (alive) setMessage(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [endpoint, loadAttempt]);
  async function copyText(text: string, successText: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(successText);
    } catch {
      setMessage(
        labelText(
          "Nie udało się skopiować automatycznie. Skopiuj ręcznie.",
          "Could not copy automatically. Please copy manually.",
          "Automatisches Kopieren fehlgeschlagen. Bitte manuell kopieren.",
        ),
      );
    }
  }
  async function action(action: string, payload: unknown) {
    if (!start(action)) return false;
    setMessage("");
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
      if (result.url) {
        setLink(result.url);
        setLastShortCode(result.shortCode ?? null);
      }
      if (action === "import") {
        setImported([]);
        setImportOpen(false);
        setImportLinks(result.links || []);
      }
      if (action === "revoke") {
        setLink("");
        setLastShortCode(null);
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
      setConfirmation(null);
      setEditorOpen(false);
      setEditingInvite(null);
      setMessage(
        result.alreadyImported
          ? labelText(
              "Ten import został już zapisany. Nie utworzono duplikatów.",
              "This import was already saved. No duplicates created.",
              "Dieser Import wurde bereits gespeichert. Keine Duplikate erstellt.",
            )
          : labelText("Zapisano.", "Saved.", "Gespeichert."),
      );
      return true;
    } catch (e) {
      setMessage((e as Error).message);
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
        {message && <Alert role="status">{message}</Alert>}
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
        {!loading && !data && message && (
          <Button
            variant="light"
            onClick={() => {
              setMessage("");
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
                    <Group gap="xs" wrap="wrap">
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
                      {data.site.published_release_id && (
                        <Button
                          component="a"
                          href={data.url}
                          target="_blank"
                          rel="noreferrer"
                          variant="subtle"
                        >
                          {labelText(
                            "Otwórz stronę",
                            "Open invitation",
                            "Einladung öffnen",
                          )}
                        </Button>
                      )}
                      <Button
                        variant="light"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(data.url)
                            .then(() =>
                              setMessage(
                                labelText(
                                  "Skopiowano adres strony.",
                                  "General invitation link copied.",
                                  "Allgemeiner Einladungslink kopiert.",
                                ),
                              ),
                            )
                            .catch(() => setMessage(data.url));
                        }}
                      >
                        {labelText(
                          "Kopiuj adres strony",
                          "Copy general link",
                          "Allgemeinen Link kopieren",
                        )}
                      </Button>
                      {data.site.published_release_id && (
                        <Button
                          color="red"
                          variant="subtle"
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
                    <QrCodeCard url={data.url} onMessage={setMessage} />
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
                          setMessage((error as Error).message);
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
                        <ActionButton
                          disabled={busy}
                          loading={operation === "rsvp-options"}
                          onClick={() =>
                            void action("rsvp-options", {
                              rsvpEnabled,
                              allowSelfRegistration:
                                rsvpEnabled && allowSelfRegistration,
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
            <Group>
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
              <Button
                variant="light"
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
              </Button>
              <FileButton
                accept=".csv,text/csv"
                onChange={(file) => {
                  if (!file) return;
                  if (file.size > 200_000) {
                    setMessage(
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
                    .catch((e) => setMessage(e.message));
                }}
              >
                {(props) => (
                  <Button {...props} disabled={busy}>
                    {labelText(
                      "Importuj gości z CSV",
                      "Import guests from CSV",
                      "Gäste aus CSV importieren",
                    )}
                  </Button>
                )}
              </FileButton>
              <Button
                variant="subtle"
                onClick={() =>
                  download(
                    "goscie-wzor.csv",
                    csvFile([
                      ["grupa", "osoby", "towarzyszace"],
                      ["Rodzina Kowalskich", "Anna Kowalska|Jan Kowalski", "1"],
                    ]),
                  )
                }
              >
                {labelText(
                  "Pobierz wzór CSV",
                  "Download CSV template",
                  "CSV-Vorlage herunterladen",
                )}
              </Button>
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
                          ["Rodzina", "Kod", "Link"],
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
            {link && (
              <Alert
                title={labelText(
                  "Link do przekazania odbiorcy",
                  "Family link to share with the recipient",
                  "Familienlink für den Empfänger",
                )}
              >
                <Stack gap="xs">
                  <Text size="sm">
                    {labelText(
                      "To link rodzinny — umożliwia odpowiedzi za wskazane osoby. Przekaż go tylko odbiorcom.",
                      "This family link allows responses for the invited people. Share it only with recipients.",
                      "Dieser Familienlink erlaubt Antworten für eingeladene Personen. Nur an Empfänger weitergeben.",
                    )}
                  </Text>
                  {lastShortCode && (
                    <Text size="sm" fw={600}>
                      {labelText(
                        "Kod zaproszenia",
                        "Invitation code",
                        "Einladungscode",
                      )}
                      : {lastShortCode}
                    </Text>
                  )}
                  <TextInput
                    aria-label={labelText(
                      "Wygenerowany link",
                      "Generated link",
                      "Erstellter Link",
                    )}
                    readOnly
                    value={link}
                  />
                  <Group>
                    <Button
                      onClick={() =>
                        void copyText(
                          link,
                          labelText(
                            "Skopiowano link.",
                            "Link copied.",
                            "Link kopiert.",
                          ),
                        )
                      }
                    >
                      {labelText("Kopiuj link", "Copy link", "Link kopieren")}
                    </Button>
                    <Button
                      variant="light"
                      onClick={() =>
                        void copyText(
                          formatShareMessage({
                            locale: data.locale,
                            displayName: data.displayName,
                            kind: "personal",
                            url: link,
                            deadline: data.site.rsvp_deadline
                              ? localDeadline(data.site.rsvp_deadline).replace(
                                  "T",
                                  " ",
                                )
                              : null,
                          }),
                          labelText(
                            "Skopiowano wiadomość z linkiem osobistym.",
                            "Personal link message copied.",
                            "Nachricht mit persönlichem Link kopiert.",
                          ),
                        )
                      }
                    >
                      {labelText(
                        "Kopiuj link osobisty",
                        "Copy personal link",
                        "Persönlichen Link kopieren",
                      )}
                    </Button>
                    {lastShortCode && (
                      <Button
                        variant="light"
                        onClick={() =>
                          void copyText(
                            formatShareMessage({
                              locale: data.locale,
                              displayName: data.displayName,
                              kind: "shared_with_code",
                              url: data.url,
                              shortCode: lastShortCode,
                              deadline: data.site.rsvp_deadline
                                ? localDeadline(
                                    data.site.rsvp_deadline,
                                  ).replace("T", " ")
                                : null,
                            }),
                            labelText(
                              "Skopiowano link ogólny + kod.",
                              "General link + code copied.",
                              "Allgemeiner Link + Code kopiert.",
                            ),
                          )
                        }
                      >
                        {labelText(
                          "Kopiuj link + kod",
                          "Copy link + code",
                          "Link + Code kopieren",
                        )}
                      </Button>
                    )}
                  </Group>
                </Stack>
              </Alert>
            )}
            {link && (
              <QrCodeCard
                url={link}
                onMessage={setMessage}
                title={labelText(
                  "QR zaproszenia rodzinnego",
                  "Family invitation QR",
                  "QR der Familieneinladung",
                )}
              />
            )}
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
                locale={data.locale}
                displayName={data.displayName}
                publicUrl={data.url}
                deadline={
                  data.site.rsvp_deadline
                    ? localDeadline(data.site.rsvp_deadline).replace("T", " ")
                    : null
                }
                publishedReleaseId={data.site.published_release_id}
                busy={busy}
                savingRsvp={operation === "rsvp"}
                onCopy={(text, msg) => void copyText(text, msg)}
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
            {message && (
              <Alert role="alert" color="red">
                {message}
              </Alert>
            )}
            <Text>{confirmation?.description}</Text>
            <Group>
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
            </Group>
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
                "Istniejące zaproszenia nie zostaną nadpisane. Przed importem sprawdź, czy rodziny nie występują już na liście.",
                "Existing invitations will not be overwritten. Check whether these families are already on your list.",
                "Bestehende Einladungen werden nicht überschrieben. Prüfen, ob die Familien bereits vorhanden sind.",
              )}
            </Text>
            {message && <Alert>{message}</Alert>}
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
          </Stack>
        </Modal>
      </Stack>
    </div>
  );
}
