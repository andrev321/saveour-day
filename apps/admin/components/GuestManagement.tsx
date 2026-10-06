"use client";
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
  Loader,
  Skeleton,
} from "@mantine/core";
import { apiFetch } from "./Dashboard";
import {
  csvFile,
  parseGuestCsv,
  defaultQuestions,
  type ImportedInvitation,
  type QuestionSettings,
  type GuestDetails,
} from "@invitations/domain/operations";
import { usePanelI18n } from "../lib/i18n";
import { Reminders } from "./Reminders";
import { QrCodeCard } from "./QrCodeCard";
type Guest = { id: string; name: string };
type InvitationRow = {
  id: string;
  label: string;
  variant_id: string;
  emails: string[];
  guests: Guest[];
  revoked: boolean;
  version: number;
  rsvp_revision: number;
  note: string;
  archived_guests?: Guest[];
  guest_details?: GuestDetails;
  events: { id: string; title: string }[];
};
type Management = {
  variants: { id: string; label: string }[];
  site: {
    access_mode: string;
    public_variant_id: string | null;
    access_version: number;
    rsvp_deadline: string | null;
    published_release_id: string | null;
    rsvp_questions?: QuestionSettings;
  };
  url: string;
  invitations: InvitationRow[];
  answers: {
    invitation_id: string;
    guest_id: string;
    event_id: string;
    attending: boolean;
  }[];
};
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
  const [members, setMembers] = useState<{ id?: string; name: string }[]>([]);
  const [confirmation, setConfirmation] = useState<{
    action: string;
    payload: unknown;
    description: string;
  } | null>(null);
  const [imported, setImported] = useState<ImportedInvitation[]>([]);
  const [importId, setImportId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importLinks, setImportLinks] = useState<
    { label: string; url: string }[]
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
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("public"),
    [code, setCode] = useState(""),
    [variant, setVariant] = useState(""),
    [deadline, setDeadline] = useState("");
  const [label, setLabel] = useState(""),
    [names, setNames] = useState(""),
    [emails, setEmails] = useState(""),
    [inviteVariant, setInviteVariant] = useState(""),
    [link, setLink] = useState("");
  const [editing, setEditing] = useState<string | null>(null),
    [note, setNote] = useState(""),
    [replies, setReplies] = useState<Record<string, string>>({});
  const [editingInvite, setEditingInvite] = useState<InvitationRow | null>(
    null,
  );
  function accept(result: Management) {
    setData(result);
    setMode(result.site.access_mode);
    setVariant(result.site.public_variant_id || result.variants[0]?.id || "");
    setDeadline(localDeadline(result.site.rsvp_deadline));
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
          setInviteVariant(
            result.site.public_variant_id || result.variants[0]?.id || "",
          );
          setDeadline(localDeadline(result.site.rsvp_deadline));
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
  async function action(action: string, payload: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await apiFetch<{
        url?: string;
        links?: { label: string; url: string }[];
        alreadyImported?: boolean;
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ action, payload }),
      });
      if (result.url) setLink(result.url);
      if (action === "import") {
        setImported([]);
        setImportOpen(false);
        setImportLinks(result.links || []);
      }
      if (action === "create") {
        setLabel("");
        setNames("");
        setEmails("");
      }
      if (action === "questions") setQuestions(questions);
      if (action === "revoke") setLink("");
      const refreshed = await apiFetch<Management>(endpoint);
      if (action === "settings") {
        accept(refreshed);
        setCode("");
      } else setData(refreshed);
      setEditing(null);
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
      setBusy(false);
    }
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
  const active = data?.invitations.filter((i) => !i.revoked) || [];
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
      `${i.label} ${i.guests.map((g) => g.name).join(" ")} ${i.emails.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || filter === "revoked"
        ? filter === "all" || i.revoked
        : !i.revoked && invitationStatus(i) === filter),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice(
    (Math.min(page, totalPages) - 1) * 20,
    Math.min(page, totalPages) * 20,
  );
  function exportAnswers() {
    const rows: unknown[][] = [
      [
        "Rodzina",
        "Gość",
        "Wydarzenie",
        "Odpowiedź",
        "Dieta",
        "Nocleg",
        "Transport",
        labelText("Uwagi", "Notes", "Anmerkungen"),
        "Status osoby",
      ],
    ];
    for (const i of data?.invitations || []) {
      for (const g of [...i.guests, ...(i.archived_guests || [])]) {
        const archived = !i.guests.some((current) => current.id === g.id);
        const detail = i.guest_details?.[g.id] || {};
        const relevant = archived
          ? data!.answers
              .filter((a) => a.invitation_id === i.id && a.guest_id === g.id)
              .map((a) => ({
                id: a.event_id,
                title:
                  events.find((e) => e.id === a.event_id)?.title || a.event_id,
              }))
          : i.events;
        for (const event of relevant.length
          ? relevant
          : [{ id: "", title: "" }]) {
          const answer = answerMap.get(`${i.id}:${g.id}:${event.id}`);
          rows.push([
            i.label,
            g.name,
            event.title,
            answer === undefined
              ? labelText("Brak odpowiedzi", "No response", "Keine Antwort")
              : answer
                ? labelText("Tak", "Yes", "Ja")
                : labelText("Nie", "No", "Nein"),
            detail.diet,
            detail.lodging === undefined
              ? ""
              : detail.lodging
                ? labelText("Tak", "Yes", "Ja")
                : labelText("Nie", "No", "Nein"),
            detail.transport === undefined
              ? ""
              : detail.transport
                ? labelText("Tak", "Yes", "Ja")
                : labelText("Nie", "No", "Nein"),
            i.note,
            archived
              ? "Archiwalna"
              : i.revoked
                ? "Cofnięte zaproszenie"
                : "Aktywna",
          ]);
        }
      }
    }
    download("odpowiedzi-rsvp.csv", csvFile(rows));
  }
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
        {loading && (
          <Stack gap="lg">
            <Group role="status" aria-live="polite" gap="sm">
              <Loader size="sm" aria-hidden="true" />
              <Text size="sm" c="dimmed">
                {labelText(
                  "Wczytujemy zaproszenia i odpowiedzi RSVP…",
                  "Loading invitations and RSVP responses…",
                  "Einladungen und RSVP-Antworten werden geladen…",
                )}
              </Text>
            </Group>
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
                            {
                              value: "email",
                              label: labelText(
                                "E-mail i kod jednorazowy",
                                "Email and one-time code",
                                "E-Mail und Einmalcode",
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
                        <Button type="submit" loading={busy}>
                          {labelText(
                            "Zapisz ustawienia dostępu",
                            "Save access settings",
                            "Zugangseinstellungen speichern",
                          )}
                        </Button>
                      </Stack>
                    </form>
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
                    <Button
                      loading={busy}
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
                    </Button>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
            <Reminders
              siteId={siteId}
              mode={data.site.access_mode}
              published={!!data.site.published_release_id}
              onMessage={setMessage}
            />
            <Group>
              <Button variant="light" onClick={exportAnswers}>
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
                          inviteVariant || options[0]?.value || "",
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
                      ["rodzina", "goscie", "email"],
                      ["Rodzina Kowalskich", "Anna|Jan", "anna@example.com"],
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
                <Text>
                  {labelText(
                    "Zapisz linki w bezpiecznym miejscu. Umożliwiają dostęp do konkretnych zaproszeń.",
                    "Store these links securely. They provide access to individual invitations.",
                    "Links sicher aufbewahren. Sie gewähren Zugang zu einzelnen Einladungen.",
                  )}
                </Text>
                <Button
                  onClick={() =>
                    download(
                      "linki-zaproszen.csv",
                      csvFile([
                        ["Rodzina", "Link"],
                        ...importLinks.map((i) => [i.label, i.url]),
                      ]),
                    )
                  }
                >
                  {labelText(
                    "Pobierz linki",
                    "Download links",
                    "Links herunterladen",
                  )}
                </Button>
              </Alert>
            )}
            <Title order={3}>
              {editingInvite
                ? labelText(
                    "Edycja zaproszenia",
                    "Edit invitation",
                    "Einladung bearbeiten",
                  )
                : labelText(
                    "Nowe zaproszenie",
                    "New invitation",
                    "Neue Einladung",
                  )}
            </Title>
            <Text size="sm">
              {labelText(
                "Link rodzinny pozwala odpowiadać za zaproszone osoby. Przekazuj go tylko odbiorcom. Wyświetlamy go po utworzeniu lub wygenerowaniu nowego; nowy link unieważnia poprzedni.",
                "The family link allows responses for invited people. Share it only with recipients. It is shown after creation or regeneration; a new link invalidates the old one.",
                "Der Familienlink erlaubt Antworten für eingeladene Personen. Nur an Empfänger weitergeben. Nach Erstellung oder Erneuerung sichtbar; ein neuer Link ersetzt den bisherigen.",
              )}
            </Text>
            <form
              id="invitation-form"
              onSubmit={(e) => {
                e.preventDefault();
                const payload = {
                  id: editingInvite?.id,
                  version: editingInvite?.version,
                  label,
                  variantId: inviteVariant,
                  ...(editingInvite ? { guests: members } : {}),
                  names: names
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  emails: emails
                    .split(/[\n,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                };
                if (
                  editingInvite &&
                  editingInvite.guests.some(
                    (g) => !members.some((m) => m.id === g.id),
                  )
                )
                  setConfirmation({
                    action: "update",
                    payload,
                    description: labelText(
                      "Usunięte osoby nie będą mogły odpowiadać i znikną z aktywnych zestawień. Ich dotychczasowe RSVP pozostanie w historii.",
                      "Removed people will disappear from active totals and cannot respond. Their existing RSVP remains in history.",
                      "Entfernte Personen erscheinen nicht mehr in aktiven Auswertungen. Frühere Antworten bleiben archiviert.",
                    ),
                  });
                else void action(editingInvite ? "update" : "create", payload);
              }}
            >
              <Stack>
                <TextInput
                  label={labelText(
                    "Nazwa osoby lub rodziny",
                    "Person or family name",
                    "Name der Person oder Familie",
                  )}
                  value={label}
                  onChange={(e) => setLabel(e.currentTarget.value)}
                  required
                  maxLength={200}
                />
                {editingInvite ? (
                  <Stack>
                    {members.map((member, index) => (
                      <Group key={member.id || `new-${index}`} align="end">
                        <TextInput
                          style={{ flex: 1 }}
                          label={`${labelText("Gość", "Guest", "Gast")} ${index + 1}`}
                          value={member.name}
                          required
                          maxLength={200}
                          onChange={(e) => {
                            const name = e.currentTarget.value;
                            setMembers((old) =>
                              old.map((m, n) =>
                                n === index ? { ...m, name } : m,
                              ),
                            );
                          }}
                        />
                        <Button
                          variant="subtle"
                          color="red"
                          disabled={members.length <= 1}
                          onClick={() =>
                            setMembers((old) =>
                              old.filter((_, n) => n !== index),
                            )
                          }
                        >
                          {labelText(
                            "Usuń osobę",
                            "Remove person",
                            "Person entfernen",
                          )}
                        </Button>
                      </Group>
                    ))}
                    <Button
                      variant="light"
                      disabled={members.length >= 20}
                      onClick={() =>
                        setMembers((old) => [...old, { name: "" }])
                      }
                    >
                      {labelText(
                        "Dodaj osobę",
                        "Add person",
                        "Person hinzufügen",
                      )}
                    </Button>
                    {editingInvite.archived_guests?.map((g) => (
                      <Button
                        key={g.id}
                        variant="subtle"
                        disabled={
                          members.some((m) => m.id === g.id) ||
                          members.length >= 20
                        }
                        onClick={() => setMembers((old) => [...old, g])}
                      >
                        {labelText(
                          "Przywróć osobę",
                          "Restore person",
                          "Person wiederherstellen",
                        )}
                        : {g.name}
                      </Button>
                    ))}
                  </Stack>
                ) : (
                  <Textarea
                    label={labelText(
                      "Goście — każda osoba w osobnym wierszu",
                      "Guests — one person per line",
                      "Gäste — eine Person pro Zeile",
                    )}
                    value={names}
                    onChange={(e) => setNames(e.currentTarget.value)}
                    required
                    autosize
                    minRows={2}
                  />
                )}
                <Textarea
                  label={labelText(
                    "Uprawnione adresy e-mail",
                    "Allowed email addresses",
                    "Berechtigte E-Mail-Adressen",
                  )}
                  description={labelText(
                    "Oddziel przecinkami lub nowymi wierszami. Wymagane w trybie e-mail.",
                    "Separate with commas or new lines. Required for email access.",
                    "Mit Kommas oder Zeilenumbrüchen trennen. Für E-Mail-Zugang erforderlich.",
                  )}
                  value={emails}
                  onChange={(e) => setEmails(e.currentTarget.value)}
                  required={data.site.access_mode === "email"}
                />
                <Select
                  label={labelText(
                    "Wariant zaproszenia",
                    "Invitation variant",
                    "Einladungsvariante",
                  )}
                  data={options}
                  value={inviteVariant}
                  onChange={(v) => setInviteVariant(v || "")}
                  required
                />
                <Button type="submit" loading={busy}>
                  {editingInvite
                    ? labelText(
                        "Zapisz zaproszenie",
                        "Save invitation",
                        "Einladung speichern",
                      )
                    : labelText(
                        "Utwórz zaproszenie i link",
                        "Create invitation and link",
                        "Einladung und Link erstellen",
                      )}
                </Button>
                {editingInvite && (
                  <Button
                    variant="subtle"
                    onClick={() => {
                      setEditingInvite(null);
                      setLabel("");
                      setNames("");
                      setEmails("");
                    }}
                  >
                    {labelText(
                      "Anuluj edycję",
                      "Cancel editing",
                      "Bearbeitung abbrechen",
                    )}
                  </Button>
                )}
              </Stack>
            </form>
            {link && (
              <Alert
                title={labelText(
                  "Link do przekazania odbiorcy",
                  "Family link to share with the recipient",
                  "Familienlink für den Empfänger",
                )}
              >
                <Text size="sm">
                  {labelText(
                    "To link rodzinny — umożliwia odpowiedzi za wskazane osoby. Przekaż go tylko odbiorcom.",
                    "This family link allows responses for the invited people. Share it only with recipients.",
                    "Dieser Familienlink erlaubt Antworten für eingeladene Personen. Nur an Empfänger weitergeben.",
                  )}
                </Text>
                <TextInput
                  aria-label={labelText(
                    "Wygenerowany link",
                    "Generated link",
                    "Erstellter Link",
                  )}
                  readOnly
                  value={link}
                />
                <Button
                  mt="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(link)
                      .then(() =>
                        setMessage(
                          labelText(
                            "Skopiowano link.",
                            "Link copied.",
                            "Link kopiert.",
                          ),
                        ),
                      )
                      .catch(() =>
                        setMessage(
                          labelText(
                            "Zaznacz i skopiuj link z pola powyżej.",
                            "Select and copy the link from the field above.",
                            "Link im Feld oben auswählen und kopieren.",
                          ),
                        ),
                      );
                  }}
                >
                  {labelText("Kopiuj link", "Copy link", "Link kopieren")}
                </Button>
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
            {!data.invitations.length && (
              <Text>
                {labelText(
                  "Dodaj pierwszą osobę lub rodzinę.",
                  "Add your first person or family.",
                  "Erste Person oder Familie hinzufügen.",
                )}
              </Text>
            )}
            <Group>
              <TextInput
                label={labelText(
                  "Szukaj gościa, rodziny lub e-maila",
                  "Search guest, family or email",
                  "Gast, Familie oder E-Mail suchen",
                )}
                value={query}
                onChange={(e) => {
                  setQuery(e.currentTarget.value);
                  setPage(1);
                }}
                style={{ flex: 1 }}
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
                    value: "revoked",
                    label: labelText("Cofnięte", "Revoked", "Widerrufen"),
                  },
                ]}
              />
            </Group>
            {!filtered.length && !!data.invitations.length && (
              <Text>
                {labelText(
                  "Brak wyników dla wybranych filtrów.",
                  "No matches for these filters.",
                  "Keine Treffer für diese Filter.",
                )}
              </Text>
            )}
            {visible.map((i) => (
              <Card withBorder key={i.id}>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Title order={4}>{i.label}</Title>
                    <Badge>
                      {i.revoked
                        ? labelText("Cofnięte", "Revoked", "Widerrufen")
                        : labelText("Aktywne", "Active", "Aktiv")}
                    </Badge>
                  </Group>
                  <Text size="sm">
                    {i.emails.join(", ") ||
                      labelText(
                        "Bez adresu e-mail",
                        "No email address",
                        "Keine E-Mail-Adresse",
                      )}
                  </Text>
                  {i.guests.map((g) => (
                    <div key={g.id}>
                      <Text fw={600}>{g.name}</Text>
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
                  ))}
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
                  {i.guests.map((g) => {
                    const detail = i.guest_details?.[g.id];
                    return detail && Object.keys(detail).length ? (
                      <Text key={`details-${g.id}`} size="sm">
                        {g.name}:{" "}
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
                            `${i.guests.find((g) => g.id === a.guest_id)?.name || "Gość"} / ${a.event_id}: ${a.attending ? "tak" : "nie"}`,
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
                        setMembers(i.guests.map((g) => ({ ...g })));
                        setLabel(i.label);
                        setNames(i.guests.map((g) => g.name).join("\n"));
                        setEmails(i.emails.join("\n"));
                        setInviteVariant(i.variant_id);
                        document
                          .getElementById("invitation-form")
                          ?.scrollIntoView({ behavior: "smooth" });
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
                          answers: i.guests.flatMap((g) =>
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
                        {i.guests.flatMap((g) =>
                          i.events.map((event) => (
                            <Select
                              key={`${g.id}:${event.id}`}
                              label={`${g.name} — ${event.title}`}
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
                        <Button type="submit" loading={busy}>
                          {labelText(
                            "Zapisz poprawkę RSVP",
                            "Save RSVP correction",
                            "RSVP-Korrektur speichern",
                          )}
                        </Button>
                      </Stack>
                    </form>
                  )}
                </Stack>
              </Card>
            ))}
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
            <Group>
              <Button variant="default" onClick={() => setConfirmation(null)}>
                {labelText("Anuluj", "Cancel", "Abbrechen")}
              </Button>
              <Button
                color="red"
                loading={busy}
                onClick={() => {
                  if (confirmation) {
                    const value = confirmation;
                    setConfirmation(null);
                    void action(value.action, value.payload);
                  }
                }}
              >
                {labelText("Potwierdź", "Confirm", "Bestätigen")}
              </Button>
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
                {entry.label}: {entry.names.join(", ")} ·{" "}
                {entry.emails.join(", ") ||
                  labelText("bez e-maila", "no email", "ohne E-Mail")}
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
            <Button
              loading={busy}
              disabled={
                data?.site.access_mode === "email" &&
                imported.some((i) => !i.emails.length)
              }
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
            </Button>
            {data?.site.access_mode === "email" &&
              imported.some((i) => !i.emails.length) && (
                <Text c="red">
                  {labelText(
                    "Każde zaproszenie wymaga e-maila w tym trybie dostępu.",
                    "Each invitation needs an email in this access mode.",
                    "Jede Einladung benötigt in diesem Modus eine E-Mail.",
                  )}
                </Text>
              )}
          </Stack>
        </Modal>
      </Stack>
    </Card>
  );
}
