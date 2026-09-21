"use client";
import {
  Accordion,
  ActionIcon,
  Button,
  Checkbox,
  ColorInput,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { SiteConfig } from "@wedding/domain";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";

const labels: Record<string, string> = {
  firstName: "Pierwsze imię",
  secondName: "Drugie imię",
  eyebrow: "Tekst nad nagłówkiem",
  title: "Tytuł",
  description: "Opis",
  dateLabel: "Data do wyświetlenia",
  layout: "Układ hero",
  mediaId: "Zdjęcie główne",
  mobileMediaId: "Zdjęcie mobilne",
  name: "Nazwa",
  address: "Adres",
  mapUrl: "Adres osadzania mapy Google",
  navigationUrl: "Link nawigacji (opcjonalny)",
  time: "Godzina",
  date: "Data wydarzenia",
  venueId: "Miejsce",
  url: "Link wydarzenia",
  slug: "Adres wariantu",
  label: "Etykieta",
  eventIds: "Wydarzenia",
  sectionIds: "Sekcje",
  mediaIds: "Zdjęcia",
  phone: "Numer telefonu",
  body: "Treść",
  enabled: "Widoczna sekcja",
  type: "Rodzaj sekcji",
  indexing: "Zezwalaj na indeksowanie",
  navigate: "Przycisk nawigacji",
  showMap: "Przycisk mapy",
  eventLink: "Link do wydarzenia",
  call: "Przycisk telefonu",
  sms: "Przycisk SMS",
  copyPhone: "Kopiowanie numeru",
  copied: "Potwierdzenie kopiowania",
  footer: "Stopka",
  variantLabel: "Wybór wariantu",
  id: "Identyfikator",
  alt: "Opis zdjęcia",
  focalX: "Kadr desktop — poziomo (%)",
  focalY: "Kadr desktop — pionowo (%)",
  mobileFocalX: "Kadr mobile — poziomo (%)",
  mobileFocalY: "Kadr mobile — pionowo (%)",
  paper: "Tło strony",
  surface: "Tło kart",
  ink: "Kolor tekstu",
  accent: "Kolor akcentu",
};
const translatedLabels: Record<
  Exclude<PanelLanguage, "pl">,
  Record<string, string>
> = {
  en: {
    firstName: "First name",
    secondName: "Second name",
    eyebrow: "Text above heading",
    title: "Title",
    description: "Description",
    dateLabel: "Display date",
    layout: "Hero layout",
    mediaId: "Hero image",
    mobileMediaId: "Mobile image",
    name: "Name",
    address: "Address",
    mapUrl: "Google Maps embed address",
    navigationUrl: "Navigation link (optional)",
    time: "Time",
    date: "Event date",
    venueId: "Venue",
    url: "Event link",
    slug: "Option address",
    label: "Label",
    eventIds: "Events",
    sectionIds: "Sections",
    mediaIds: "Photos",
    phone: "Phone number",
    body: "Content",
    enabled: "Visible section",
    type: "Section type",
    indexing: "Allow indexing",
    navigate: "Navigation button",
    showMap: "Map button",
    eventLink: "Event link",
    call: "Phone button",
    sms: "SMS button",
    copyPhone: "Copy number",
    copied: "Copy confirmation",
    footer: "Footer",
    variantLabel: "Option selector",
    id: "Identifier",
    alt: "Image description",
    focalX: "Desktop crop — horizontal (%)",
    focalY: "Desktop crop — vertical (%)",
    mobileFocalX: "Mobile crop — horizontal (%)",
    mobileFocalY: "Mobile crop — vertical (%)",
    paper: "Page background",
    surface: "Card background",
    ink: "Text colour",
    accent: "Accent colour",
  },
  de: {
    firstName: "Vorname",
    secondName: "Zweiter Name",
    eyebrow: "Text über der Überschrift",
    title: "Titel",
    description: "Beschreibung",
    dateLabel: "Anzeigedatum",
    layout: "Layout des Startbereichs",
    mediaId: "Hauptbild",
    mobileMediaId: "Mobiles Bild",
    name: "Name",
    address: "Adresse",
    mapUrl: "Google-Maps-Einbettungsadresse",
    navigationUrl: "Navigationslink (optional)",
    time: "Uhrzeit",
    date: "Veranstaltungsdatum",
    venueId: "Ort",
    url: "Veranstaltungslink",
    slug: "Variantenadresse",
    label: "Beschriftung",
    eventIds: "Ereignisse",
    sectionIds: "Abschnitte",
    mediaIds: "Fotos",
    phone: "Telefonnummer",
    body: "Inhalt",
    enabled: "Sichtbarer Abschnitt",
    type: "Abschnittstyp",
    indexing: "Indexierung erlauben",
    navigate: "Navigationsschaltfläche",
    showMap: "Kartenschaltfläche",
    eventLink: "Veranstaltungslink",
    call: "Anrufschaltfläche",
    sms: "SMS-Schaltfläche",
    copyPhone: "Nummer kopieren",
    copied: "Kopierbestätigung",
    footer: "Fußzeile",
    variantLabel: "Variantenauswahl",
    id: "Kennung",
    alt: "Bildbeschreibung",
    focalX: "Desktop-Ausschnitt — horizontal (%)",
    focalY: "Desktop-Ausschnitt — vertikal (%)",
    mobileFocalX: "Mobiler Ausschnitt — horizontal (%)",
    mobileFocalY: "Mobiler Ausschnitt — vertikal (%)",
    paper: "Seitenhintergrund",
    surface: "Kartenhintergrund",
    ink: "Textfarbe",
    accent: "Akzentfarbe",
  },
};
export function Fields({
  value,
  onChange,
  config,
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  config: SiteConfig;
}) {
  const { language } = usePanelI18n();
  function update(key: string, next: unknown) {
    onChange({ ...value, [key]: next });
  }
  return (
    <Stack gap="sm">
      {Object.entries(value)
        .filter(
          ([key]) => !["src", "width", "height", "variants"].includes(key),
        )
        .map(([key, field]) => {
          const label =
            (language === "pl" ? labels : translatedLabels[language])[key] ||
            labels[key] ||
            key;
          if (typeof field === "boolean")
            return (
              <Checkbox
                key={key}
                label={label}
                checked={field}
                onChange={(e) => update(key, e.currentTarget.checked)}
              />
            );
          if (typeof field === "number")
            return (
              <NumberInput
                key={key}
                label={label}
                value={field}
                min={0}
                max={100}
                onChange={(v) => update(key, Number(v))}
              />
            );
          const choices =
            key === "layout"
              ? ["overlay", "split"]
              : key === "type"
                ? ["timeline", "venue", "contact", "text", "gallery"]
                : null;
          if (choices)
            return (
              <Select
                key={key}
                label={label}
                data={choices}
                value={String(field)}
                allowDeselect={false}
                onChange={(v) => update(key, v)}
              />
            );
          if (key === "venueId" || key === "mediaId" || key === "mobileMediaId")
            return (
              <Select
                key={key}
                label={label}
                clearable
                data={(key === "venueId" ? config.venues : config.media).map(
                  (i) => ({
                    value: i.id,
                    label: "name" in i ? i.name : i.alt || i.id,
                  }),
                )}
                value={typeof field === "string" ? field : null}
                onChange={(v) => {
                  const next = { ...value };
                  if (v) next[key] = v;
                  else delete next[key];
                  onChange(next);
                }}
              />
            );
          if (
            Array.isArray(field) &&
            field.every((x) => typeof x === "string")
          ) {
            const available =
              key === "eventIds"
                ? config.events
                : key === "sectionIds"
                  ? config.sections
                  : config.media;
            return (
              <Stack key={key} gap={4}>
                <Text size="sm" fw={500}>
                  {label} —{" "}
                  {language === "pl"
                    ? "kolejność na stronie"
                    : language === "en"
                      ? "order on the page"
                      : "Reihenfolge auf der Seite"}
                </Text>
                {(field as string[]).map((id, index) => (
                  <Group key={`${id}-${index}`}>
                    <Text size="sm">
                      {available.find((a) => a.id === id)?.id || id}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      aria-label={`${language === "pl" ? "Przesuń" : language === "en" ? "Move" : "Verschiebe"} ${id} ${language === "pl" ? "wyżej" : language === "en" ? "up" : "nach oben"}`}
                      disabled={index === 0}
                      onClick={() => {
                        const next = [...field];
                        [next[index - 1], next[index]] = [
                          next[index],
                          next[index - 1],
                        ];
                        update(key, next);
                      }}
                    >
                      ↑
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      aria-label={`${language === "pl" ? "Usuń odwołanie" : language === "en" ? "Remove reference" : "Verweis entfernen"} ${id}`}
                      onClick={() =>
                        update(
                          key,
                          field.filter((_, i) => i !== index),
                        )
                      }
                    >
                      ×
                    </ActionIcon>
                  </Group>
                ))}
                <Select
                  aria-label={`${language === "pl" ? "Dodaj" : language === "en" ? "Add" : "Hinzufügen"}: ${label}`}
                  placeholder={
                    language === "pl"
                      ? "Dodaj element"
                      : language === "en"
                        ? "Add item"
                        : "Element hinzufügen"
                  }
                  value={null}
                  data={available
                    .filter((a) => !field.includes(a.id))
                    .map((a) => ({
                      value: a.id,
                      label: "title" in a ? a.title : a.id,
                    }))}
                  onChange={(v) => {
                    if (v) update(key, [...field, v]);
                  }}
                />
              </Stack>
            );
          }
          if (typeof field !== "string") return null;
          if (["paper", "surface", "ink", "accent"].includes(key))
            return (
              <ColorInput
                key={key}
                label={label}
                value={field}
                format="hex"
                onChange={(value) => update(key, value)}
              />
            );
          return ["description", "body", "footer"].includes(key) ? (
            <Textarea
              key={key}
              label={label}
              autosize
              minRows={2}
              value={field}
              onChange={(e) => update(key, e.currentTarget.value)}
            />
          ) : (
            <TextInput
              key={key}
              label={label}
              value={field}
              onChange={(e) => update(key, e.currentTarget.value)}
              type={key === "date" ? "date" : key === "time" ? "time" : "text"}
            />
          );
        })}
    </Stack>
  );
}
type Collection = "venues" | "events" | "sections" | "variants" | "contacts";
export function CollectionFields({
  name,
  config,
  onChange,
}: {
  name: Collection;
  config: SiteConfig;
  onChange: (value: SiteConfig) => void;
}) {
  const { language } = usePanelI18n();
  const values = config[name];
  function replace(index: number, next: Record<string, unknown>) {
    onChange({
      ...config,
      [name]: values.map((v, i) => (i === index ? next : v)),
    } as SiteConfig);
  }
  function add() {
    const id = `item-${crypto.randomUUID().slice(0, 8)}`;
    const next = {
      venues: {
        id,
        name: "Nowe miejsce",
        address: "",
        description: "",
        mapUrl: "",
        navigationUrl: "",
      },
      events: {
        id,
        title: "Nowe wydarzenie",
        time: "15:00",
        date: "2027-06-12",
        dateLabel: "",
        url: "",
        venueId: config.venues[0]?.id,
      },
      sections: {
        id,
        type: "text",
        title: "Nowa sekcja",
        body: "",
        enabled: true,
        mediaIds: [],
        venueId: config.venues[0]?.id,
      },
      variants: {
        id,
        slug: id,
        label: "Nowy wariant",
        dateLabel: "",
        eventIds: [],
        sectionIds: [],
      },
      contacts: { id, name: "Kontakt", phone: "+48000000000" },
    }[name];
    onChange({ ...config, [name]: [...values, next] } as SiteConfig);
  }
  return (
    <Stack>
      <Accordion variant="separated">
        {values.map((item, index) => (
          <Accordion.Item key={`${name}-${index}`} value={String(index)}>
            <Accordion.Control>
              {"name" in item
                ? item.name
                : "title" in item
                  ? item.title
                  : item.label}
            </Accordion.Control>
            <Accordion.Panel>
              <Fields
                value={item as unknown as Record<string, unknown>}
                config={config}
                onChange={(next) => replace(index, next)}
              />
              <Button
                mt="md"
                color="red"
                variant="subtle"
                onClick={() =>
                  onChange({
                    ...config,
                    [name]: values.filter((_, i) => i !== index),
                  } as SiteConfig)
                }
              >
                {language === "pl"
                  ? "Usuń element"
                  : language === "en"
                    ? "Remove item"
                    : "Element entfernen"}
              </Button>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <Button variant="light" onClick={add}>
        {language === "pl"
          ? "Dodaj element"
          : language === "en"
            ? "Add item"
            : "Element hinzufügen"}
      </Button>
      <Text size="xs" c="dimmed">
        {language === "pl"
          ? "Po usunięciu elementu usuń też jego odwołania w wariantach i sekcjach. Walidacja wskaże pozostałe powiązania."
          : language === "en"
            ? "After removing an item, also remove its references in options and sections. Validation will show remaining links."
            : "Entfernen Sie nach dem Löschen eines Elements auch seine Verweise in Varianten und Abschnitten. Die Validierung zeigt verbleibende Verknüpfungen."}
      </Text>
    </Stack>
  );
}
