"use client";
import { useState } from "react";
import { Accordion, Alert, Button, Checkbox, Stack, Text } from "@mantine/core";
import { apiFetch } from "./Dashboard";
import { usePanelI18n } from "../lib/i18n";
type Preview = {
  configured: boolean;
  releaseId: string;
  recipients: {
    id: string;
    label: string;
    email: string;
    version: number;
    revision: number;
    subject: string;
    text: string;
  }[];
};
export function Reminders({
  siteId,
  mode,
  published,
  onMessage,
}: {
  siteId: string;
  mode: string;
  published: boolean;
  onMessage: (message: string) => void;
}) {
  const { language } = usePanelI18n();
  const tr = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  const [preview, setPreview] = useState<Preview | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [results, setResults] = useState<
    { id: string; email: string; status: string }[]
  >([]);
  const endpoint = `/api/sites/${siteId}/reminders`;
  const selectedRecipients =
    preview?.recipients.filter((r) =>
      selected.includes(`${r.id}:${r.email}`),
    ) || [];
  async function load() {
    setBusy(true);
    setError("");
    try {
      const next = await apiFetch<Preview>(endpoint);
      setPreview(next);
      setSelected([]);
      setResults([]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{
        results: { id: string; email: string; status: string }[];
      }>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          releaseId: preview.releaseId,
          recipients: selectedRecipients
            .slice(0, 10)
            .map(({ id, email, version, revision }) => ({
              id,
              email,
              version,
              revision,
            })),
        }),
      });
      setResults(result.results);
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
          "Zakończono próbę wysyłki. Sprawdź wyniki poniżej.",
          "Sending attempt completed. Check the results below.",
          "Versandversuch abgeschlossen. Ergebnisse unten prüfen.",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Accordion variant="separated">
      <Accordion.Item value="reminders">
        <Accordion.Control>
          {tr("Przypomnienia o RSVP", "RSVP reminders", "RSVP-Erinnerungen")}
        </Accordion.Control>
        <Accordion.Panel>
          <Stack>
            <Text size="sm">
              {tr(
                "Przypomnienia trafiają tylko do rodzin z brakującymi odpowiedziami. Wysyłka wymaga dostępu e-mail, aby odbiorca bezpiecznie otworzył swoje zaproszenie.",
                "Reminders go only to families with missing responses. Email access is required to securely open their invitation.",
                "Erinnerungen gehen nur an Familien mit fehlenden Antworten. E-Mail-Zugang ist für den sicheren Zugriff erforderlich.",
              )}
            </Text>
            <Button
              variant="light"
              disabled={busy || mode !== "email" || !published}
              onClick={() => void load()}
            >
              {tr(
                "Przygotuj podgląd odbiorców i treści",
                "Preview recipients and message",
                "Empfänger und Nachricht ansehen",
              )}
            </Button>
            {error && (
              <Alert color="red" role="alert">
                {error}
              </Alert>
            )}
            {preview && !preview.configured && (
              <Alert>
                {tr(
                  "Skonfiguruj nadawcę i klucz Resend, aby uruchomić wysyłkę.",
                  "Configure the sender and Resend key to enable sending.",
                  "Absender und Resend-Schlüssel konfigurieren, um den Versand zu aktivieren.",
                )}
              </Alert>
            )}
            {preview && !preview.recipients.length && (
              <Text>
                {tr(
                  "Wszyscy aktywni goście odpowiedzieli albo nie mają przypisanego e-maila.",
                  "All active guests responded or have no email assigned.",
                  "Alle aktiven Gäste haben geantwortet oder keine E-Mail-Adresse.",
                )}
              </Text>
            )}
            {preview?.recipients.map((r) => (
              <Checkbox
                key={`${r.id}:${r.email}`}
                label={`${r.label} — ${r.email}`}
                checked={selected.includes(`${r.id}:${r.email}`)}
                disabled={busy}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setSelected((old) =>
                    checked
                      ? [...old, `${r.id}:${r.email}`]
                      : old.filter((key) => key !== `${r.id}:${r.email}`),
                  );
                }}
              />
            ))}
            {selectedRecipients.length > 0 && (
              <>
                <Text fw={600}>{selectedRecipients[0].subject}</Text>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {selectedRecipients[0].text}
                </Text>
                <Text size="sm">
                  {tr(
                    "Każdy odbiorca dostanie osobną wiadomość. Maksymalnie 10 adresów na wysyłkę i jedno przypomnienie na adres w zaproszeniu dziennie.",
                    "Each recipient gets a separate message. At most 10 recipients per send and one reminder per invitation address per day.",
                    "Jeder Empfänger erhält eine eigene Nachricht. Maximal 10 Empfänger je Versand und eine Erinnerung je Einladungsadresse täglich.",
                  )}
                </Text>
                <Button
                  loading={busy}
                  disabled={!preview?.configured}
                  onClick={() => void send()}
                >
                  {tr(
                    "Wyślij do zaznaczonych odbiorców",
                    "Send to selected recipients",
                    "An ausgewählte Empfänger senden",
                  )}{" "}
                  ({Math.min(10, selectedRecipients.length)})
                </Button>
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
                          "już wysłano dzisiaj lub wysyłka trwa",
                          "already sent today or in progress",
                          "heute bereits gesendet oder in Bearbeitung",
                        )}
              </Text>
            ))}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
