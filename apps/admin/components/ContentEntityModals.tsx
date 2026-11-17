"use client";
import { useState, type ReactNode } from "react";
import {
  Button,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import type { SiteConfig } from "@invitations/domain";
import { newId } from "@invitations/domain/editor";
import { usePanelI18n } from "../lib/i18n";
import { PhotoReference, photoName } from "./PhotoReference";

export type VenueInput = Omit<SiteConfig["venues"][number], "id">;
export type EventInput = Omit<SiteConfig["events"][number], "id">;
export type ContactInput = Omit<SiteConfig["contacts"][number], "id">;

function useText() {
  const { language } = usePanelI18n();
  return (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
}

function CreateEntityModal({
  opened,
  title,
  submitLabel,
  canSubmit,
  onClose,
  onSubmit,
  children,
}: {
  opened: boolean;
  title: string;
  submitLabel: string;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const t = useText();
  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) onSubmit();
        }}
      >
        <Stack>
          {children}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("Anuluj", "Cancel", "Abbrechen")}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function VenueFormFields({
  value,
  onPatch,
  autoFocus = false,
}: {
  value: VenueInput;
  onPatch: (patch: Partial<VenueInput>) => void;
  autoFocus?: boolean;
}) {
  const t = useText();
  return (
    <Stack>
      <TextInput
        label={t("Nazwa miejsca", "Venue name", "Name des Ortes")}
        value={value.name}
        required={autoFocus}
        data-autofocus={autoFocus || undefined}
        onChange={(e) => onPatch({ name: e.currentTarget.value })}
      />
      <TextInput
        label={t("Adres", "Address", "Adresse")}
        value={value.address}
        onChange={(e) => onPatch({ address: e.currentTarget.value })}
      />
      <Textarea
        label={t("Opis miejsca", "Venue description", "Ortsbeschreibung")}
        value={value.description}
        onChange={(e) => onPatch({ description: e.currentTarget.value })}
      />
      <TextInput
        label={t(
          "Link nawigacji (opcjonalny)",
          "Navigation link (optional)",
          "Navigationslink (optional)",
        )}
        value={value.navigationUrl}
        onChange={(e) => onPatch({ navigationUrl: e.currentTarget.value })}
      />
      <TextInput
        label={t(
          "Mapa Google — adres osadzania (opcjonalny)",
          "Google Maps embed URL (optional)",
          "Google Maps Einbettung (optional)",
        )}
        value={value.mapUrl}
        onChange={(e) => onPatch({ mapUrl: e.currentTarget.value })}
      />
    </Stack>
  );
}

