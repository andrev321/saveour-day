"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { SiteConfig } from "@invitations/domain";
import { newId } from "@invitations/domain/editor";
import { usePanelI18n } from "../lib/i18n";
export function VariantManager({
  config,
  onChange,
  active,
  onSelect,
}: {
  config: SiteConfig;
  onChange: Dispatch<SetStateAction<SiteConfig>>;
  active: string;
  onSelect: (id: string) => void;
}) {
  const { language } = usePanelI18n();
  const t = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
  const [opened, setOpened] = useState(false),
    [removing, setRemoving] = useState(false);
  const v = config.variants.find((v) => v.id === active) || config.variants[0];
  const update = (patch: Partial<typeof v>) =>
    onChange((c) => ({
      ...c,
      variants: c.variants.map((x) => (x.id === v.id ? { ...x, ...patch } : x)),
    }));
  return (
    <>
      <Group wrap="nowrap" gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Select
          style={{ flex: 1, minWidth: 0 }}
          aria-label={t(
            "Wariant zaproszenia",
            "Invitation variant",
            "Einladungsvariante",
          )}
          allowDeselect={false}
          value={v.id}
          data={config.variants.map((v) => ({ value: v.id, label: v.label }))}
          onChange={(id) => {
            if (id) onSelect(id);
          }}
        />
        <Button
          size="xs"
          style={{ flexShrink: 0 }}
          variant="subtle"
          onClick={() => {
            setOpened(true);
            setRemoving(false);
          }}
        >
          {t("Warianty", "Variants", "Varianten")}
        </Button>
      </Group>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t(
          "Warianty zaproszenia",
          "Invitation variants",
          "Einladungsvarianten",
        )}
      >
        <Stack>
          <Select
            label={t(
              "Edytowany wariant",
              "Variant to edit",
              "Bearbeitete Variante",
            )}
            allowDeselect={false}
            value={v.id}
            data={config.variants.map((v) => ({ value: v.id, label: v.label }))}
            onChange={(id) => {
              if (id) {
                onSelect(id);
                setRemoving(false);
              }
            }}
          />
          <TextInput
            label={t("Nazwa wariantu", "Variant name", "Variantenname")}
            value={v.label}
            onChange={(e) => update({ label: e.currentTarget.value })}
          />
          <TextInput
            label={t("Adres wariantu", "Variant URL slug", "Variantenadresse")}
            value={v.slug}
            onChange={(e) => update({ slug: e.currentTarget.value })}
          />
          <TextInput
            label={t(
              "Data do wyświetlenia w tym wariancie (opcjonalna)",
              "Display date for this variant (optional)",
              "Anzeigedatum dieser Variante (optional)",
            )}
            value={v.dateLabel}
            onChange={(e) => update({ dateLabel: e.currentTarget.value })}
          />
          <Checkbox
            label={t("Wariant domyślny", "Default variant", "Standardvariante")}
            checked={config.defaultVariant === v.id}
            onChange={() => onChange((c) => ({ ...c, defaultVariant: v.id }))}
          />
          <Text fw={600}>
            {t(
              "Wydarzenia dostępne dla gości tego wariantu",
              "Events available to guests of this variant",
              "Verfügbare Veranstaltungen für Gäste dieser Variante",
            )}
          </Text>
          <Text c="dimmed" size="sm">
            {t(
              "To określa zaproszenie i RSVP. Kolejność programu i widoczność sekcji ustawisz w Treści.",
              "This controls invitations and RSVP. Set programme order and section visibility in Content.",
              "Dies steuert Einladung und RSVP. Programmreihenfolge und Sichtbarkeit werden unter Inhalt eingestellt.",
            )}
          </Text>
          {config.events.map((e) => (
            <Checkbox
              key={e.id}
              label={e.title}
              checked={v.eventIds.includes(e.id)}
              onChange={(ev) => {
                const checked = ev.currentTarget.checked;
                update({
                  eventIds: checked
                    ? [...v.eventIds, e.id]
                    : v.eventIds.filter((id) => id !== e.id),
                });
              }}
            />
          ))}
          <Button
            variant="light"
            disabled={config.variants.length >= 10}
            onClick={() => {
              const id = newId("variant");
              onChange((c) => ({
                ...c,
                variants: [
                  ...c.variants,
                  {
                    ...structuredClone(v),
                    id,
                    slug: id,
                    label: t("Nowy wariant", "New variant", "Neue Variante"),
                  },
                ],
              }));
              onSelect(id);
              setRemoving(false);
            }}
          >
            {t(
              "Dodaj wariant na podstawie tego",
              "Add variant based on this one",
              "Variante darauf basierend hinzufügen",
            )}
          </Button>
          <Text size="sm" c="dimmed">
            {t(
              "Nowy wariant ma własną kolejność i widoczność, ale współdzieli treść sekcji.",
              "The new variant has independent order and visibility but shares section contents.",
              "Die neue Variante hat eigene Reihenfolge und Sichtbarkeit, teilt aber Abschnittsinhalte.",
            )}
          </Text>
          {removing ? (
            <Alert color="red">
              <Stack>
                <Text size="sm">
                  {t(
                    "Najpierw przypisz zaproszenia i publiczny adres do innego wariantu w obszarze Goście. Publikacja z błędnym przypisaniem będzie zablokowana.",
                    "First reassign invitations and the public page to another variant in Guests. Invalid assignments block publication.",
                    "Ordne zuerst Einladungen und öffentliche Seite unter Gäste einer anderen Variante zu.",
                  )}
                </Text>
                <Group>
                  <Button variant="default" onClick={() => setRemoving(false)}>
                    {t("Anuluj", "Cancel", "Abbrechen")}
                  </Button>
                  <Button
                    color="red"
                    onClick={() => {
                      const next = config.variants.find((x) => x.id !== v.id)!;
                      onChange((c) => ({
                        ...c,
                        variants: c.variants.filter((x) => x.id !== v.id),
                        defaultVariant:
                          c.defaultVariant === v.id
                            ? next.id
                            : c.defaultVariant,
                      }));
                      onSelect(next.id);
                      setRemoving(false);
                    }}
                  >
                    {t("Usuń wariant", "Delete variant", "Variante löschen")}
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : (
            <Group
              justify="space-between"
              pt="sm"
              style={{
                position: "sticky",
                bottom: 0,
                background: "var(--panel-surface)",
                borderTop: "1px solid var(--panel-border)",
                zIndex: 2,
              }}
            >
              <Button
                variant="subtle"
                color="red"
                disabled={config.variants.length === 1}
                onClick={() => setRemoving(true)}
              >
                {t("Usuń wariant", "Delete variant", "Variante löschen")}
              </Button>
              <Button variant="default" onClick={() => setOpened(false)}>
                {t("Gotowe", "Done", "Fertig")}
              </Button>
            </Group>
          )}
        </Stack>
      </Modal>
    </>
  );
}
