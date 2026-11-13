"use client";
import { ActionButton } from "./ActionButton";
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
  Textarea,
  TextInput,
  Title,
  Modal,
  FileButton,
  Checkbox,
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
  defaultQuestions,
  type ImportedInvitation,
  type QuestionSettings,
} from "@invitations/domain/operations";
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
  const [questions, setQuestions] =
    useState<QuestionSettings>(defaultQuestions);
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
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null),
    [note, setNote] = useState(""),
    [replies, setReplies] = useState<Record<string, string>>({});
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
    setQuestions(result.site.rsvp_questions || defaultQuestions);
  }
  useEffect(() => {
    let alive = true;
    apiFetch<Management>(endpoint)
      .then((result) => {
        if (alive) {
          setData(result);
          setQuestions(result.site.rsvp_questions || defaultQuestions);
          setMode(result.site.access_mode);
          setVariant(
            result.site.public_variant_id || result.variants[0]?.id || "",
          );
          setDeadline(localDeadline(result.site.rsvp_deadline));
          setRsvpEnabled(result.site.rsvp_enabled ?? true);
          setAllowSelfRegistration(result.site.allow_self_registration ?? false);
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
    if (!start(action)) return;
    setMessage("");
    try {
      const result = await apiFetch<{
        url?: string;
        shortCode?: string | null;
        links?: { id?: string; label: string; url: string; shortCode?: string | null }[];
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
      if (action === "questions") setQuestions(questions);
      if (action === "revoke") {
        setLink("");
        setLastShortCode(null);
      }
      const refreshed = await apiFetch<Management>(endpoint);
      if (action === "settings" || action === "rsvp-options") {
        accept(refreshed);
        if (action === "settings") setCode("");
      } else setData(refreshed);
      setConfirmation(null);
      setEditing(null);
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
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      end();
    }
  }
  function handleEditorSubmit(submission: InvitationEditorSubmit) {
    if (submission.action === "update" && submission.removedGuests) {
      setEditorOpen(false);
      setConfirmation({
        action: "update",
        payload: submission.payload,
        description: labelText(
          "Usunięte osoby nie będą mogły odpowiadać i znikną z aktywnych zestawień. Ich dotychczasowe RSVP pozostanie w historii.",
          "Removed people will disappear from active totals and cannot respond. Their existing RSVP remains in history.",
          "Entfernte Personen erscheinen nicht mehr in aktiven Auswertungen. Frühere Antworten bleiben archiviert.",
        ),
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
  const approvedMergeOptions = active.map((i) => ({
    value: i.id,
    label: `${i.label} (${i.guests.map((g) => g.name).join(", ")})`,
  }));
  const events = [
    ...new Map(
      active.flatMap((i) => i.events.map((e) => [e.id, e] as const)),
    ).values(),
  ];
  function invitationStatus(i: InvitationRow) {
    const values = i.guests.flatMap((g) =>
      i.events.map((e) => answerMap.get(`${i.id}:${g.id}:${e.id}`)),
    );
    return !values.length || values.some((v) => v === undefined)
      ? "missing"
      : values.some((v) => v === true)
        ? "yes"
        : "no";
  }
  const filtered = (data?.invitations || []).filter(
    (i) =>
      `${i.label} ${i.short_code} ${i.guests.map((g) => g.name).join(" ")} ${i.emails.join(" ")}`
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
              invitationStatus(i) === filter),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice(
    (Math.min(page, totalPages) - 1) * 20,
    Math.min(page, totalPages) * 20,
  );
  return (
    <Card withBorder aria-busy={loading}>
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
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Card withBorder>
                <Text>
                  {labelText("Aktywni goście", "Active guests", "Aktive Gäste")}
                </Text>
                <Title order={3}>
                  {active.reduce((sum, i) => sum + i.guests.length, 0)}
                </Title>
              </Card>
              <Card withBorder>
                <Text>
                  {labelText(
                    "Zaproszenia bez kompletu odpowiedzi",
                    "Invitations with missing answers",
                    "Einladungen mit fehlenden Antworten",
                  )}
                </Text>
                <Title order={3}>
                  {
                    active.filter((i) => invitationStatus(i) === "missing")
                      .length
                  }
                </Title>
              </Card>
              <Card withBorder>
                <Text>
                  {labelText(
                    "Aktywne zaproszenia",
                    "Active invitations",
                    "Aktive Einladungen",
                  )}
                </Text>
                <Title order={3}>{active.length}</Title>
              </Card>
            </SimpleGrid>
            {events.map((event) => {
              const values = active
                .filter((i) => i.events.some((e) => e.id === event.id))
                .flatMap((i) =>
                  i.guests.map((g) =>
                    answerMap.get(`${i.id}:${g.id}:${event.id}`),
                  ),
                );
              return (
                <Card withBorder key={event.id}>
                  <Text fw={600}>{event.title}</Text>
                  <Text size="sm">
                    {labelText("Będą", "Attending", "Zusagen")}:{" "}
                    {values.filter((v) => v === true).length} ·{" "}
                    {labelText("Nie będą", "Declined", "Absagen")}:{" "}
                    {values.filter((v) => v === false).length} ·{" "}
                    {labelText(
                      "Brak odpowiedzi",
                      "No response",
                      "Keine Antwort",
                    )}
                    : {values.filter((v) => v === undefined).length}
                  </Text>
                </Card>
              );
            })}
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
                  <Stack>
                    <Group>
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
                      <Button
                        color="red"
                        variant="subtle"
                        disabled={busy || !data.site.published_release_id}
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
                    </Group>
                    <QrCodeCard
                      url={data.url}
                      published={!!data.site.published_release_id}
                      onMessage={setMessage}
                    />
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
                    "Pytania organizacyjne",
                    "Planning questions",
                    "Organisatorische Fragen",
                  )}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack>
                    <Text size="sm">
                      {labelText(
                        "Goście odpowiedzą osobno za każdą osobę. Zbieraj tylko potrzebne informacje. Wyłączenie pytania ukrywa je gościom, ale zachowuje wcześniejsze odpowiedzi w panelu.",
                        "Guests answer for each person. Collect only necessary information. Disabling a question hides it from guests and keeps previous answers in the panel.",
                        "Gäste antworten pro Person. Nur nötige Angaben abfragen. Deaktivierte Fragen bleiben im Panel archiviert.",
                      )}
                    </Text>
                    {(["diet", "lodging", "transport"] as const).map((key) => (
                      <Checkbox
                        key={key}
                        label={
                          key === "diet"
                            ? labelText(
                                "Dieta i alergie",
                                "Diet and allergies",
                                "Ernährung und Allergien",
                              )
                            : key === "lodging"
                              ? labelText(
                                  "Potrzeba noclegu",
                                  "Accommodation needed",
                                  "Übernachtung benötigt",
                                )
                              : labelText(
                                  "Potrzeba transportu",
                                  "Transport needed",
                                  "Transport benötigt",
                                )
                        }
                        checked={questions[key]}
                        onChange={(e) =>
                          setQuestions({
                            ...questions,
                            [key]: e.currentTarget.checked,
                          })
                        }
                      />
                    ))}
                    <ActionButton
                      disabled={busy}
                      loading={operation === "questions"}
                      onClick={() =>
                        void action("questions", {
                          questions,
                          version: data.site.access_version,
                        })
                      }
                    >
                      {labelText(
                        "Zapisz pytania",
                        "Save questions",
                        "Fragen speichern",
                      )}
                    </ActionButton>
                  </Stack>
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
                    formatRsvpCsv(data, events, answerMap, labelText),
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
                      ["rodzina", "goscie"],
                      ["Rodzina Kowalskich", "Anna|Jan"],
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
              variants={options}
              defaultVariantId={variant || options[0]?.value || ""}
              busy={busy}
              saving={operation === "create" || operation === "update"}
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
                      {labelText("Kod zaproszenia", "Invitation code", "Einladungscode")}:{" "}
                      {lastShortCode}
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
                published={!!data.site.published_release_id}
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
                  "Dodaj pierwszą osobę lub rodzinę.",
                  "Add your first person or family.",
                  "Erste Person oder Familie hinzufügen.",
                )}
              </Text>
            )}
            <FilterGrid>
              <TextInput
                label={labelText(
                  "Szukaj gościa, rodziny lub kodu",
                  "Search guest, family or code",
                  "Gast, Familie oder Code suchen",
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
                    value: "missing",
                    label: labelText(
                      "Brak kompletu odpowiedzi",
                      "Missing answers",
                      "Fehlende Antworten",
                    ),
                  },
                  {
                    value: "yes",
                    label: labelText("Będą", "Attending", "Zusagen"),
                  },
                  {
                    value: "no",
                    label: labelText("Odmówili", "Declined", "Absagen"),
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
            {visible.map((i) => {
              const allActiveGuests = [
                ...i.guests,
                ...(i.plus_one ? [i.plus_one] : []),
              ];
              const collidingNames = collisions.get(i.id);
              const isPending = i.review_status === "pending_match" && !i.revoked;
              return (
                <Card withBorder key={i.id}>
                  <Stack gap="sm">
                    <Group justify="space-between" wrap="wrap">
                      <Title order={4}>{i.label}</Title>
                      <Group gap="xs">
                        {i.short_code && (
                          <Badge variant="outline" color="dark">
                            {labelText("Kod", "Code", "Code")}: {i.short_code}
                          </Badge>
                        )}
                        {i.allow_plus_one && (
                          <Badge variant="light" color="blue">
                            +1
                          </Badge>
                        )}
                        {isPending && (
                          <Badge variant="filled" color="orange">
                            {labelText(
                              "Do akceptacji",
                              "Pending review",
                              "Ausstehend",
                            )}
                          </Badge>
                        )}
                        {collidingNames && (
                          <Badge variant="light" color="yellow">
                            {labelText(
                              "Kolizja imienia i nazwiska",
                              "Name collision",
                              "Namenskollision",
                            )}
                          </Badge>
                        )}
                        <Badge>
                          {i.revoked
                            ? labelText("Cofnięte", "Revoked", "Widerrufen")
                            : labelText("Aktywne", "Active", "Aktiv")}
                        </Badge>
                      </Group>
                    </Group>
                    {collidingNames && (
                      <Alert color="yellow">
                        <Group justify="space-between" wrap="wrap">
                          <Text size="sm">
                            {labelText(
                              `Powtarzające się dane: ${collidingNames.join(", ")}. Przekaż gościowi link ogólny wraz z kodem weryfikacyjnym ${i.short_code}.`,
                              `Duplicate name: ${collidingNames.join(", ")}. Share the general link with verification code ${i.short_code}.`,
                              `Doppelter Name: ${collidingNames.join(", ")}. Allgemeinen Link mit Code ${i.short_code} teilen.`,
                            )}
                          </Text>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() =>
                              void copyText(
                                formatShareMessage({
                                  locale: data.locale,
                                  displayName: data.displayName,
                                  kind: "shared_with_code",
                                  url: data.url,
                                  shortCode: i.short_code,
                                  deadline: data.site.rsvp_deadline
                                    ? localDeadline(
                                        data.site.rsvp_deadline,
                                      ).replace("T", " ")
                                    : null,
                                }),
                                labelText(
                                  `Skopiowano link + kod (${i.short_code}).`,
                                  `Copied link + code (${i.short_code}).`,
                                  `Link + Code kopiert (${i.short_code}).`,
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
                        </Group>
                      </Alert>
                    )}
                    {isPending && (
                      <Alert color="orange">
                        <Stack gap="xs">
                          <Text size="sm">
                            {labelText(
                              "Gość dopisał się samodzielnie na stronie. Zatwierdź jako nowe zaproszenie lub połącz z istniejącym zaproszeniem.",
                              "Guest self-registered on the site. Approve as a new invitation or merge into an existing invitation.",
                              "Gast hat sich selbst registriert. Genehmigen oder mit bestehender Einladung zusammenführen.",
                            )}
                          </Text>
                          <Group align="flex-end" wrap="wrap">
                            <Button
                              size="xs"
                              color="green"
                              disabled={busy}
                              onClick={() =>
                                void action("approve-pending", { id: i.id })
                              }
                            >
                              {labelText(
                                "Zatwierdź",
                                "Approve",
                                "Genehmigen",
                              )}
                            </Button>
                            {approvedMergeOptions.length > 0 && (
                              <>
                                <Select
                                  size="xs"
                                  placeholder={labelText(
                                    "Wybierz zaproszenie do połączenia",
                                    "Select invitation to merge into",
                                    "Einladung zum Zusammenführen wählen",
                                  )}
                                  data={approvedMergeOptions}
                                  value={mergeTargets[i.id] || null}
                                  onChange={(v) =>
                                    setMergeTargets((prev) => ({
                                      ...prev,
                                      [i.id]: v || "",
                                    }))
                                  }
                                  searchable
                                />
                                <Button
                                  size="xs"
                                  variant="light"
                                  disabled={busy || !mergeTargets[i.id]}
                                  onClick={() =>
                                    void action("merge-pending", {
                                      pendingId: i.id,
                                      targetId: mergeTargets[i.id],
                                    })
                                  }
                                >
                                  {labelText(
                                    "Połącz z istniejącym",
                                    "Merge with existing",
                                    "Zusammenführen",
                                  )}
                                </Button>
                              </>
                            )}
                          </Group>
                        </Stack>
                      </Alert>
                    )}
                    {allActiveGuests.map((g) => {
                      const isPlusOne = i.plus_one?.id === g.id;
                      return (
                        <div key={g.id}>
                          <Group gap="xs">
                            <Text fw={600}>{g.name}</Text>
                            {isPlusOne && (
                              <Badge size="xs" variant="outline">
                                +1
                              </Badge>
                            )}
                          </Group>
                          {i.events.map((event) => {
                            const value = answerMap.get(
                              `${i.id}:${g.id}:${event.id}`,
                            );
                            const a =
                              value === undefined
                                ? undefined
                                : { attending: value };
                            return (
                              <Text size="sm" key={event.id}>
                                {event.title}:{" "}
                                {a
                                  ? a.attending
                                    ? labelText("Tak", "Yes", "Ja")
                                    : labelText("Nie", "No", "Nein")
                                  : labelText(
                                      "Brak odpowiedzi",
                                      "No response",
                                      "Keine Antwort",
                                    )}
                              </Text>
                            );
                          })}
                        </div>
                      );
                    })}
                    {!!i.archived_guests?.length && (
                      <Text size="sm">
                        {labelText(
                          "Osoby archiwalne",
                          "Archived people",
                          "Archivierte Personen",
                        )}
                        : {i.archived_guests.map((g) => g.name).join(", ")}
                      </Text>
                    )}
                    {allActiveGuests.map((g) => {
                      const detail = i.guest_details?.[g.id];
                      return detail && Object.keys(detail).length ? (
                        <Text key={`details-${g.id}`} size="sm">
                          {g.name}
                          {i.plus_one?.id === g.id ? " (+1)" : ""}:{" "}
                          {detail.diet
                            ? `${labelText("dieta", "diet", "Ernährung")}: ${detail.diet} · `
                            : ""}
                          {detail.lodging === undefined
                            ? ""
                            : `${labelText("nocleg", "accommodation", "Übernachtung")}: ${detail.lodging ? labelText("tak", "yes", "ja") : labelText("nie", "no", "nein")} · `}
                          {detail.transport === undefined
                            ? ""
                            : `${labelText("transport", "transport", "Transport")}: ${detail.transport ? labelText("tak", "yes", "ja") : labelText("nie", "no", "nein")}`}
                        </Text>
                      ) : null;
                    })}
                    {i.note && <Text size="sm">Uwagi: {i.note}</Text>}
                    {data.answers.some(
                      (a) =>
                        a.invitation_id === i.id &&
                        !i.events.some((e) => e.id === a.event_id),
                    ) && (
                      <Text size="sm">
                        {labelText(
                          "Historia wycofanych wydarzeń",
                          "Withdrawn event history",
                          "Historie zurückgezogener Ereignisse",
                        )}
                        :{" "}
                        {data.answers
                          .filter(
                            (a) =>
                              a.invitation_id === i.id &&
                              !i.events.some((e) => e.id === a.event_id),
                          )
                          .map(
                            (a) =>
                              `${allActiveGuests.find((g) => g.id === a.guest_id)?.name || "Gość"} / ${a.event_id}: ${a.attending ? "tak" : "nie"}`,
                          )
                          .join("; ")}
                      </Text>
                    )}
                    <Group>
                      <Button
                        variant="light"
                        disabled={busy}
                        onClick={() =>
                          setConfirmation({
                            action: "rotate",
                            payload: { id: i.id },
                            description: labelText(
                              "Poprzedni link przestanie działać. Nowy link trzeba przekazać rodzinie ponownie.",
                              "The previous link will stop working. Share the new link with the family.",
                              "Der bisherige Link wird ungültig. Den neuen Link erneut weitergeben.",
                            ),
                          })
                        }
                      >
                        {labelText(
                          "Wygeneruj nowy link",
                          "Generate new link",
                          "Neuen Link erstellen",
                        )}
                      </Button>
                      <Button
                        variant="subtle"
                        color="red"
                        disabled={busy || i.revoked}
                        onClick={() =>
                          setConfirmation({
                            action: "revoke",
                            payload: { id: i.id },
                            description: labelText(
                              "Ta rodzina utraci dostęp do zaproszenia. Jej odpowiedzi zostaną zachowane.",
                              "This family will lose access. Their answers will be kept.",
                              "Diese Familie verliert den Zugang. Antworten bleiben erhalten.",
                            ),
                          })
                        }
                      >
                        {labelText(
                          "Cofnij dostęp",
                          "Revoke access",
                          "Zugang widerrufen",
                        )}
                      </Button>
                      <Button
                        variant="subtle"
                        disabled={busy}
                        onClick={() => {
                          setEditingInvite(i);
                          setEditorOpen(true);
                        }}
                      >
                        {labelText(
                          "Edytuj zaproszenie",
                          "Edit invitation",
                          "Einladung bearbeiten",
                        )}
                      </Button>
                      <Button
                        variant="subtle"
                        disabled={
                          busy ||
                          !data.site.published_release_id ||
                          !i.events.length
                        }
                        onClick={() => {
                          setEditing(i.id);
                          setNote(i.note);
                          setReplies(
                            Object.fromEntries(
                              data.answers
                                .filter((a) => a.invitation_id === i.id)
                                .map((a) => [
                                  `${a.guest_id}:${a.event_id}`,
                                  String(a.attending),
                                ]),
                            ),
                          );
                        }}
                      >
                        {labelText("Popraw RSVP", "Edit RSVP", "RSVP bearbeiten")}
                      </Button>
                    </Group>
                    {editing === i.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void action("rsvp", {
                            id: i.id,
                            revision: i.rsvp_revision,
                            note,
                            plusOne: i.plus_one ?? null,
                            answers: allActiveGuests.flatMap((g) =>
                              i.events.flatMap((event) => {
                                const v = replies[`${g.id}:${event.id}`];
                                return v === "true" || v === "false"
                                  ? [
                                      {
                                        guestId: g.id,
                                        eventId: event.id,
                                        attending: v === "true",
                                      },
                                    ]
                                  : [];
                              }),
                            ),
                          });
                        }}
                      >
                        <Stack>
                          {allActiveGuests.flatMap((g) =>
                            i.events.map((event) => (
                              <Select
                                key={`${g.id}:${event.id}`}
                                label={`${g.name}${i.plus_one?.id === g.id ? " (+1)" : ""} — ${event.title}`}
                                placeholder={labelText(
                                  "Brak odpowiedzi",
                                  "No response",
                                  "Keine Antwort",
                                )}
                                data={[
                                  {
                                    value: "true",
                                    label: labelText("Tak", "Yes", "Ja"),
                                  },
                                  {
                                    value: "false",
                                    label: labelText("Nie", "No", "Nein"),
                                  },
                                ]}
                                value={replies[`${g.id}:${event.id}`] || null}
                                onChange={(v) =>
                                  setReplies({
                                    ...replies,
                                    [`${g.id}:${event.id}`]: v || "",
                                  })
                                }
                              />
                            )),
                          )}
                          <Textarea
                            label={labelText("Uwagi", "Notes", "Anmerkungen")}
                            value={note}
                            onChange={(e) => setNote(e.currentTarget.value)}
                            maxLength={2000}
                          />
                        <ActionButton
                          disabled={busy}
                          type="submit"
                          loading={operation === "rsvp"}
                        >
                          {labelText(
                            "Zapisz poprawkę RSVP",
                            "Save RSVP correction",
                            "RSVP-Korrektur speichern",
                          )}
                        </ActionButton>
                      </Stack>
                    </form>
                  )}
                </Stack>
              </Card>
              );
            })}
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
                {entry.label}: {entry.names.join(", ")}
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
    </Card>
  );
}
