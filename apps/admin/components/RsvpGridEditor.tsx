"use client";
import { useState } from "react";
import {
  Button,
  Checkbox,
  Group,
  NumberInput,
  Radio,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { loadingText } from "@invitations/ui/loading-copy";
import {
  INVITATION_POLICY,
  applyNamedDeclineCascade,
  attendanceKey,
  guestDisplayName,
  isEventCompanionAllowed,
} from "@invitations/domain/invitation";
import {
  QUESTION_POLICY,
  collectVisibleQuestionAnswers,
  questionFieldKey,
  visibleQuestions,
  type QuestionAnswerInput,
  type QuestionAnswerRecord,
  type QuestionValue,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";
import { ActionButton } from "./ActionButton";
import type { InvitationRow } from "../lib/guest-management";
import { usePanelI18n } from "../lib/i18n";

export function RsvpGridEditor({
  invitation,
  initialAnswers,
  questions,
  initialQuestionAnswers,
  busy,
  saving,
  onCancel,
  onSave,
}: {
  invitation: InvitationRow;
  initialAnswers: ReadonlyMap<string, boolean>;
  questions: RsvpQuestion[];
  initialQuestionAnswers: QuestionAnswerRecord[];
  busy: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (payload: {
    id: string;
    revision: number;
    note: string;
    answers: { guestId: string; eventId: string; attending: boolean }[];
    companionNames: Record<string, string | null>;
    questionAnswers: QuestionAnswerInput[];
  }) => void;
}) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;

  const companionLabel = labelText(
    "Osoba towarzysząca",
    "Companion",
    "Begleitperson",
  );

  const [attendances, setAttendances] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const g of invitation.guests) {
      for (const ev of invitation.events) {
        const val = initialAnswers.get(`${invitation.id}:${g.id}:${ev.id}`);
        if (val !== undefined) map[attendanceKey(g.id, ev.id)] = String(val);
      }
    }
    return map;
  });

  const [companionNames, setCompanionNames] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        invitation.guests
          .filter((g) => g.kind === "companion" && g.name)
          .map((g) => [g.id, g.name!]),
      ),
  );

  const [qValues, setQValues] = useState<Record<string, QuestionValue>>(() => {
    const map: Record<string, QuestionValue> = {};
    for (const qa of initialQuestionAnswers) {
      if (qa.invitationId === invitation.id) {
        map[questionFieldKey(qa.questionId, qa.guestId)] = qa.value;
      }
    }
    return map;
  });

  const [note, setNote] = useState(invitation.note);

  const companionAllowedFor = (eventId: string) =>
    isEventCompanionAllowed(invitation.guests, attendances, eventId);

  const effectiveAttendance = (
    g: InvitationRow["guests"][number],
    eventId: string,
  ) => {
    if (g.kind === "companion" && !companionAllowedFor(eventId)) {
      return "false";
    }
    return attendances[attendanceKey(g.id, eventId)] || "";
  };

  const attendingGuestIds = new Set<string>();
  for (const g of invitation.guests) {
    if (
      invitation.events.some((ev) => effectiveAttendance(g, ev.id) === "true")
    ) {
      attendingGuestIds.add(g.id);
    }
  }

  const visibleQs = visibleQuestions(questions, {
    variantId: invitation.variant_id,
    attendingGuestIds,
  });

  function renderAdminQuestion(
    q: RsvpQuestion,
    guestId: string | null,
    keySuffix: string,
  ) {
    const mapKey = questionFieldKey(q.id, guestId);
    const value = qValues[mapKey];
    const setVal = (next: QuestionValue | undefined) => {
      setQValues((old) => {
        const copy = { ...old };
        if (next === undefined) delete copy[mapKey];
        else copy[mapKey] = next;
        return copy;
      });
    };

    if (q.type === "text") {
      return (
        <Textarea
          key={keySuffix}
          size="xs"
          label={q.label}
          maxLength={QUESTION_POLICY.maxTextAnswerLength}
          autosize
          minRows={1}
          value={value && "text" in value ? value.text : ""}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setVal(v.trim() ? { text: v } : undefined);
          }}
        />
      );
    }

    if (q.type === "number") {
      return (
        <NumberInput
          key={keySuffix}
          size="xs"
          label={q.label}
          min={QUESTION_POLICY.minNumber}
          max={QUESTION_POLICY.maxNumber}
          value={value && "number" in value ? value.number : ""}
          onChange={(v) =>
            setVal(typeof v === "number" ? { number: v } : undefined)
          }
        />
      );
    }

    const selectedIds = value && "optionIds" in value ? value.optionIds : [];
    const otherText = value && "other" in value ? (value.other ?? "") : "";
    const isOther =
      value && "other" in value && typeof value.other === "string";

    if (q.type === "single") {
      return (
        <Stack key={keySuffix} gap={4}>
          <Text size="xs" fw={500}>
            {q.label}
          </Text>
          <Group gap="xs" wrap="wrap">
            {q.options.map((opt) => (
              <Radio
                key={opt.id}
                size="xs"
                label={opt.label}
                checked={!isOther && selectedIds[0] === opt.id}
                onChange={() => setVal({ optionIds: [opt.id] })}
              />
            ))}
            {q.allowOther && (
              <Radio
                size="xs"
                label={labelText("Inne", "Other", "Sonstiges")}
                checked={Boolean(isOther)}
                onChange={() => setVal({ optionIds: [], other: otherText })}
              />
            )}
            {value && (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => setVal(undefined)}
              >
                {labelText("Wyczyść", "Clear", "Leeren")}
              </Button>
            )}
          </Group>
          {isOther && (
            <TextInput
              size="xs"
              maxLength={QUESTION_POLICY.maxOtherLength}
              value={otherText}
              onChange={(e) =>
                setVal({ optionIds: [], other: e.currentTarget.value })
              }
            />
          )}
        </Stack>
      );
    }

    return (
      <Stack key={keySuffix} gap={4}>
        <Text size="xs" fw={500}>
          {q.label}
        </Text>
        <Group gap="xs" wrap="wrap">
          {q.options.map((opt) => (
            <Checkbox
              key={opt.id}
              size="xs"
              label={opt.label}
              checked={selectedIds.includes(opt.id)}
              onChange={(e) => {
                const nextIds = e.currentTarget.checked
                  ? [...selectedIds, opt.id]
                  : selectedIds.filter((id) => id !== opt.id);
                if (!nextIds.length && !isOther) setVal(undefined);
                else
                  setVal({
                    optionIds: nextIds,
                    ...(isOther ? { other: otherText } : {}),
                  });
              }}
            />
          ))}
          {q.allowOther && (
            <Checkbox
              size="xs"
              label={labelText("Inne", "Other", "Sonstiges")}
              checked={Boolean(isOther)}
              onChange={(e) => {
                if (e.currentTarget.checked) {
                  setVal({ optionIds: selectedIds, other: otherText });
                } else if (!selectedIds.length) {
                  setVal(undefined);
                } else {
                  setVal({ optionIds: selectedIds });
                }
              }}
            />
          )}
        </Group>
        {isOther && (
          <TextInput
            size="xs"
            maxLength={QUESTION_POLICY.maxOtherLength}
            value={otherText}
            onChange={(e) =>
              setVal({ optionIds: selectedIds, other: e.currentTarget.value })
            }
          />
        )}
      </Stack>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const answers = invitation.guests.flatMap((g) =>
          invitation.events.flatMap((ev) => {
            const v = effectiveAttendance(g, ev.id);
            return v === "true" || v === "false"
              ? [{ guestId: g.id, eventId: ev.id, attending: v === "true" }]
              : [];
          }),
        );

        const compPayload: Record<string, string | null> = {};
        for (const g of invitation.guests) {
          if (g.kind === "companion") {
            const raw = companionNames[g.id] ?? "";
            compPayload[g.id] = raw.trim() ? raw.trim() : null;
          }
        }

        onSave({
          id: invitation.id,
          revision: invitation.rsvp_revision,
          note,
          answers,
          companionNames: compPayload,
          questionAnswers: collectVisibleQuestionAnswers(visibleQs, qValues),
        });
      }}
    >
      <Stack gap="sm" mt="xs">
        {invitation.guests.map((g) => {
          const isAttending = attendingGuestIds.has(g.id);
          return (
            <Stack key={g.id} gap={6}>
              <Text size="sm" fw={600}>
                {guestDisplayName(g, { companion: companionLabel })}
              </Text>
              <Group gap="md" wrap="wrap">
                {invitation.events.map((ev) => {
                  const yesAllowed =
                    g.kind !== "companion" || companionAllowedFor(ev.id);
                  const val = effectiveAttendance(g, ev.id);
                  return (
                    <Group key={ev.id} gap="xs">
                      {invitation.events.length > 1 && (
                        <Text size="xs">{ev.title}:</Text>
                      )}
                      <SegmentedControl
                        size="xs"
                        value={val}
                        onChange={(nextVal) =>
                          setAttendances((old) =>
                            applyNamedDeclineCascade(
                              invitation.guests,
                              old,
                              g.id,
                              ev.id,
                              nextVal as "true" | "false",
                            ),
                          )
                        }
                        data={[
                          ...(yesAllowed
                            ? [
                                {
                                  value: "true",
                                  label: labelText("Tak", "Yes", "Ja"),
                                },
                              ]
                            : []),
                          {
                            value: "false",
                            label: labelText("Nie", "No", "Nein"),
                          },
                        ]}
                      />
                    </Group>
                  );
                })}
              </Group>
              {g.kind === "companion" && isAttending && (
                <TextInput
                  size="xs"
                  label={labelText(
                    "Imię i nazwisko osoby towarzyszącej (opcjonalnie)",
                    "Companion full name (optional)",
                    "Name der Begleitperson (optional)",
                  )}
                  maxLength={INVITATION_POLICY.maxNameLength}
                  value={companionNames[g.id] ?? ""}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    setCompanionNames((old) => ({ ...old, [g.id]: val }));
                  }}
                />
              )}
              {(visibleQs.byGuest.get(g.id) || []).map((q) =>
                renderAdminQuestion(q, g.id, `${g.id}:${q.id}`),
              )}
            </Stack>
          );
        })}

        {visibleQs.invitation.map((q) =>
          renderAdminQuestion(q, null, `inv:${q.id}`),
        )}

        <Textarea
          size="xs"
          label={labelText("Uwagi", "Notes", "Anmerkungen")}
          maxLength={2000}
          autosize
          minRows={1}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />

        <Group>
          <ActionButton
            size="xs"
            type="submit"
            disabled={busy}
            loading={saving}
            pendingLabel={loadingText(language, "save")}
          >
            {labelText("Zapisz odpowiedzi", "Save RSVP", "RSVP speichern")}
          </ActionButton>
          <Button
            size="xs"
            variant="default"
            disabled={busy}
            onClick={onCancel}
          >
            {labelText("Anuluj", "Cancel", "Abbrechen")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