export function VenueCreateModal({
  opened,
  onClose,
  onCreate,
}: {
  opened: boolean;
  onClose: () => void;
  onCreate: (venue: SiteConfig["venues"][number]) => void;
}) {
  const t = useText();
  const empty = (): VenueInput => ({
    name: "",
    address: "",
    description: "",
    mapUrl: "",
    navigationUrl: "",
  });
  const [form, setForm] = useState<VenueInput>(empty);

  const handleClose = () => {
    setForm(empty());
    onClose();
  };

  return (
    <CreateEntityModal
      opened={opened}
      title={t("Nowe miejsce", "New venue", "Neuer Ort")}
      submitLabel={t("Dodaj miejsce", "Add venue", "Ort hinzufügen")}
      canSubmit={Boolean(form.name.trim())}
      onClose={handleClose}
      onSubmit={() => {
        onCreate({ id: newId("venue"), ...form, name: form.name.trim() });
        setForm(empty());
        onClose();
      }}
    >
      <VenueFormFields
        value={form}
        onPatch={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        autoFocus
      />
    </CreateEntityModal>
  );
}

export function ContactFormFields({
  value,
  onPatch,
  autoFocus = false,
}: {
  value: ContactInput;
  onPatch: (patch: Partial<ContactInput>) => void;
  autoFocus?: boolean;
}) {
  const t = useText();
  return (
    <Stack>
      <TextInput
        label={t("Imię / nazwa", "Name", "Name")}
        value={value.name}
        required={autoFocus}
        data-autofocus={autoFocus || undefined}
        onChange={(e) => onPatch({ name: e.currentTarget.value })}
      />
      <TextInput
        type="tel"
        label={t("Telefon", "Phone", "Telefon")}
        value={value.phone}
        onChange={(e) => onPatch({ phone: e.currentTarget.value })}
      />
    </Stack>
  );
}

export function ContactCreateModal({
  opened,
  onClose,
  onCreate,
}: {
  opened: boolean;
  onClose: () => void;
  onCreate: (contact: SiteConfig["contacts"][number]) => void;
}) {
  const t = useText();
  const empty = (): ContactInput => ({ name: "", phone: "" });
  const [form, setForm] = useState<ContactInput>(empty);

  const handleClose = () => {
    setForm(empty());
    onClose();
  };

  return (
    <CreateEntityModal
      opened={opened}
      title={t("Nowy kontakt", "New contact", "Neuer Kontakt")}
      submitLabel={t("Dodaj kontakt", "Add contact", "Kontakt hinzufügen")}
      canSubmit={Boolean(form.name.trim())}
      onClose={handleClose}
      onSubmit={() => {
        onCreate({ id: newId("contact"), ...form, name: form.name.trim() });
        setForm(empty());
        onClose();
      }}
    >
      <ContactFormFields
        value={form}
        onPatch={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        autoFocus
      />
    </CreateEntityModal>
  );
}

export function EventFormFields({
  value,
  onPatch,
  venueField,
  autoFocus = false,
}: {
  value: EventInput;
  onPatch: (patch: Partial<EventInput>) => void;
  venueField: ReactNode;
  autoFocus?: boolean;
}) {
  const t = useText();
  return (
    <Stack>
      <TextInput
        label={t("Nazwa wydarzenia", "Event name", "Name der Veranstaltung")}
        value={value.title}
        required={autoFocus}
        data-autofocus={autoFocus || undefined}
        onChange={(e) => onPatch({ title: e.currentTarget.value })}
      />
      <Group grow>
        <TextInput
          type="date"
          label={t("Data", "Date", "Datum")}
          value={value.date || ""}
          onChange={(e) =>
            onPatch({ date: e.currentTarget.value || undefined })
          }
        />
        <TextInput
          type="time"
          label={t("Godzina", "Time", "Uhrzeit")}
          value={value.time}
          onChange={(e) => onPatch({ time: e.currentTarget.value })}
        />
      </Group>
      <TextInput
        label={t(
          "Opis daty (opcjonalny)",
          "Date label (optional)",
          "Datumsbeschreibung (optional)",
        )}
        value={value.dateLabel}
        onChange={(e) => onPatch({ dateLabel: e.currentTarget.value })}
      />
      {venueField}
      <TextInput
        label={t(
          "Link wydarzenia (opcjonalny)",
          "Event link (optional)",
          "Veranstaltungslink (optional)",
        )}
        value={value.url}
        onChange={(e) => onPatch({ url: e.currentTarget.value })}
      />
    </Stack>
  );
}

export function EventCreateModal({
  opened,
  onClose,
  venues,
  onCreate,
}: {
  opened: boolean;
  onClose: () => void;
  venues: SiteConfig["venues"];
  onCreate: (
    event: SiteConfig["events"][number],
    includeInVariant: boolean,
  ) => void;
}) {
  const t = useText();
  const empty = (): EventInput => ({
    title: "",
    time: "15:00",
    url: "",
    dateLabel: "",
  });
  const [form, setForm] = useState<EventInput>(empty);
  const [includeInVariant, setIncludeInVariant] = useState(true);

  const handleClose = () => {
    setForm(empty());
    setIncludeInVariant(true);
    onClose();
  };

  return (
    <CreateEntityModal
      opened={opened}
      title={t("Nowe wydarzenie", "New event", "Neue Veranstaltung")}
      submitLabel={t(
        "Dodaj wydarzenie",
        "Add event",
        "Veranstaltung hinzufügen",
      )}
      canSubmit={Boolean(form.title.trim())}
      onClose={handleClose}
      onSubmit={() => {
        onCreate(
          { id: newId("event"), ...form, title: form.title.trim() },
          includeInVariant,
        );
        setForm(empty());
        setIncludeInVariant(true);
        onClose();
      }}
    >
      <EventFormFields
        value={form}
        onPatch={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        autoFocus
        venueField={
          <Select
            label={t(
              "Miejsce (opcjonalne)",
              "Venue (optional)",
              "Ort (optional)",
            )}
            searchable
            clearable
            value={form.venueId || null}
            data={venues.map((v) => ({ value: v.id, label: v.name }))}
            onChange={(venueId) =>
              setForm((prev) => ({
                ...prev,
                venueId: venueId || undefined,
              }))
            }
          />
        }
      />
      <Checkbox
        label={t(
          "Goście tego wariantu są zaproszeni na to wydarzenie",
          "Guests of this variant are invited to this event",
          "Gäste dieser Variante sind zu dieser Veranstaltung eingeladen",
        )}
        checked={includeInVariant}
        onChange={(e) => setIncludeInVariant(e.currentTarget.checked)}
      />
    </CreateEntityModal>
  );
}

export function GalleryPhotoModal({
  opened,
  onClose,
  media,
  excludedIds,
  onSelectPhoto,
}: {
  opened: boolean;
  onClose: () => void;
  media: SiteConfig["media"];
  excludedIds: string[];
  onSelectPhoto: (id: string) => void;
}) {
  const t = useText();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const available = media.filter((p) => !excludedIds.includes(p.id));

  const handleClose = () => {
    setChosenId(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t(
        "Dodaj zdjęcie do galerii",
        "Add photo to gallery",
        "Foto zur Galerie hinzufügen",
      )}
    >
      <Stack>
        {available.length === 0 ? (
          <Text size="sm" c="dimmed">
            {t(
              "Wszystkie zdjęcia z biblioteki są już w tej galerii lub biblioteka jest pusta.",
              "All library photos are already in this gallery or the library is empty.",
              "Alle Fotos aus der Bibliothek sind bereits in dieser Galerie oder die Bibliothek ist leer.",
            )}
          </Text>
        ) : (
          <Select
            label={t("Wybierz zdjęcie", "Choose photo", "Foto auswählen")}
            searchable
            data-autofocus
            value={chosenId}
            data={available.map((p) => ({ value: p.id, label: photoName(p) }))}
            renderOption={({ option }) => (
              <PhotoReference
                photo={available.find((p) => p.id === option.value)!}
              />
            )}
            onChange={setChosenId}
          />
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose}>
            {t("Anuluj", "Cancel", "Abbrechen")}
          </Button>
          <Button
            disabled={!chosenId}
            onClick={() => {
              if (!chosenId) return;
              onSelectPhoto(chosenId);
              setChosenId(null);
              onClose();
            }}
          >
            {t("Dodaj zdjęcie", "Add photo", "Foto hinzufügen")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
