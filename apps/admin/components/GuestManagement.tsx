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
} from "@mantine/core";
import { apiFetch } from "./Dashboard";
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
  const endpoint = `/api/sites/${siteId}/guests`;
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
          setInviteVariant(
            result.site.public_variant_id || result.variants[0]?.id || "",
          );
          setDeadline(localDeadline(result.site.rsvp_deadline));
        }
      })
      .catch((e) => {
        if (alive) setMessage(e.message);
      });
    return () => {
      alive = false;
    };
  }, [endpoint]);
  async function action(action: string, payload: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const result = await apiFetch<{ url?: string }>(endpoint, {
        method: "POST",
        body: JSON.stringify({ action, payload }),
      });
      if (result.url) setLink(result.url);
      if (action === "revoke") setLink("");
      const refreshed = await apiFetch<Management>(endpoint);
      if (action === "settings") {
        accept(refreshed);
        setCode("");
      } else setData(refreshed);
      setEditing(null);
      setEditingInvite(null);
      setMessage("Zapisano.");
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
  return (
    <Card withBorder>
      <Stack>
        <Title order={2}>Publikacja, goście i odpowiedzi</Title>
        {message && <Alert role="status">{message}</Alert>}
        {data && (
          <>
            <Group>
              <Badge color={data.site.published_release_id ? "green" : "gray"}>
                {data.site.published_release_id
                  ? "Opublikowana"
                  : "Nieopublikowana"}
              </Badge>
              <Button
                component="a"
                href={data.url}
                target="_blank"
                rel="noreferrer"
                variant="subtle"
              >
                Otwórz stronę
              </Button>
              <Button
                variant="light"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(data.url)
                    .then(() => setMessage("Skopiowano adres strony."))
                    .catch(() => setMessage(data.url));
                }}
              >
                Kopiuj adres strony
              </Button>
              <Button
                color="red"
                variant="subtle"
                disabled={busy || !data.site.published_release_id}
                onClick={() => void action("unpublish", {})}
              >
                Wycofaj publikację
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
                  label="Dostęp do całej realizacji"
                  value={mode}
                  onChange={(v) => setMode(v || "public")}
                  data={[
                    { value: "public", label: "Publiczny" },
                    { value: "code", label: "Wspólny kod dostępu" },
                    { value: "email", label: "E-mail i kod jednorazowy" },
                  ]}
                />
                {mode === "code" && (
                  <PasswordInput
                    label="Nowy kod dostępu (minimum 8 znaków)"
                    description="Pozostaw puste, aby zachować istniejący kod."
                    value={code}
                    onChange={(e) => setCode(e.currentTarget.value)}
                    minLength={8}
                    maxLength={128}
                  />
                )}
                <Select
                  label="Wariant strony ogólnej"
                  description="Wariant musi istnieć w opublikowanej wersji. Najpierw opublikuj zmiany struktury."
                  data={options}
                  value={variant}
                  onChange={(v) => setVariant(v || "")}
                  required
                />
                <TextInput
                  type="datetime-local"
                  label="Termin RSVP — czas w Polsce (Europe/Warsaw)"
                  value={deadline}
                  onChange={(e) => setDeadline(e.currentTarget.value)}
                />
                <Text size="sm">
                  Zapis ustawień unieważni dotychczasowe sesje dostępu.
                  Cofnięcie wersji treści nie zmienia ustawień ani odpowiedzi.
                </Text>
                <Button type="submit" loading={busy}>
                  Zapisz ustawienia dostępu
                </Button>
              </Stack>
            </form>
            <Title order={3}>
              {editingInvite ? "Edycja zaproszenia" : "Nowe zaproszenie"}
            </Title>
            <Text size="sm">
              Dla trybu publicznego link pozwala również odpowiadać za rodzinę.
              Przekazuj go tylko odbiorcom. Link jest wyświetlany po utworzeniu
              lub wygenerowaniu nowego; nowy link unieważnia poprzedni.
            </Text>
            <form
              id="invitation-form"
              onSubmit={(e) => {
                e.preventDefault();
                void action(editingInvite ? "update" : "create", {
                  id: editingInvite?.id,
                  version: editingInvite?.version,
                  label,
                  variantId: inviteVariant,
                  names: names
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  emails: emails
                    .split(/[\n,;]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                });
              }}
            >
              <Stack>
                <TextInput
                  label="Nazwa osoby lub rodziny"
                  value={label}
                  onChange={(e) => setLabel(e.currentTarget.value)}
                  required
                  maxLength={200}
                />
                <Textarea
                  label="Goście — każda osoba w osobnym wierszu"
                  value={names}
                  onChange={(e) => setNames(e.currentTarget.value)}
                  required
                  autosize
                  minRows={2}
                  disabled={!!editingInvite}
                />
                <Textarea
                  label="Uprawnione adresy e-mail"
                  description="Oddziel przecinkami lub nowymi wierszami. Wymagane w trybie e-mail."
                  value={emails}
                  onChange={(e) => setEmails(e.currentTarget.value)}
                  required={data.site.access_mode === "email"}
                />
                <Select
                  label="Wariant zaproszenia"
                  data={options}
                  value={inviteVariant}
                  onChange={(v) => setInviteVariant(v || "")}
                  required
                />
                <Button type="submit" loading={busy}>
                  {editingInvite
                    ? "Zapisz zaproszenie"
                    : "Utwórz zaproszenie i link"}
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
                    Anuluj edycję
                  </Button>
                )}
              </Stack>
            </form>
            {link && (
              <Alert title="Link do przekazania odbiorcy">
                <TextInput
                  aria-label="Wygenerowany link"
                  readOnly
                  value={link}
                />
                <Button
                  mt="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(link)
                      .then(() => setMessage("Skopiowano link."))
                      .catch(() =>
                        setMessage("Zaznacz i skopiuj link z pola powyżej."),
                      );
                  }}
                >
                  Kopiuj link
                </Button>
              </Alert>
            )}
            <Title order={3}>Lista zaproszeń i RSVP</Title>
            {!data.invitations.length && (
              <Text>Dodaj pierwszą osobę lub rodzinę.</Text>
            )}
            {data.invitations.map((i) => (
              <Card withBorder key={i.id}>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Title order={4}>{i.label}</Title>
                    <Badge>{i.revoked ? "Cofnięte" : "Aktywne"}</Badge>
                  </Group>
                  <Text size="sm">
                    {i.emails.join(", ") || "Bez adresu e-mail"}
                  </Text>
                  {i.guests.map((g) => (
                    <div key={g.id}>
                      <Text fw={600}>{g.name}</Text>
                      {i.events.map((event) => {
                        const a = data.answers.find(
                          (a) =>
                            a.invitation_id === i.id &&
                            a.guest_id === g.id &&
                            a.event_id === event.id,
                        );
                        return (
                          <Text size="sm" key={event.id}>
                            {event.title}:{" "}
                            {a
                              ? a.attending
                                ? "Tak"
                                : "Nie"
                              : "Brak odpowiedzi"}
                          </Text>
                        );
                      })}
                    </div>
                  ))}
                  {i.note && <Text size="sm">Uwagi: {i.note}</Text>}
                  {data.answers.some(
                    (a) =>
                      a.invitation_id === i.id &&
                      !i.events.some((e) => e.id === a.event_id),
                  ) && (
                    <Text size="sm">
                      Historia wycofanych wydarzeń:{" "}
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
                      onClick={() => void action("rotate", { id: i.id })}
                    >
                      Wygeneruj nowy link
                    </Button>
                    <Button
                      variant="subtle"
                      color="red"
                      disabled={busy || i.revoked}
                      onClick={() => void action("revoke", { id: i.id })}
                    >
                      Cofnij dostęp
                    </Button>
                    <Button
                      variant="subtle"
                      disabled={busy}
                      onClick={() => {
                        setEditingInvite(i);
                        setLabel(i.label);
                        setNames(i.guests.map((g) => g.name).join("\n"));
                        setEmails(i.emails.join("\n"));
                        setInviteVariant(i.variant_id);
                        document
                          .getElementById("invitation-form")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Edytuj zaproszenie
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
                      Popraw RSVP
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
                              placeholder="Brak odpowiedzi"
                              data={[
                                { value: "true", label: "Tak" },
                                { value: "false", label: "Nie" },
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
                          label="Uwagi"
                          value={note}
                          onChange={(e) => setNote(e.currentTarget.value)}
                          maxLength={2000}
                        />
                        <Button type="submit" loading={busy}>
                          Zapisz poprawkę RSVP
                        </Button>
                      </Stack>
                    </form>
                  )}
                </Stack>
              </Card>
            ))}
          </>
        )}
      </Stack>
    </Card>
  );
}
