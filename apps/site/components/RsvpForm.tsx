"use client";
import { useState } from "react";
import { BusyLabel } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import {
  INVITATION_POLICY,
  OVERALL_EVENT_ID,
  applyNamedDeclineCascade,
  attendanceKey,
  guestDisplayName,
  isEventCompanionAllowed,
  type InvitationGuest,
} from "@invitations/domain/invitation";
import {
  collectVisibleQuestionAnswers,
  questionFieldKey,
  validateQuestionAnswers,
  visibleQuestions,
  type QuestionAnswerInput,
  type QuestionValue,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";
import { QuestionField } from "./QuestionField";
import * as S from "./styles";

export interface RsvpFormCopy {
  noEvents: string;
  pending: string;
  yes: string;
  no: string;
  notes: string;
  save: string;
  refresh: string;
  companion: string;
  companionNameOptional: string;
  allNamedAttending: string;
  questionsSection: string;
  otherOption: string;
  otherPlaceholder: string;
  requiredMissing: string;
  privateInfo: string;
}

export function RsvpForm({
  guests,
  events,
  questions,
  variantId,
  initialAnswers,
  initialCompanionNames,
  initialQuestionAnswers,
  initialNote,
  busy,
  saving,
  closed,
  language,
  copy,
  submitLabel,
  onDirtyChange,
  onRefresh,
  onSubmit,
}: {
  guests: InvitationGuest[];
  events: { id: string; title: string }[];
  questions: RsvpQuestion[];
  variantId: string;
  initialAnswers: Record<string, string>;
  initialCompanionNames?: Record<string, string>;
  initialQuestionAnswers?: Record<string, QuestionValue>;
  initialNote: string;
  busy: boolean;
  saving: boolean;
  closed: boolean;
  dirty?: boolean;
  language: string;
  copy: RsvpFormCopy;
  submitLabel?: string;
  onDirtyChange?: () => void;
  onRefresh?: () => void;
  onSubmit: (payload: {
    answers: { guestId: string; eventId: string; attending: boolean }[];
    companionNames: Record<string, string | null>;
    questionAnswers: QuestionAnswerInput[];
    note: string;
  }) => void;
}) {
  const [answers, setAnswers] =
    useState<Record<string, string>>(initialAnswers);
  const [companionNames, setCompanionNames] = useState<Record<string, string>>(
    initialCompanionNames ?? {},
  );
  const [qAnswers, setQAnswers] = useState<Record<string, QuestionValue>>(
    initialQuestionAnswers ?? {},
  );
  const [note, setNote] = useState(initialNote);
  const [validationError, setValidationError] = useState("");

  const namedGuests = guests.filter((g) => g.kind === "named");
  const companionAllowedFor = (eventId: string) =>
    isEventCompanionAllowed(guests, answers, eventId);

  const effectiveAnswer = (g: InvitationGuest, eventId: string) => {
    const raw = answers[attendanceKey(g.id, eventId)];
    if (g.kind === "companion" && !companionAllowedFor(eventId)) {
      return "false";
    }
    return raw || "";
  };

  const attendingGuestIds = new Set<string>();
  for (const g of guests) {
    if (events.some((ev) => effectiveAnswer(g, ev.id) === "true")) {
      attendingGuestIds.add(g.id);
    }
  }

  const visibleQs = visibleQuestions(questions, {
    variantId,
    attendingGuestIds,
  });

  const missingCount = guests.reduce(
    (sum, g) => sum + events.filter((ev) => !effectiveAnswer(g, ev.id)).length,
    0,
  );

  function setGuestEventAnswer(
    guestId: string,
    eventId: string,
    val: "true" | "false",
  ) {
    setAnswers((old) =>
      applyNamedDeclineCascade(guests, old, guestId, eventId, val),
    );
    setValidationError("");
    onDirtyChange?.();
  }

  function markAllNamedAttending() {
    setAnswers((old) => {
      const next = { ...old };
      for (const g of namedGuests) {
        for (const ev of events) {
          next[attendanceKey(g.id, ev.id)] = "true";
        }
      }
      return next;
    });
    setValidationError("");
    onDirtyChange?.();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const attendancePayload = guests.flatMap((g) =>
      events.flatMap((ev) => {
        const v = effectiveAnswer(g, ev.id);
        return v === "true" || v === "false"
          ? [{ guestId: g.id, eventId: ev.id, attending: v === "true" }]
          : [];
      }),
    );

    const questionPayload = collectVisibleQuestionAnswers(visibleQs, qAnswers);

    const errors = validateQuestionAnswers(questions, questionPayload, {
      variantId,
      attendingGuestIds,
      enforceRequired: true,
    });
    if (errors.length > 0) {
      setValidationError(copy.requiredMissing);
      return;
    }

    const compPayload: Record<string, string | null> = {};
    for (const g of guests) {
      if (g.kind === "companion") {
        const raw = companionNames[g.id] ?? g.name ?? "";
        compPayload[g.id] = raw.trim() ? raw.trim() : null;
      }
    }

    onSubmit({
      answers: attendancePayload,
      companionNames: compPayload,
      questionAnswers: questionPayload,
      note,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {!events.length && <p>{copy.noEvents}</p>}
      {!!events.length && (
        <S.RsvpToolbar>
          <S.RsvpPending>
            {copy.pending}: {missingCount}
          </S.RsvpPending>
          {namedGuests.length > 0 && !closed && (
            <S.RsvpCompactButton
              type="button"
              disabled={busy || closed}
              onClick={markAllNamedAttending}
            >
              {copy.allNamedAttending}
            </S.RsvpCompactButton>
          )}
        </S.RsvpToolbar>
      )}

      {!!events.length &&
        guests.map((g) => {
          const isCompanion = g.kind === "companion";
          const isGuestAttending = attendingGuestIds.has(g.id);
          const guestQuestions = visibleQs.byGuest.get(g.id) || [];

          return (
            <S.RsvpGuestCard key={g.id} disabled={busy || closed}>
              <legend>
                {guestDisplayName(g, { companion: copy.companion })}
              </legend>

              <S.RsvpEventList>
                {events.map((ev) => {
                  const value = effectiveAnswer(g, ev.id);
                  const yesAllowed = !isCompanion || companionAllowedFor(ev.id);
                  return (
                    <S.RsvpEventRow key={ev.id}>
                      {ev.id !== OVERALL_EVENT_ID && (
                        <S.RsvpEventTitle>{ev.title}</S.RsvpEventTitle>
                      )}
                      <S.RsvpChoiceGroup>
                        <S.RsvpChoicePill data-choice="yes">
                          <input
                            type="radio"
                            name={`att-${g.id}-${ev.id}`}
                            disabled={busy || closed || !yesAllowed}
                            checked={value === "true"}
                            onChange={() =>
                              setGuestEventAnswer(g.id, ev.id, "true")
                            }
                          />
                          {copy.yes}
                        </S.RsvpChoicePill>
                        <S.RsvpChoicePill data-choice="no">
                          <input
                            type="radio"
                            name={`att-${g.id}-${ev.id}`}
                            disabled={busy || closed}
                            checked={value === "false"}
                            onChange={() =>
                              setGuestEventAnswer(g.id, ev.id, "false")
                            }
                          />
                          {copy.no}
                        </S.RsvpChoicePill>
                      </S.RsvpChoiceGroup>
                    </S.RsvpEventRow>
                  );
                })}
              </S.RsvpEventList>

              {isCompanion && isGuestAttending && (
                <S.RsvpCompanionField>
                  {copy.companionNameOptional}
                  <input
                    type="text"
                    maxLength={INVITATION_POLICY.maxNameLength}
                    value={companionNames[g.id] ?? g.name ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCompanionNames((old) => ({ ...old, [g.id]: val }));
                      onDirtyChange?.();
                    }}
                  />
                </S.RsvpCompanionField>
              )}

              {guestQuestions.map((q) => (
                <QuestionField
                  key={q.id}
                  question={q}
                  value={qAnswers[questionFieldKey(q.id, g.id)]}
                  disabled={busy || closed}
                  namePrefix={`q-${g.id}`}
                  copy={copy}
                  onChange={(nextVal) => {
                    setQAnswers((old) => {
                      const copyMap = { ...old };
                      const k = questionFieldKey(q.id, g.id);
                      if (nextVal === undefined) {
                        delete copyMap[k];
                      } else {
                        copyMap[k] = nextVal;
                      }
                      return copyMap;
                    });
                    setValidationError("");
                    onDirtyChange?.();
                  }}
                />
              ))}
            </S.RsvpGuestCard>
          );
        })}

      {visibleQs.invitation.length > 0 && (
        <S.RsvpGuestCard disabled={busy || closed}>
          <legend>{copy.questionsSection}</legend>
          {visibleQs.invitation.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={qAnswers[questionFieldKey(q.id, null)]}
              disabled={busy || closed}
              namePrefix="q-inv"
              copy={copy}
              onChange={(nextVal) => {
                setQAnswers((old) => {
                  const copyMap = { ...old };
                  const k = questionFieldKey(q.id, null);
                  if (nextVal === undefined) {
                    delete copyMap[k];
                  } else {
                    copyMap[k] = nextVal;
                  }
                  return copyMap;
                });
                setValidationError("");
                onDirtyChange?.();
              }}
            />
          ))}
        </S.RsvpGuestCard>
      )}

      {questions.length > 0 && (
        <S.RsvpPrivacyNote>{copy.privateInfo}</S.RsvpPrivacyNote>
      )}

      <S.RsvpNotesField>
        {copy.notes}
        <textarea
          maxLength={2000}
          disabled={busy || closed}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            onDirtyChange?.();
          }}
        />
      </S.RsvpNotesField>

      {validationError && <p role="alert">{validationError}</p>}

      <S.RsvpActions>
        <button disabled={busy || closed} aria-busy={busy || undefined}>
          <BusyLabel busy={saving} label={loadingText(language, "save")}>
            {submitLabel || copy.save}
          </BusyLabel>
        </button>
        {onRefresh && (
          <button type="button" disabled={busy} onClick={onRefresh}>
            {copy.refresh}
          </button>
        )}
      </S.RsvpActions>
    </form>
  );
}
