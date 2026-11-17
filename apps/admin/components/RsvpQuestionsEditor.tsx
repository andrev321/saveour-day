"use client";
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Menu,
  MultiSelect,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
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

type DraftQuestion = RsvpQuestion & { isNew?: boolean };

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

  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    initialQuestions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    count: number;
  } | null>(null);
  const [confirmDeleteOption, setConfirmDeleteOption] = useState<{
    questionId: string;
    optionId: string;
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

  function addPreset(key: PresetKey) {
    if (questions.length >= QUESTION_POLICY.maxQuestions) return;
    const p = presets[key];
    const id = crypto.randomUUID();
    setQuestions((old) => [
      ...old,
      {
        ...p,
        id,
        options: p.options.map((o) => ({ ...o })),
        isNew: true,
      },
    ]);
    setEditingId(id);
  }

  function addCustom() {
    if (questions.length >= QUESTION_POLICY.maxQuestions) return;
    const id = crypto.randomUUID();
    setQuestions((old) => [
      ...old,
      {
        id,
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
    ]);
    setEditingId(id);
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

  function updateQuestion(id: string, patch: Partial<DraftQuestion>) {
    setQuestions((old) =>
      old.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    );
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

  const stripNew = (q: DraftQuestion): RsvpQuestion => {
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
            onClick={addCustom}
          >
            {labelText("+ Nowe pytanie", "+ New question", "+ Neue Frage")}
          </Button>
          <Menu shadow="md">
            <Menu.Target>
              <Button
                size="xs"
                variant="light"
                disabled={busy || questions.length >= QUESTION_POLICY.maxQuestions}
              >
                {labelText(
                  "Dodaj z gotowych ▾",
                  "Add from presets ▾",
                  "Aus Vorlagen ▾",
                )}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {(["diet", "allergies", "lodging", "parking"] as PresetKey[]).map(
                (key) => (
                  <Menu.Item key={key} onClick={() => addPreset(key)}>
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
        const isImmutable = !q.isNew && answerCount > 0;
        const isEditing = editingId === q.id;
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
                      labelText("(Nowe pytanie)", "(New question)", "(Neue Frage)")}
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
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={busy || index === 0}
                    onClick={() => moveQuestion(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    disabled={busy || index === questions.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    size="compact-xs"
                    variant="light"
                    disabled={busy}
                    onClick={() => setEditingId(isEditing ? null : q.id)}
                  >
                    {isEditing
                      ? labelText("Gotowe", "Done", "Fertig")
                      : labelText("Edytuj", "Edit", "Bearbeiten")}
                  </Button>
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    disabled={busy}
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
                    ✕
                  </Button>
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

              {isEditing && (
                <Stack gap="xs" pt="xs">
                  <TextInput
                    label={labelText("Treść pytania", "Question label", "Frage")}
                    value={q.label}
                    required
                    maxLength={QUESTION_POLICY.maxLabelLength}
                    onChange={(e) =>
                      updateQuestion(q.id, { label: e.currentTarget.value })
                    }
                  />
                  <TextInput
                    label={labelText(
                      "Opis pomocniczy (opcjonalnie)",
                      "Helper text (optional)",
                      "Hilfetext (optional)",
                    )}
                    value={q.help ?? ""}
                    maxLength={QUESTION_POLICY.maxHelpLength}
                    onChange={(e) =>
                      updateQuestion(q.id, {
                        help: e.currentTarget.value || null,
                      })
                    }
                  />
                  <Group grow>
                    <div>
                      <Text size="xs" fw={500} mb={4}>
                        {labelText("Kogo dotyczy", "Scope", "Bereich")}
                      </Text>
                      <SegmentedControl
                        fullWidth
                        disabled={isImmutable}
                        value={q.scope}
                        onChange={(v) =>
                          updateQuestion(q.id, { scope: v as QuestionScope })
                        }
                        data={[
                          {
                            value: "guest",
                            label: labelText("Każdej osoby", "Per guest", "Pro Person"),
                          },
                          {
                            value: "invitation",
                            label: labelText(
                              "Całego zaproszenia",
                              "Per invitation",
                              "Pro Einladung",
                            ),
                          },
                        ]}
                      />
                    </div>
                    <Select
                      label={labelText("Typ odpowiedzi", "Answer type", "Antworttyp")}
                      disabled={isImmutable}
                      value={q.type}
                      onChange={(v) => {
                        const nextType = (v as QuestionType) || "text";
                        const needsOptions =
                          nextType === "single" || nextType === "multi";
                        updateQuestion(q.id, {
                          type: nextType,
                          allowOther: needsOptions ? q.allowOther : false,
                          options: needsOptions
                            ? q.options.length
                              ? q.options
                              : [
                                  { id: crypto.randomUUID().slice(0, 8), label: labelText("Tak", "Yes", "Ja") },
                                  { id: crypto.randomUUID().slice(0, 8), label: labelText("Nie", "No", "Nein") },
                                ]
                            : [],
                        });
                      }}
                      data={[
                        { value: "text", label: typeLabel("text") },
                        { value: "single", label: typeLabel("single") },
                        { value: "multi", label: typeLabel("multi") },
                        { value: "number", label: typeLabel("number") },
                      ]}
                    />
                  </Group>
                  {isImmutable && (
                    <Text size="xs" c="dimmed">
                      {labelText(
                        "Pytanie ma już odpowiedzi — typu i zakresu nie można zmienić (usuń i utwórz nowe).",
                        "This question already has answers — type and scope are locked.",
                        "Diese Frage hat bereits Antworten — Typ und Bereich sind gesperrt.",
                      )}
                    </Text>
                  )}

                  {(q.type === "single" || q.type === "multi") && (
                    <Stack gap={6}>
                      <Text size="xs" fw={500}>
                        {labelText("Możliwe odpowiedzi", "Options", "Optionen")}
                      </Text>
                      {q.options.map((opt, optIdx) => {
                        const optCount =
                          answerCountByOption.get(`${q.id}:${opt.id}`) ?? 0;
                        return (
                          <Stack key={opt.id} gap={4}>
                            <Group gap="xs">
                              <TextInput
                                style={{ flex: 1 }}
                                value={opt.label}
                                maxLength={QUESTION_POLICY.maxOptionLabelLength}
                                onChange={(e) => {
                                  const label = e.currentTarget.value;
                                  updateQuestion(q.id, {
                                    options: q.options.map((o, i) =>
                                      i === optIdx ? { ...o, label } : o,
                                    ),
                                  });
                                }}
                              />
                              <Button
                                size="xs"
                                variant="subtle"
                                color="red"
                                disabled={q.options.length <= 1}
                                onClick={() => {
                                  if (optCount > 0) {
                                    setConfirmDeleteOption({
                                      questionId: q.id,
                                      optionId: opt.id,
                                      count: optCount,
                                    });
                                  } else {
                                    updateQuestion(q.id, {
                                      options: q.options.filter(
                                        (_, i) => i !== optIdx,
                                      ),
                                    });
                                  }
                                }}
                              >
                                ✕
                              </Button>
                            </Group>
                            {confirmDeleteOption?.questionId === q.id &&
                              confirmDeleteOption.optionId === opt.id && (
                                <Alert color="red">
                                  <Group justify="space-between">
                                    <Text size="xs">
                                      {labelText(
                                        `Usunięcie tej opcji wyczyści ${confirmDeleteOption.count} odpowiedzi.`,
                                        `Removing this option will clear ${confirmDeleteOption.count} answers.`,
                                        `Das Entfernen löscht ${confirmDeleteOption.count} Antworten.`,
                                      )}
                                    </Text>
                                    <Group gap="xs">
                                      <Button
                                        size="compact-xs"
                                        variant="default"
                                        onClick={() =>
                                          setConfirmDeleteOption(null)
                                        }
                                      >
                                        {labelText(
                                          "Anuluj",
                                          "Cancel",
                                          "Abbrechen",
                                        )}
                                      </Button>
                                      <Button
                                        size="compact-xs"
                                        color="red"
                                        onClick={() => {
                                          updateQuestion(q.id, {
                                            options: q.options.filter(
                                              (_, i) => i !== optIdx,
                                            ),
                                          });
                                          setConfirmDeleteOption(null);
                                        }}
                                      >
                                        {labelText(
                                          "Usuń opcję",
                                          "Delete option",
                                          "Option löschen",
                                        )}
                                      </Button>
                                    </Group>
                                  </Group>
                                </Alert>
                              )}
                          </Stack>
                        );
                      })}
                      <Group>
                        <Button
                          size="xs"
                          variant="light"
                          disabled={q.options.length >= QUESTION_POLICY.maxOptions}
                          onClick={() =>
                            updateQuestion(q.id, {
                              options: [
                                ...q.options,
                                {
                                  id: crypto.randomUUID().slice(0, 8),
                                  label: "",
                                },
                              ],
                            })
                          }
                        >
                          {labelText(
                            "+ Dodaj odpowiedź",
                            "+ Add option",
                            "+ Option hinzufügen",
                          )}
                        </Button>
                        <Checkbox
                          label={labelText(
                            "Pozwól wpisać „Inne”",
                            "Allow “Other”",
                            "„Sonstiges“ erlauben",
                          )}
                          checked={q.allowOther}
                          onChange={(e) =>
                            updateQuestion(q.id, {
                              allowOther: e.currentTarget.checked,
                            })
                          }
                        />
                      </Group>
                    </Stack>
                  )}

                  <Group justify="space-between" wrap="wrap">
                    <Switch
                      label={labelText("Wymagane", "Required", "Pflichtfeld")}
                      checked={q.required}
                      onChange={(e) =>
                        updateQuestion(q.id, {
                          required: e.currentTarget.checked,
                        })
                      }
                    />
                    <MultiSelect
                      style={{ minWidth: 240 }}
                      label={labelText(
                        "Warianty (puste = wszystkie)",
                        "Variants (empty = all)",
                        "Varianten (leer = alle)",
                      )}
                      placeholder={labelText(
                        "Wszystkie warianty",
                        "All variants",
                        "Alle Varianten",
                      )}
                      data={variants}
                      value={q.variantIds}
                      onChange={(variantIds) =>
                        updateQuestion(q.id, { variantIds })
                      }
                      clearable
                    />
                  </Group>
                  <Card withBorder padding="xs">
                    <Stack gap={4}>
                      <Text size="xs" c="dimmed">
                        {labelText(
                          "Podgląd (jak zobaczy gość):",
                          "Preview (guest view):",
                          "Vorschau (Gästeansicht):",
                        )}
                      </Text>
                      <Text size="sm" fw={500}>
                        {q.label ||
                          labelText(
                            "(Treść pytania)",
                            "(Question label)",
                            "(Fragetext)",
                          )}
                        {q.required ? " *" : ""}
                      </Text>
                      {q.help && (
                        <Text size="xs" c="dimmed">
                          {q.help}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {q.type === "text" &&
                          labelText(
                            "[ Pole tekstowe ]",
                            "[ Text area ]",
                            "[ Textfeld ]",
                          )}
                        {q.type === "number" && "[ − ]  0  [ + ]"}
                        {(q.type === "single" || q.type === "multi") &&
                          [
                            ...q.options.map((o) => o.label || "…"),
                            ...(q.allowOther
                              ? [labelText("Inne", "Other", "Sonstiges")]
                              : []),
                          ].join(" · ")}
                      </Text>
                    </Stack>
                  </Card>
                </Stack>
              )}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
