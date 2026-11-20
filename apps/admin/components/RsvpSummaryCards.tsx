"use client";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  OVERALL_EVENT_ID,
  type RsvpSummary,
} from "@invitations/domain/invitation";
import type { QuestionSummary } from "@invitations/domain/rsvp-questions";
import { usePanelI18n } from "../lib/i18n";

export function RsvpSummaryCards({
  summary,
  events,
  questionSummaries,
}: {
  summary: RsvpSummary;
  events: { id: string; title: string }[];
  questionSummaries: QuestionSummary[];
}) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  const [openTextIds, setOpenTextIds] = useState<Record<string, boolean>>({});

  const companionCaption = (count: number) =>
    count > 0
      ? labelText(
          `w tym ${count} os. towarzysz.`,
          `incl. ${count} companions`,
          `davon ${count} Begleitpers.`,
        )
      : null;

  return (
    <Stack gap="sm">
      <SimpleGrid
        cols={{ base: 2, xl: 4 }}
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        }}
      >
        <Card withBorder>
          <Text size="sm" c="dimmed">
            {labelText("Zaproszone osoby", "Invited people", "Eingeladene")}
          </Text>
          <Title order={3}>{summary.totals.invited}</Title>
          {companionCaption(summary.totals.companionsInvited) && (
            <Text size="xs" c="dimmed">
              {companionCaption(summary.totals.companionsInvited)}
            </Text>
          )}
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            {labelText("Będą", "Attending", "Zusagen")}
          </Text>
          <Title order={3} c="green">
            {summary.totals.attending}
          </Title>
          {companionCaption(summary.totals.companionsAttending) && (
            <Text size="xs" c="dimmed">
              {companionCaption(summary.totals.companionsAttending)}
            </Text>
          )}
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            {labelText("Nie będą", "Declined", "Absagen")}
          </Text>
          <Title order={3} c="red">
            {summary.totals.declined}
          </Title>
          {companionCaption(summary.totals.companionsDeclined) && (
            <Text size="xs" c="dimmed">
              {companionCaption(summary.totals.companionsDeclined)}
            </Text>
          )}
        </Card>
        <Card withBorder>
          <Text size="sm" c="dimmed">
            {labelText("Czekamy", "Pending", "Ausstehend")}
          </Text>
          <Title order={3}>{summary.totals.pending}</Title>
          {companionCaption(summary.totals.companionsPending) && (
            <Text size="xs" c="dimmed">
              {companionCaption(summary.totals.companionsPending)}
            </Text>
          )}
        </Card>
      </SimpleGrid>

      {events
        .filter((event) => event.id !== OVERALL_EVENT_ID)
        .map((event) => {
          const stats = summary.byEvent[event.id] || {
            attending: 0,
            declined: 0,
            pending: 0,
            companionsAttending: 0,
          };
          return (
            <Card withBorder key={event.id} py="xs">
              <Group justify="space-between" wrap="wrap">
                <Text fw={600} size="sm">
                  {event.title}
                </Text>
                <Text size="sm">
                  {labelText("Będą", "Attending", "Zusagen")}: {stats.attending}
                  {stats.companionsAttending > 0
                    ? ` (${labelText("w tym", "incl.", "davon")} ${stats.companionsAttending} ${labelText("tow.", "comp.", "Begl.")})`
                    : ""}{" "}
                  · {labelText("Nie będą", "Declined", "Absagen")}:{" "}
                  {stats.declined} ·{" "}
                  {labelText("Czekamy", "Pending", "Ausstehend")}:{" "}
                  {stats.pending}
                </Text>
              </Group>
            </Card>
          );
        })}

      {questionSummaries.length > 0 && (
        <Card withBorder>
          <Stack gap="xs">
            <Text fw={600} size="sm">
              {labelText(
                "Podsumowanie pytań",
                "Question summary",
                "Fragenübersicht",
              )}
            </Text>
            {questionSummaries.map((qs) => (
              <div key={qs.question.id}>
                <Group justify="space-between" wrap="wrap" gap="xs">
                  <Text size="sm" fw={500}>
                    {qs.question.label}
                  </Text>
                  <Group gap="xs" wrap="wrap">
                    {qs.type === "choice" && (
                      <>
                        {qs.question.options.map((opt) => (
                          <Badge key={opt.id} variant="light" size="sm">
                            {opt.label}: {qs.counts[opt.id] ?? 0}
                          </Badge>
                        ))}
                        {qs.question.allowOther && (
                          <Badge variant="outline" size="sm">
                            {labelText("Inne", "Other", "Sonstiges")}:{" "}
                            {qs.otherCount}
                          </Badge>
                        )}
                      </>
                    )}
                    {qs.type === "number" && (
                      <Badge variant="light" size="sm">
                        {labelText("Suma", "Sum", "Summe")}: {qs.sum} (
                        {qs.answeredCount} {labelText("odp.", "ans.", "Antw.")})
                      </Badge>
                    )}
                    {qs.type === "text" && (
                      <Button
                        size="compact-xs"
                        variant="light"
                        onClick={() =>
                          setOpenTextIds((old) => ({
                            ...old,
                            [qs.question.id]: !old[qs.question.id],
                          }))
                        }
                      >
                        {labelText(
                          `Pokaż odpowiedzi (${qs.responses.length})`,
                          `Show responses (${qs.responses.length})`,
                          `Antworten (${qs.responses.length})`,
                        )}
                      </Button>
                    )}
                    {qs.missingCount > 0 && (
                      <Text size="xs" c="dimmed">
                        {labelText(
                          `brak odpowiedzi: ${qs.missingCount}`,
                          `missing: ${qs.missingCount}`,
                          `offen: ${qs.missingCount}`,
                        )}
                      </Text>
                    )}
                  </Group>
                </Group>
                {qs.type === "text" && Boolean(openTextIds[qs.question.id]) && (
                  <Stack gap={4} mt="xs" pl="sm">
                    {qs.responses.map((r, idx) => (
                      <Text size="xs" key={idx}>
                        • {r.text}
                      </Text>
                    ))}
                  </Stack>
                )}
              </div>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
