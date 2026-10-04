"use client";
import {
  Accordion,
  Badge,
  Button,
  Checkbox,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { CheckCircleIcon, ListChecksIcon } from "@phosphor-icons/react";

export function PreparationChecklist({
  siteId,
  language,
  onSelect,
  onReview,
  reviewDisabled,
}: {
  siteId: string;
  language: "pl" | "en" | "de";
  onSelect: (panel: string) => void;
  onReview: () => void;
  reviewDisabled: boolean;
}) {
  const label = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  const [collapsed, setCollapsed] = useLocalStorage<boolean>({
    key: `invitation-preparation-v1:${siteId}:collapsed`,
    defaultValue: false,
  });
  const [checked, setChecked] = useLocalStorage<string[]>({
    key: `invitation-preparation-v1:${siteId}:completed`,
    defaultValue: [],
  });
  const steps = [
    {
      id: "content",
      title: label("Dane i miejsca", "Details & venues", "Details & Orte"),
    },
    { id: "appearance", title: label("Wygląd", "Appearance", "Design") },
    {
      id: "guests",
      title: label("Goście i dostęp", "Guests & access", "Gäste & Zugang"),
    },
    {
      id: "review",
      title: label(
        "Sprawdź przed publikacją",
        "Review before publishing",
        "Vor Veröffentlichung prüfen",
      ),
    },
  ];
  const completed = steps.filter(
    (step) => Array.isArray(checked) && checked.includes(step.id),
  );
  const done = completed.length === steps.length;
  return (
    <Accordion
      variant="contained"
      value={collapsed === true ? null : "preparation"}
      onChange={(value) => setCollapsed(value !== "preparation")}
      data-ui="preparation-checklist"
    >
      <Accordion.Item value="preparation">
        <Accordion.Control
          icon={
            done ? (
              <CheckCircleIcon
                size={22}
                weight="fill"
                color="var(--mantine-color-teal-6)"
              />
            ) : (
              <ListChecksIcon size={22} />
            )
          }
        >
          <Stack gap={4}>
            <Text fw={600} size="sm">
              {label(
                "Przed publikacją",
                "Before publishing",
                "Vor der Veröffentlichung",
              )}
            </Text>
            <Badge color={done ? "teal" : "gray"} variant="light" size="sm">
              {completed.length}/{steps.length}{" "}
              {label("wykonane", "completed", "erledigt")}
            </Badge>
          </Stack>
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              {label(
                "Odhacz kroki po sprawdzeniu. Kliknij nazwę, aby przejść do edycji.",
                "Check off steps after reviewing. Click a title to open the editor.",
                "Schritte nach der Prüfung abhaken. Zum Bearbeiten auf den Titel klicken.",
              )}
            </Text>
            {steps.map((step, index) => {
              const isDone = completed.some((item) => item.id === step.id);
              return (
                <Group key={step.id} gap="xs" wrap="nowrap" align="center">
                  <Checkbox
                    checked={isDone}
                    color="teal"
                    aria-label={
                      label(
                        "Wykonany krok",
                        "Completed step",
                        "Erledigter Schritt",
                      ) +
                      ": " +
                      step.title
                    }
                    onChange={(event) => {
                      const next = event.currentTarget.checked;
                      setChecked((previous) => {
                        const ids = Array.isArray(previous)
                          ? previous.filter((id) =>
                              steps.some((item) => item.id === id),
                            )
                          : [];
                        return next
                          ? [...new Set([...ids, step.id])]
                          : ids.filter((id) => id !== step.id);
                      });
                    }}
                  />
                  <Button
                    variant={isDone ? "light" : "subtle"}
                    color={isDone ? "teal" : "gray"}
                    fullWidth
                    size="xs"
                    styles={{
                      root: {
                        height: "auto",
                        minHeight: 40,
                        paddingBlock: 8,
                        minWidth: 0,
                        flex: 1,
                      },
                      inner: { justifyContent: "flex-start" },
                      label: { whiteSpace: "normal", textAlign: "left" },
                    }}
                    leftSection={
                      isDone ? (
                        <CheckCircleIcon
                          size={18}
                          weight="fill"
                          aria-hidden="true"
                        />
                      ) : (
                        <Text size="xs" fw={600} aria-hidden="true">
                          {index + 1}.
                        </Text>
                      )
                    }
                    disabled={step.id === "review" && reviewDisabled}
                    onClick={() =>
                      step.id === "review" ? onReview() : onSelect(step.id)
                    }
                  >
                    <Stack gap={1}>
                      <Text size="sm" fw={500}>
                        {step.title}
                      </Text>
                      <Text size="xs" c={isDone ? "teal" : "dimmed"}>
                        {isDone
                          ? label("Wykonane", "Completed", "Erledigt")
                          : label("Do sprawdzenia", "To review", "Zu prüfen")}
                      </Text>
                    </Stack>
                  </Button>
                </Group>
              );
            })}
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
