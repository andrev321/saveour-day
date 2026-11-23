"use client";
import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { TrashIcon } from "@phosphor-icons/react";
import {
  QUESTION_POLICY,
  type QuestionScope,
  type QuestionType,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";
import { usePanelI18n } from "../lib/i18n";
import { ModalStickyFooter } from "./modal-layout.styles";

export type EditableQuestion = RsvpQuestion & { isNew?: boolean };

function useQuestionText() {
  const { language } = usePanelI18n();
  return (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
}

export function RsvpQuestionModal({
  opened,
  mode,
  initialQuestion,
  variants,
  answerCount,
  answerCountByOption,
  onClose,
  onSubmit,
}: {
  opened: boolean;
  mode: "create" | "edit";
  initialQuestion: EditableQuestion | null;
  variants: { value: string; label: string }[];
  answerCount: number;
  answerCountByOption: Map<string, number>;
  onClose: () => void;
  onSubmit: (question: EditableQuestion) => void;
}) {
  const labelText = useQuestionText();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        mode === "create"
          ? labelText(
              "Nowe pytanie RSVP",
              "New RSVP question",
              "Neue RSVP-Frage",
            )
          : labelText(
              "Edycja pytania RSVP",
              "Edit RSVP question",
              "RSVP-Frage bearbeiten",
            )
      }
    >
      {opened && initialQuestion && (
        <RsvpQuestionForm
          key={initialQuestion.id}
          mode={mode}
          initialQuestion={initialQuestion}
          variants={variants}
          answerCount={answerCount}
          answerCountByOption={answerCountByOption}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}

function RsvpQuestionForm({
  mode,
  initialQuestion,
  variants,
  answerCount,
  answerCountByOption,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initialQuestion: EditableQuestion;
  variants: { value: string; label: string }[];
  answerCount: number;
  answerCountByOption: Map<string, number>;
  onClose: () => void;
  onSubmit: (question: EditableQuestion) => void;
}) {
  const labelText = useQuestionText();

  const [q, setQ] = useState<EditableQuestion>(() => ({
    ...initialQuestion,
    options: initialQuestion.options.map((o) => ({ ...o })),
  }));
  const [confirmDeleteOption, setConfirmDeleteOption] = useState<{
    optionId: string;
    count: number;
  } | null>(null);

  const isImmutable = !q.isNew && answerCount > 0;
  const needsOptions = q.type === "single" || q.type === "multi";
  const validOptions = q.options.filter((o) => o.label.trim().length > 0);
  const canSubmit =
    q.label.trim().length > 0 && (!needsOptions || validOptions.length >= 2);

  const typeLabel = (t: QuestionType) => {
    if (t === "text") return labelText("Tekst", "Text", "Text");
    if (t === "number") return labelText("Liczba", "Number", "Zahl");
    if (t === "single")
      return labelText("Jednokrotny wybór", "Single choice", "Einfachauswahl");
    return labelText("Wielokrotny wybór", "Multiple choice", "Mehrfachauswahl");
  };

  const update = (patch: Partial<EditableQuestion>) =>
    setQ((prev) => ({ ...prev, ...patch }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit({
          ...q,
          label: q.label.trim(),
          options: needsOptions
            ? validOptions.map((o) => ({ ...o, label: o.label.trim() }))
            : [],
        });
      }}
    >
      <Stack gap="sm">
        <TextInput
          label={labelText("Treść pytania", "Question label", "Frage")}
          value={q.label}
          required
          data-autofocus
          maxLength={QUESTION_POLICY.maxLabelLength}
          onChange={(e) => update({ label: e.currentTarget.value })}
        />
        <TextInput
          label={labelText(
            "Opis pomocniczy (opcjonalnie)",
            "Helper text (optional)",
            "Hilfetext (optional)",
          )}
          value={q.help ?? ""}
          maxLength={QUESTION_POLICY.maxHelpLength}
          onChange={(e) => update({ help: e.currentTarget.value || null })}
        />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <div>
            <Text size="xs" fw={500} mb={4}>
              {labelText("Kogo dotyczy", "Scope", "Bereich")}
            </Text>
            <SegmentedControl
              fullWidth
              disabled={isImmutable}
              value={q.scope}
              onChange={(v) => update({ scope: v as QuestionScope })}
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
              const nextNeedsOptions =
                nextType === "single" || nextType === "multi";
              update({
                type: nextType,
                allowOther: nextNeedsOptions ? q.allowOther : false,
                options: nextNeedsOptions
                  ? q.options.length
                    ? q.options
                    : [
                        {
                          id: crypto.randomUUID().slice(0, 8),
                          label: labelText("Tak", "Yes", "Ja"),
                        },
                        {
                          id: crypto.randomUUID().slice(0, 8),
                          label: labelText("Nie", "No", "Nein"),
                        },
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
        </SimpleGrid>
        {isImmutable && (
          <Text size="xs" c="dimmed">
            {labelText(
              "Pytanie ma już odpowiedzi — typu i zakresu nie można zmienić (usuń i utwórz nowe).",
              "This question already has answers — type and scope are locked.",
              "Diese Frage hat bereits Antworten — Typ und Bereich sind gesperrt.",
            )}
          </Text>
        )}

        {needsOptions && (
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
                        update({
                          options: q.options.map((o, i) =>
                            i === optIdx ? { ...o, label } : o,
                          ),
                        });
                      }}
                    />
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      disabled={q.options.length <= 1}
                      aria-label={labelText(
                        "Usuń opcję",
                        "Remove option",
                        "Option entfernen",
                      )}
                      onClick={() => {
                        if (optCount > 0) {
                          setConfirmDeleteOption({
                            optionId: opt.id,
                            count: optCount,
                          });
                        } else {
                          update({
                            options: q.options.filter((_, i) => i !== optIdx),
                          });
                        }
                      }}
                    >
                      <TrashIcon size={16} />
                    </ActionIcon>
                  </Group>
                  {confirmDeleteOption?.optionId === opt.id && (
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
                            onClick={() => setConfirmDeleteOption(null)}
                          >
                            {labelText("Anuluj", "Cancel", "Abbrechen")}
                          </Button>
                          <Button
                            size="compact-xs"
                            color="red"
                            onClick={() => {
                              update({
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
                  update({
                    options: [
                      ...q.options,
                      { id: crypto.randomUUID().slice(0, 8), label: "" },
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
                  update({ allowOther: e.currentTarget.checked })
                }
              />
            </Group>
          </Stack>
        )}

        <Group justify="space-between" wrap="wrap">
          <Switch
            label={labelText("Wymagane", "Required", "Pflichtfeld")}
            checked={q.required}
            onChange={(e) => update({ required: e.currentTarget.checked })}
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
            onChange={(variantIds) => update({ variantIds })}
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
                labelText("(Treść pytania)", "(Question label)", "(Fragetext)")}
              {q.required ? " *" : ""}
            </Text>
            {q.help && (
              <Text size="xs" c="dimmed">
                {q.help}
              </Text>
            )}
            <Text size="xs" c="dimmed">
              {q.type === "text" &&
                labelText("[ Pole tekstowe ]", "[ Text area ]", "[ Textfeld ]")}
              {q.type === "number" && "[ − ]  0  [ + ]"}
              {needsOptions &&
                [
                  ...q.options.map((o) => o.label || "…"),
                  ...(q.allowOther
                    ? [labelText("Inne", "Other", "Sonstiges")]
                    : []),
                ].join(" · ")}
            </Text>
          </Stack>
        </Card>
        <ModalStickyFooter justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {labelText("Anuluj", "Cancel", "Abbrechen")}
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {mode === "create"
              ? labelText("Dodaj pytanie", "Add question", "Frage hinzufügen")
              : labelText("Zapisz zmiany", "Save changes", "Speichern")}
          </Button>
        </ModalStickyFooter>
      </Stack>
    </form>
  );
}
