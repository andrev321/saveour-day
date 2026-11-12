"use client";
import { useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { EMAIL_BATCH_LIMIT } from "@invitations/domain/email";
import { useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { ActionButton } from "./ActionButton";
import { apiFetch } from "./Dashboard";
import { usePanelI18n } from "../lib/i18n";

type EmailRecipient = {
  id: string;
  label: string;
  email: string;
  version: number;
  revision: number;
  subject: string;
  text: string;
};

type EmailCampaignPreview = {
  configured: boolean;
  dailyLimit: number;
  usedToday: number;
  invitationRecipients: EmailRecipient[];
  reminderRecipients: EmailRecipient[];
  releaseId: string;
};

type DeliveryResult = {
  id: string;
  email: string;
  status: "sent" | "failed" | "changed" | "skipped";
};

export function EmailDeliveryPanel({
  siteId,
  mode,
  published,
  onMessage,
  onSent,
}: {
  siteId: string;
  mode: string;
  published: boolean;
  onMessage: (message: string) => void;
  onSent?: () => void;
}) {
  const { language } = usePanelI18n();
  const tr = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;

  const [kind, setKind] = useState<"invitation" | "reminder">("invitation");
  const [preview, setPreview] = useState<EmailCampaignPreview | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [results, setResults] = useState<DeliveryResult[]>([]);
  const { operation, busy, start, end } = useOperation();

  const endpoint = `/api/sites/${siteId}/emails`;
  const activeRecipients = preview
    ? kind === "invitation"
      ? preview.invitationRecipients
      : preview.reminderRecipients
    : [];
  const selectedRecipients = activeRecipients.filter((r) =>
    selected.includes(`${r.id}:${r.email}`),
  );
  const maxSelectable = preview
    ? Math.min(EMAIL_BATCH_LIMIT, Math.max(0, preview.dailyLimit - preview.usedToday))
    : EMAIL_BATCH_LIMIT;

  async function load() {
    if (!start("preview")) return;
    setError("");
    try {
      const next = await apiFetch<EmailCampaignPreview>(endpoint);
      setPreview(next);
      setSelected([]);
      setResults([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      end();
    }
  }

  async function send() {
    if (!preview || !selectedRecipients.length) return;
    if (!start("send")) return;
    setError("");
    try {
      const result = await apiFetch<{
        results: DeliveryResult[];
        usedToday: number;
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          kind,
          releaseId: preview.releaseId,
          recipients: selectedRecipients
            .slice(0, EMAIL_BATCH_LIMIT)
            .map(({ id, email, version, revision }) => ({
              id,
              email,
              version,
              revision,
            })),
        }),
      });
      setResults(result.results);
      setPreview((prev) =>
        prev
          ? {
              ...prev,
              usedToday: result.usedToday,
              invitationRecipients:
                kind === "invitation"
                  ? prev.invitationRecipients.filter(
                      (r) =>
                        !result.results.some(
                          (res) =>
                            res.status === "sent" &&
                            res.id === r.id &&
                            res.email === r.email,
                        ),
                    )
                  : prev.invitationRecipients,
            }
          : prev,
      );
      setSelected((old) =>
        old.filter(
          (key) =>
            !result.results.some(
              (r) =>
                ["sent", "skipped", "changed"].includes(r.status) &&
                `${r.id}:${r.email}` === key,
            ),
        ),
      );
      onMessage(
        tr(
          "Zakończono wysyłkę wiadomości e-mail. Sprawdź wyniki poniżej.",
          "Email sending completed. Check the results below.",
          "E-Mail-Versand abgeschlossen. Ergebnisse unten prüfen.",
        ),
      );
      onSent?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      end();
    }
  }

  return (
    <Accordion variant="separated">
      <Accordion.Item value="emails">
        <Accordion.Control>
          {tr(
            "Wysyłka zaproszeń i przypomnień e-mail",
            "Email invitations and reminders",
            "E-Mail-Einladungen und Erinnerungen",
          )}
        </Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text size="sm">
              {tr(
                "Wysyłaj zaproszenia i przypomnienia bezpośrednio z panelu. Wymaga opublikowanej strony z dostępem e-mail.",
                "Send invitations and reminders directly from the panel. Requires a published site with email access.",
                "Einladungen und Erinnerungen direkt aus dem Panel senden. Erfordert eine veröffentlichte Seite mit E-Mail-Zugang.",
              )}
            </Text>
            <Group justify="space-between" wrap="wrap">
              <SegmentedControl
                value={kind}
                onChange={(value) => {
                  setKind(value as "invitation" | "reminder");
                  setSelected([]);
                  setResults([]);
                }}
                data={[
                  {
                    value: "invitation",
                    label: tr("Zaproszenia", "Invitations", "Einladungen"),
                  },
                  {
                    value: "reminder",
                    label: tr("Przypomnienia", "Reminders", "Erinnerungen"),
                  },
                ]}
              />
              {preview && (
                <Badge variant="light">
                  {tr("Limit dzienny", "Daily quota", "Tageslimit")}:{" "}
                  {preview.usedToday} / {preview.dailyLimit}
                </Badge>
              )}
            </Group>
            <ActionButton
              variant="light"
              loading={operation === "preview"}
              pendingLabel={loadingText(language, "preview")}
              disabled={busy || mode !== "email" || !published}
              onClick={() => void load()}
            >
              {preview
                ? tr(
                    "Odśwież podgląd odbiorców",
                    "Refresh recipient preview",
                    "Empfängervorschau aktualisieren",
                  )
                : tr(
                    "Przygotuj podgląd odbiorców i treści",
                    "Preview recipients and message",
                    "Empfänger und Nachricht ansehen",
                  )}
            </ActionButton>
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            {preview && !preview.configured && (
              <Alert>
                {tr(
                  "Skonfiguruj nadawcę (MAIL_FROM) i klucz Resend (RESEND_API_KEY), aby uruchomić wysyłkę.",
                  "Configure the sender (MAIL_FROM) and Resend key (RESEND_API_KEY) to enable sending.",
                  "Absender (MAIL_FROM) und Resend-Schlüssel (RESEND_API_KEY) konfigurieren, um den Versand zu aktivieren.",
                )}
              </Alert>
            )}
            {preview && !activeRecipients.length && (
              <Text size="sm">
                {kind === "invitation"
                  ? tr(
                      "Wszystkie aktywne zaproszenia z adresem e-mail zostały już wysłane.",
                      "All active invitations with an email address have already been sent.",
                      "Alle aktiven Einladungen mit E-Mail-Adresse wurden bereits gesendet.",
                    )
                  : tr(
                      "Wszyscy aktywni goście odpowiedzieli, termin minął albo nie mają przypisanego e-maila.",
                      "All active guests responded, the deadline passed, or no email is assigned.",
                      "Alle aktiven Gäste haben geantwortet, die Frist ist abgelaufen oder keine E-Mail-Adresse ist hinterlegt.",
                    )}
              </Text>
            )}
            {preview && activeRecipients.length > 0 && (
              <Group>
                <Button
                  size="xs"
                  variant="subtle"
                  disabled={busy || maxSelectable === 0}
                  onClick={() =>
                    setSelected(
                      activeRecipients
                        .slice(0, maxSelectable)
                        .map((r) => `${r.id}:${r.email}`),
                    )
                  }
                >
                  {tr(
                    "Zaznacz wszystkich (maks. 50)",
                    "Select all (max. 50)",
                    "Alle auswählen (max. 50)",
                  )}
                </Button>
                {selected.length > 0 && (
                  <Button
                    size="xs"
                    variant="subtle"
                    color="gray"
                    disabled={busy}
                    onClick={() => setSelected([])}
                  >
                    {tr("Wyczyść wybór", "Clear selection", "Auswahl aufheben")}
                  </Button>
                )}
              </Group>
            )}
            {activeRecipients.map((r) => {
              const key = `${r.id}:${r.email}`;
              const checked = selected.includes(key);
              return (
                <Checkbox
                  key={key}
                  label={`${r.label} — ${r.email}`}
                  checked={checked}
                  disabled={busy || (!checked && selected.length >= 50)}
                  onChange={(e) => {
                    const isChecked = e.currentTarget.checked;
                    setSelected((old) =>
                      isChecked
                        ? [...old, key].slice(0, 50)
                        : old.filter((item) => item !== key),
                    );
                  }}
                />
              );
            })}
            {selectedRecipients.length > 0 && (
              <>
                <Text fw={600}>{selectedRecipients[0].subject}</Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {selectedRecipients[0].text}
                </Text>
                <Text size="sm">
                  {tr(
                    "Każdy odbiorca dostanie osobną wiadomość. Maksymalnie 50 adresów w jednej partii i 50 wiadomości dziennie dla strony.",
                    "Each recipient gets a separate message. Up to 50 recipients per batch and 50 messages per site per day.",
                    "Jeder Empfänger erhält eine eigene Nachricht. Maximal 50 Empfänger pro Versand und 50 Nachrichten täglich pro Seite.",
                  )}
                </Text>
                <ActionButton
                  loading={operation === "send"}
                  pendingLabel={loadingText(language, "send")}
                  disabled={
                    busy ||
                    !preview?.configured ||
                    preview.usedToday >= preview.dailyLimit
                  }
                  onClick={() => void send()}
                >
                  {tr(
                    "Wyślij do zaznaczonych odbiorców",
                    "Send to selected recipients",
                    "An ausgewählte Empfänger senden",
                  )}{" "}
                  ({Math.min(50, selectedRecipients.length)})
                </ActionButton>
              </>
            )}
            {results.map((r) => (
              <Text size="sm" key={`${r.id}:${r.email}`}>
                {r.email}:{" "}
                {r.status === "sent"
                  ? tr("wysłano", "sent", "gesendet")
                  : r.status === "failed"
                    ? tr(
                        "błąd — ponów za minutę",
                        "failed — retry in one minute",
                        "Fehler — in einer Minute wiederholen",
                      )
                    : r.status === "changed"
                      ? tr(
                          "odpowiedzi lub dostęp zmieniły się — odśwież podgląd",
                          "responses or access changed — refresh preview",
                          "Antworten oder Zugang geändert — Vorschau aktualisieren",
                        )
                      : tr(
                          "już wysłano dzisiaj, trwa wysyłka lub osiągnięto limit dzienny",
                          "already sent today, in progress, or daily limit reached",
                          "heute bereits gesendet, in Bearbeitung oder Tageslimit erreicht",
                        )}
              </Text>
            ))}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
