"use client";
import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretDownIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { loadingText } from "@invitations/ui/loading-copy";
import {
  QUESTION_POLICY,
  questionPresets,
  type PresetKey,
  type QuestionAnswerRecord,
  type QuestionScope,
  type QuestionType,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";
import { ActionButton } from "./ActionButton";
import { usePanelI18n } from "../lib/i18n";
import { RsvpQuestionModal, type EditableQuestion } from "./RsvpQuestionModal";

export function RsvpQuestionsEditor({
  initialQuestions,
  questionAnswers,
  variants,
  locale,
  busy,
  saving,
  onSave,
}: {
  initialQuestions: RsvpQuestion[];
  questionAnswers: QuestionAnswerRecord[];
  variants: { value: string; label: string }[];
  locale: string;
  busy: boolean;
  saving: boolean;
  onSave: (questions: RsvpQuestion[]) => void;
}) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;

  const [questions, setQuestions] = useState<EditableQuestion[]>(() =>
    initialQuestions.map((q) => ({
      ...q,
      options: q.options.map((o) => ({ ...o })),
    })),
  );
  const [modalState, setModalState] = useState<{
    mode: "create" | "edit";
    question: EditableQuestion;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    count: number;
  } | null>(null);

  const answerCountByQuestion = new Map<string, number>();
  const answerCountByOption = new Map<string, number>();
  for (const a of questionAnswers) {
    answerCountByQuestion.set(
      a.questionId,
      (answerCountByQuestion.get(a.questionId) ?? 0) + 1,
    );
    if ("optionIds" in a.value) {
      for (const optId of a.value.optionIds) {
        const key = `${a.questionId}:${optId}`;
        answerCountByOption.set(key, (answerCountByOption.get(key) ?? 0) + 1);
      }
    }
  }

  const presets = questionPresets(locale);
  const variantIdsSet = new Set(variants.map((v) => v.value));

  function openPresetModal(key: PresetKey) {
    if (questions.length >= QUESTION_POLICY.maxQuestions) return;
    const p = presets[key];
    setModalState({
      mode: "create",
      question: {
        ...p,
        id: crypto.randomUUID(),
        options: p.options.map((o) => ({ ...o })),
        isNew: true,
      },
    });
  }

  function openCustomModal() {
    if (questions.length >= QUESTION_POLICY.maxQuestions) return;
    setModalState({
      mode: "create",
      question: {
        id: crypto.randomUUID(),
        scope: "guest",
        type: "text",
        label: "",
        help: null,
        required: false,
        allowOther: false,
        options: [],
        variantIds: [],
        presetKey: null,
        isNew: true,
      },
    });
  }

  function moveQuestion(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    setQuestions((old) => {
      const next = [...old];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item!);
      return next;
    });
  }

  const scopeLabel = (s: QuestionScope) =>
    s === "guest"
      ? labelText("Na osobę", "Per guest", "Pro Person")
      : labelText("Na zaproszenie", "Per invitation", "Pro Einladung");

  const typeLabel = (t: QuestionType) => {
    if (t === "text") return labelText("Tekst", "Text", "Text");
    if (t === "number") return labelText("Liczba", "Number", "Zahl");
    if (t === "single")
      return labelText("Jednokrotny wybór", "Single choice", "Einfachauswahl");
    return labelText("Wielokrotny wybór", "Multiple choice", "Mehrfachauswahl");
  };

  const stripNew = (q: EditableQuestion): RsvpQuestion => {
    const copy = { ...q };
    delete copy.isNew;
    return copy;
  };

  const dirty =
    JSON.stringify(questions.map(stripNew)) !==
    JSON.stringify(initialQuestions);

  return (
    <Stack gap="sm">
      <Group justify="space-between" wrap="wrap">
        <Group>
          <Button
            size="xs"
            disabled={busy || questions.length >= QUESTION_POLICY.maxQuestions}
            onClick={openCustomModal}
          >
            {labelText("+ Nowe pytanie", "+ New question", "+ Neue Frage")}
          </Button>
          <Menu shadow="md">
            <Menu.Target>
              <Button
                size="xs"
                variant="light"
                rightSection={<CaretDownIcon size={14} />}
                disabled={
                  busy || questions.length >= QUESTION_POLICY.maxQuestions
                }
              >
                {labelText(
                  "Dodaj z gotowych",
                  "Add from presets",
                  "Aus Vorlagen",
                )}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {(["diet", "allergies", "lodging", "parking"] as PresetKey[]).map(
                (key) => (
                  <Menu.Item key={key} onClick={() => openPresetModal(key)}>
                    {presets[key].label} ({scopeLabel(presets[key].scope)})
                  </Menu.Item>
                ),
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
        <ActionButton
          size="xs"
          disabled={busy || !dirty}
          loading={saving}
          pendingLabel={loadingText(language, "save")}
          onClick={() => onSave(questions.map(stripNew))}
        >
          {labelText("Zapisz pytania", "Save questions", "Fragen speichern")}
        </ActionButton>
      </Group>

      {questions.length === 0 && (
        <Text size="sm" c="dimmed">
          {labelText(
            "Brak dodatkowych pytań. Dodaj własne pytanie lub skorzystaj z gotowych przykładów.",
            "No custom questions yet. Add a question or pick one of the presets.",
            "Noch keine Fragen. Fügen Sie eine Frage oder eine Vorlage hinzu.",
          )}
        </Text>
      )}

      {questions.map((q, index) => {
        const answerCount = answerCountByQuestion.get(q.id) ?? 0;
        const hasMissingVariant = q.variantIds.some(
          (id) => !variantIdsSet.has(id),
        );

        return (
          <Card withBorder key={q.id} padding="sm">
            <Stack gap="xs">
              <Group justify="space-between" wrap="wrap">
                <Group gap="xs">
                  <Text fw={600} size="sm">
                    {q.label ||
                      labelText(
                        "(Nowe pytanie)",
                        "(New question)",
                        "(Neue Frage)",
                      )}
                  </Text>
                  <Badge size="xs" variant="light">
                    {scopeLabel(q.scope)}
                  </Badge>
                  <Badge size="xs" variant="outline">
                    {typeLabel(q.type)}
                  </Badge>
                  {q.required && (
                    <Badge size="xs" color="red" variant="light">
                      {labelText("Wymagane", "Required", "Pflicht")}
                    </Badge>
                  )}
                  {hasMissingVariant && (
                    <Badge size="xs" color="yellow">
                      {labelText(
                        "Nieaktualny wariant",
                        "Missing variant",
                        "Variante fehlt",
                      )}
                    </Badge>
                  )}
                </Group>
                <Group gap={4}>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    disabled={busy || index === 0}
                    aria-label={labelText(
                      "Przesuń w górę",
                      "Move up",
                      "Nach oben",
                    )}
                    onClick={() => moveQuestion(index, -1)}
                  >
                    <ArrowUpIcon size={16} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    disabled={busy || index === questions.length - 1}
                    aria-label={labelText(
                      "Przesuń w dół",
                      "Move down",
                      "Nach unten",
                    )}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    <ArrowDownIcon size={16} />
                  </ActionIcon>
                  <Button
                    size="compact-xs"
                    variant="light"
                    disabled={busy}
                    onClick={() =>
                      setModalState({
                        mode: "edit",
                        question: q,
                      })
                    }
                  >
                    {labelText("Edytuj", "Edit", "Bearbeiten")}
                  </Button>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    disabled={busy}
                    aria-label={labelText(
                      "Usuń pytanie",
                      "Delete question",
                      "Frage löschen",
                    )}
                    onClick={() => {
                      if (answerCount > 0) {
                        setConfirmDelete({ id: q.id, count: answerCount });
                      } else {
                        setQuestions((old) =>
                          old.filter((item) => item.id !== q.id),
                        );
                      }
                    }}
                  >
                    <TrashIcon size={16} />
                  </ActionIcon>
                </Group>
              </Group>

              {confirmDelete?.id === q.id && (
                <Alert color="red">
                  <Group justify="space-between">
                    <Text size="xs">
                      {labelText(
                        `Usunięcie tego pytania skasuje ${confirmDelete.count} zapisanych odpowiedzi.`,
                        `Deleting this question will erase ${confirmDelete.count} saved answers.`,
                        `Das Löschen entfernt ${confirmDelete.count} Antworten.`,
                      )}
                    </Text>
                    <Group gap="xs">
                      <Button
                        size="compact-xs"
                        variant="default"
                        onClick={() => setConfirmDelete(null)}
                      >
                        {labelText("Anuluj", "Cancel", "Abbrechen")}
                      </Button>
                      <Button
                        size="compact-xs"
                        color="red"
                        onClick={() => {
                          setQuestions((old) =>
                            old.filter((item) => item.id !== q.id),
                          );
                          setConfirmDelete(null);
                        }}
                      >
                        {labelText("Usuń pytanie", "Delete", "Löschen")}
                      </Button>
                    </Group>
                  </Group>
                </Alert>
              )}
            </Stack>
          </Card>
        );
      })}

      <RsvpQuestionModal
        opened={!!modalState}
        mode={modalState?.mode ?? "create"}
        initialQuestion={modalState?.question ?? null}
        variants={variants}
        answerCount={
          modalState
            ? (answerCountByQuestion.get(modalState.question.id) ?? 0)
            : 0
        }
        answerCountByOption={answerCountByOption}
        onClose={() => setModalState(null)}
        onSubmit={(submitted) => {
          if (modalState?.mode === "create") {
            setQuestions((old) => [...old, submitted]);
          } else {
            setQuestions((old) =>
              old.map((item) => (item.id === submitted.id ? submitted : item)),
            );
          }
          setModalState(null);
        }}
      />
    </Stack>
  );
}
