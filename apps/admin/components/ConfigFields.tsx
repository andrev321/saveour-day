"use client";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SiteConfig } from "@invitations/domain";
import {
  Accordion,
  ActionIcon,
  Alert,
  Button,
  Checkbox,
  ColorInput,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  CalendarDotsIcon as IconCalendarTime,
  CaretDownIcon as IconChevronDown,
  CaretUpIcon as IconChevronUp,
  EyeIcon as IconEye,
  EyeSlashIcon as IconEyeOff,
  DotsSixVerticalIcon as IconGripVertical,
  InfoIcon as IconInfoCircle,
  StackIcon as IconLayoutList,
  MapPinIcon as IconMapPin,
  ChatCircleIcon as IconMessageCircle,
  ImageIcon as IconPhoto,
  PlusIcon as IconPlus,
  TrashIcon as IconTrash,
} from "@phosphor-icons/react";
import { useState } from "react";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";
import * as S from "./fields.styles";

const labels: Record<string, string> = {
  displayName: "Główny napis",
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
  slug: "Adres URL strony",
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
    displayName: "Main heading",
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
    slug: "Page URL address",
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
    displayName: "Hauptüberschrift",
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
    slug: "URL-Adresse der Seite",
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

const sectionTypes = {
  pl: [
    { value: "timeline", label: "Harmonogram dnia", icon: IconCalendarTime },
    { value: "venue", label: "Miejsce", icon: IconMapPin },
    { value: "contact", label: "Kontakt", icon: IconMessageCircle },
    { value: "text", label: "Tekst", icon: IconLayoutList },
    { value: "gallery", label: "Galeria", icon: IconPhoto },
  ],
  en: [
    { value: "timeline", label: "Schedule", icon: IconCalendarTime },
    { value: "venue", label: "Venue", icon: IconMapPin },
    { value: "contact", label: "Contact", icon: IconMessageCircle },
    { value: "text", label: "Text", icon: IconLayoutList },
    { value: "gallery", label: "Gallery", icon: IconPhoto },
  ],
  de: [
    { value: "timeline", label: "Tagesablauf", icon: IconCalendarTime },
    { value: "venue", label: "Ort", icon: IconMapPin },
    { value: "contact", label: "Kontakt", icon: IconMessageCircle },
    { value: "text", label: "Text", icon: IconLayoutList },
    { value: "gallery", label: "Galerie", icon: IconPhoto },
  ],
} as const;

type Reference = {
  id: string;
  title?: string;
  name?: string;
  alt?: string;
};

function referenceName(id: string, available: Reference[]) {
  const reference = available.find((item) => item.id === id);
  return reference?.title || reference?.name || reference?.alt || id;
}

function hasCustomOrder(ids: string[], available: Reference[]) {
  return (
    ids.join("|") !==
    available
      .filter((item) => ids.includes(item.id))
      .map((item) => item.id)
      .join("|")
  );
}

function SortableReference({
  id,
  name,
  language,
  visible,
  onVisibilityChange,
}: {
  id: string;
  name: string;
  language: PanelLanguage;
  visible: boolean;
  onVisibilityChange: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const drag =
    language === "pl" ? "Przeciągnij" : language === "en" ? "Drag" : "Ziehen";
  const visibility = visible
    ? language === "pl"
      ? "Ukryj"
      : language === "en"
        ? "Hide"
        : "Ausblenden"
    : language === "pl"
      ? "Pokaż"
      : language === "en"
        ? "Show"
        : "Anzeigen";
  return (
    <S.ReferenceRow
      ref={setNodeRef}
      data-visible={visible}
      wrap="nowrap"
      style={{
        opacity: isDragging ? 0.25 : 1,
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <S.ReferenceDragHandle
        variant="subtle"
        color="gray"

        aria-label={`${drag} ${name}`}
        {...attributes}
        {...listeners}
      >
        <IconGripVertical size={18} />
      </S.ReferenceDragHandle>
      <S.ReferenceName size="sm">{name}</S.ReferenceName>
      <ActionIcon
        variant="subtle"
        color="gray"
        aria-label={`${visibility}: ${name}`}
        onClick={onVisibilityChange}
      >
        {visible ? <IconEye size={18} /> : <IconEyeOff size={18} />}
      </ActionIcon>
    </S.ReferenceRow>
  );
}

function OrderedReferences({
  ids,
  hiddenIds = [],
  label,
  available,
  language,
  editable = true,
  hint,
  onChange,
}: {
  ids: string[];
  hiddenIds?: string[];
  label: string;
  available: Reference[];
  language: PanelLanguage;
  editable?: boolean;
  hint?: string;
  onChange: (ids: string[], hiddenIds: string[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const order =
    language === "pl"
      ? "kolejność na stronie"
      : language === "en"
        ? "order on the page"
        : "Reihenfolge auf der Seite";
  const displayedIds = editable ? ids : available.map((item) => item.id);

  return (
    <Stack gap={4}>
      <Group gap={6}>
        <Text size="sm" fw={500}>
          {label} — {order}
        </Text>
        {hint ? (
          <Tooltip label={hint} multiline w={260}>
            <ThemeIcon variant="light" size="sm" radius="xl" aria-label={hint}>
              <IconInfoCircle size={15} />
            </ThemeIcon>
          </Tooltip>
        ) : null}
      </Group>
      {editable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(String(active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={({ active, over }) => {
            setActiveId(null);
            if (!over || active.id === over.id) return;
            const from = displayedIds.indexOf(String(active.id));
            const to = displayedIds.indexOf(String(over.id));
            if (from >= 0 && to >= 0)
              onChange(
                arrayMove(displayedIds, from, to).filter((id) =>
                  ids.includes(id),
                ),
                hiddenIds,
              );
          }}
        >
          <SortableContext
            items={displayedIds}
            strategy={verticalListSortingStrategy}
          >
            <Stack gap={4}>
              {displayedIds.map((id) => {
                const name = referenceName(id, available);
                return (
                  <SortableReference
                    key={id}
                    id={id}
                    name={name}
                    language={language}
                    visible={!hiddenIds.includes(id)}
                    onVisibilityChange={() =>
                      onChange(
                        ids,
                        hiddenIds.includes(id)
                          ? hiddenIds.filter((item) => item !== id)
                          : [...hiddenIds, id],
                      )
                    }
                  />
                );
              })}
            </Stack>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
            {activeId ? (
              <S.ReferenceDragGhost>
                <IconGripVertical size={18} />
                <Text size="sm">{referenceName(activeId, available)}</Text>
              </S.ReferenceDragGhost>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <Stack gap={4}>
          {available.map((item) => (
            <Text key={item.id} size="sm">
              {referenceName(item.id, available)}
            </Text>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export function Fields({
  value,
  onChange,
  config,
  referencesEditable = true,
  hiddenReferenceIds = {},
}: {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  config: SiteConfig;
  referencesEditable?: boolean;
  hiddenReferenceIds?: Partial<Record<"eventIds" | "sectionIds", string[]>>;
}) {
  const { language } = usePanelI18n();
  function update(key: string, next: unknown) {
    onChange({ ...value, [key]: next });
  }
  return (
    <Stack gap="sm">
      {Object.entries(value)
        .filter(
          ([key]) =>
            ![
              "id",
              "src",
              "width",
              "height",
              "variants",
              "hiddenEventIds",
              "hiddenSectionIds",
            ].includes(key),
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
          if (key === "type") {
            const types = sectionTypes[language];
            const selected = types.find((type) => type.value === field);
            const SelectedIcon = selected?.icon;
            return (
              <Select
                key={key}
                label={label}
                data={types}
                value={String(field)}
                allowDeselect={false}
                leftSection={
                  <S.SectionTypeIcon>
                    {SelectedIcon ? <SelectedIcon size={16} /> : null}
                  </S.SectionTypeIcon>
                }
                renderOption={({ option }) => {
                  const type = types.find(
                    (item) => item.value === option.value,
                  );
                  const Icon = type?.icon;
                  return (
                    <S.SectionTypeOption>
                      <S.SectionTypeIcon>
                        {Icon ? <Icon size={16} /> : null}
                      </S.SectionTypeIcon>
                      <span>{option.label}</span>
                    </S.SectionTypeOption>
                  );
                }}
                onChange={(v) => update(key, v)}
              />
            );
          }
          const choices = key === "layout" ? ["overlay", "split"] : null;
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
              <OrderedReferences
                key={key}
                ids={field as string[]}
                hiddenIds={hiddenReferenceIds[key as "eventIds" | "sectionIds"]}
                label={label}
                available={available}
                language={language}
                editable={referencesEditable}
                hint={
                  !referencesEditable && key === "sectionIds"
                    ? language === "pl"
                      ? "Kolejność sekcji na stronie głównej zmienisz w zakładce Sekcje."
                      : language === "en"
                        ? "Change the main page section order in the Sections tab."
                        : "Die Reihenfolge der Hauptseitenabschnitte ändern Sie im Tab Abschnitte."
                    : undefined
                }
                onChange={(ids, hiddenIds) =>
                  onChange({
                    ...value,
                    [key]: ids,
                    [key === "eventIds"
                      ? "hiddenEventIds"
                      : "hiddenSectionIds"]: hiddenIds,
                  })
                }
              />
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
  onPageSelect,
}: {
  name: Collection;
  config: SiteConfig;
  onChange: (value: SiteConfig) => void;
  onPageSelect?: (id: string) => void;
}) {
  const { language } = usePanelI18n();
  if (name === "sections")
    return <SectionCollection config={config} onChange={onChange} />;
  if (name === "variants")
    return (
      <PageCollection
        config={config}
        onChange={onChange}
        onPageSelect={onPageSelect}
      />
    );
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
              {"name" in item ? item.name : item.title}
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
                leftSection={<IconTrash size={16} />}
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
      <Button
        variant="light"
        onClick={add}
        leftSection={<IconPlus size={16} />}
      >
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

function PageCollection({
  config,
  onChange,
  onPageSelect,
}: {
  config: SiteConfig;
  onChange: (value: SiteConfig) => void;
  onPageSelect?: (id: string) => void;
}) {
  const { language, t } = usePanelI18n();
  const pages = config.variants;

  function replace(index: number, next: Record<string, unknown>) {
    onChange({
      ...config,
      variants: pages.map((page, current) =>
        current === index ? next : page,
      ) as SiteConfig["variants"],
    });
  }

  function remove(id: string) {
    if (pages.length === 1) return;
    const variants = pages.filter((page) => page.id !== id);
    onChange({
      ...config,
      variants,
      defaultVariant:
        config.defaultVariant === id ? variants[0]!.id : config.defaultVariant,
    });
  }

  return (
    <Stack>
      <Tooltip label={t("pagesHelp")} multiline w={280}>
        <ThemeIcon
          variant="light"
          radius="xl"
          size="sm"
          aria-label={t("pagesHelp")}
        >
          i
        </ThemeIcon>
      </Tooltip>
      <Accordion variant="separated">
        {pages.map((page, index) => (
          <Accordion.Item key={page.id} value={page.id}>
            <Accordion.Control onClick={() => onPageSelect?.(page.id)}>
              <Group gap="sm">
                <ThemeIcon variant="light" radius="xl" aria-hidden>
                  ⧉
                </ThemeIcon>
                <div>
                  <Group gap={6}>
                    <Text fw={600}>{page.label}</Text>
                    {page.id === config.defaultVariant ? (
                      <Tooltip
                        label={
                          language === "pl"
                            ? "Strona główna zawiera wszystkie elementy. Kolejność sekcji zmienisz w zakładce Sekcje."
                            : language === "en"
                              ? "The main page contains every element. Change section order in the Sections tab."
                              : "Die Hauptseite enthält alle Elemente. Die Reihenfolge ändern Sie im Tab Abschnitte."
                        }
                        multiline
                        w={280}
                      >
                        <ThemeIcon
                          variant="light"
                          size="sm"
                          radius="xl"
                          aria-label="Informacja o stronie głównej"
                        >
                          <IconInfoCircle size={15} />
                        </ThemeIcon>
                      </Tooltip>
                    ) : null}
                  </Group>
                </div>
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {page.id !== config.defaultVariant &&
              (hasCustomOrder(page.eventIds, config.events) ||
                hasCustomOrder(page.sectionIds, config.sections)) ? (
                <Alert color="blue" variant="light" mb="md">
                  {language === "pl"
                    ? "Ta strona ma własną kolejność elementów. Zmiana kolejności w głównym konfiguratorze może wpłynąć na jej układ."
                    : language === "en"
                      ? "This page has its own element order. Changing the order in the main editor can affect its layout."
                      : "Diese Seite hat eine eigene Reihenfolge. Änderungen im Haupteditor können ihr Layout beeinflussen."}
                </Alert>
              ) : null}
              <Fields
                value={
                  page.id === config.defaultVariant
                    ? { label: page.label }
                    : {
                        label: page.label,
                        eventIds: page.eventIds,
                        sectionIds: page.sectionIds,
                        hiddenEventIds: page.hiddenEventIds,
                        hiddenSectionIds: page.hiddenSectionIds,
                      }
                }
                config={config}
                referencesEditable={page.id !== config.defaultVariant}
                hiddenReferenceIds={{
                  eventIds: page.hiddenEventIds,
                  sectionIds: page.hiddenSectionIds,
                }}
                onChange={(next) => replace(index, { ...page, ...next })}
              />
              <Button
                mt="md"
                color="red"
                variant="subtle"
                leftSection={<IconTrash size={16} />}
                disabled={page.id === config.defaultVariant}
                onClick={() => remove(page.id)}
              >
                {language === "pl"
                  ? "Usuń stronę"
                  : language === "en"
                    ? "Remove page"
                    : "Unterseite entfernen"}
              </Button>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={() => {
          const id = `page-${crypto.randomUUID().slice(0, 8)}`;
          onChange({
            ...config,
            variants: [
              ...pages,
              {
                id,
                slug: id,
                label:
                  language === "pl"
                    ? "Nowa strona"
                    : language === "en"
                      ? "New page"
                      : "Neue Unterseite",
                dateLabel: "",
                eventIds: config.events.map((event) => event.id),
                sectionIds: config.sections.map((section) => section.id),
                hiddenEventIds: [],
                hiddenSectionIds: [],
              },
            ],
          });
          onPageSelect?.(id);
        }}
      >
        {language === "pl"
          ? "Dodaj stronę"
          : language === "en"
            ? "Add page"
            : "Unterseite hinzufügen"}
      </Button>
    </Stack>
  );
}

function SectionCollection({
  config,
  onChange,
}: {
  config: SiteConfig;
  onChange: (value: SiteConfig) => void;
}) {
  const { language } = usePanelI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const sections = config.sections;

  function reorder(activeId: string, overId: string) {
    if (activeId === overId) return;
    const from = sections.findIndex((section) => section.id === activeId);
    const to = sections.findIndex((section) => section.id === overId);
    if (from < 0 || to < 0) return;
    const nextSections = arrayMove(sections, from, to);
    const order = new Map(
      nextSections.map((section, index) => [section.id, index]),
    );
    onChange({
      ...config,
      sections: nextSections,
      variants: config.variants.map((variant) => ({
        ...variant,
        sectionIds: [...variant.sectionIds].sort(
          (first, second) => (order.get(first) ?? 0) - (order.get(second) ?? 0),
        ),
      })),
    });
  }

  function update(index: number, next: Record<string, unknown>) {
    onChange({
      ...config,
      sections: sections.map((section, current) =>
        current === index ? next : section,
      ) as SiteConfig["sections"],
    });
  }

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {language === "pl"
          ? "Przeciągnij sekcje, aby ustawić kolejność widoczną w wariantach zaproszenia."
          : language === "en"
            ? "Drag sections to set the order used by invitation options."
            : "Ziehen Sie die Abschnitte, um die Reihenfolge der Einladungsvarianten festzulegen."}
      </Text>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={({ active, over }) => {
          setActiveId(null);
          if (over) reorder(String(active.id), String(over.id));
        }}
      >
        <SortableContext
          items={sections.map((section) => section.id)}
          strategy={verticalListSortingStrategy}
        >
          <Accordion variant="separated">
            {sections.map((section, index) => (
              <SortableSection
                key={section.id}
                section={section}
                index={index}
                config={config}
                onUpdate={update}
                onReorder={reorder}
                onRemove={() =>
                  onChange({
                    ...config,
                    sections: sections.filter((item) => item.id !== section.id),
                    variants: config.variants.map((page) => ({
                      ...page,
                      sectionIds: page.sectionIds.filter(
                        (id) => id !== section.id,
                      ),
                    })),
                  })
                }
              />
            ))}
          </Accordion>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 160, easing: "ease" }}>
          {activeId ? (
            <SectionDragGhost
              section={sections.find((section) => section.id === activeId)!}
              language={language}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      <Button
        variant="light"
        onClick={() => {
          const id = `section-${crypto.randomUUID().slice(0, 8)}`;
          const newSection = {
            id,
            type: "text" as const,
            title:
              language === "pl"
                ? "Nowa sekcja"
                : language === "en"
                  ? "New section"
                  : "Neuer Abschnitt",
            body: "",
            enabled: true,
            mediaIds: [],
          };
          onChange({
            ...config,
            sections: [...sections, newSection],
            variants: config.variants.map((page) => ({
              ...page,
              sectionIds: [...page.sectionIds, id],
            })),
          });
        }}
      >
        {language === "pl"
          ? "Dodaj sekcję"
          : language === "en"
            ? "Add section"
            : "Abschnitt hinzufügen"}
      </Button>
    </Stack>
  );
}

function SortableSection({
  section,
  index,
  config,
  onUpdate,
  onReorder,
  onRemove,
}: {
  section: SiteConfig["sections"][number];
  index: number;
  config: SiteConfig;
  onUpdate: (index: number, next: Record<string, unknown>) => void;
  onReorder: (activeId: string, overId: string) => void;
  onRemove: () => void;
}) {
  const { language } = usePanelI18n();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  const type = sectionTypes[language].find(
    (option) => option.value === section.type,
  )!;
  const Icon = type.icon;
  return (
    <>
      <Accordion.Item
        ref={setNodeRef}
        value={section.id}
        data-testid={`section-${section.id}`}
        style={{
          opacity: isDragging ? 0.25 : 1,
          transform: CSS.Transform.toString(transform),
          transition,
        }}
      >
        <S.SectionControlRow>
          <Accordion.Control
            icon={
              <S.SectionCardIcon
                variant="light"
                radius="xl"
                size={36}
                aria-hidden
              >
                <Icon size={18} />
              </S.SectionCardIcon>
            }
          >
            <S.SectionCardSummary wrap="nowrap" mr="sm">
              <Stack gap={0}>
                <Text fw={600}>{section.title}</Text>
                <Text size="xs" c="dimmed">
                  {type.label}
                </Text>
              </Stack>
            </S.SectionCardSummary>
          </Accordion.Control>
          <S.SectionDragHandle
            c="dimmed"

            data-testid={`drag-handle-${section.id}`}
            aria-label="Przeciągnij sekcję"
            {...attributes}
            {...listeners}
            onClick={(event: React.MouseEvent<HTMLElement>) => event.stopPropagation()}
          >
            <IconGripVertical size={18} />
          </S.SectionDragHandle>
        </S.SectionControlRow>
        <Accordion.Panel>
          <Fields
            value={section as unknown as Record<string, unknown>}
            config={config}
            onChange={(next) => onUpdate(index, next)}
          />
          <Group mt="md" justify="space-between">
            <Group gap="xs">
              <ActionIcon
                variant="subtle"
                aria-label="Przesuń sekcję wyżej"
                disabled={index === 0}
                onClick={() =>
                  onReorder(section.id, config.sections[index - 1]!.id)
                }
              >
                <IconChevronUp size={18} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                aria-label="Przesuń sekcję niżej"
                disabled={index === config.sections.length - 1}
                onClick={() =>
                  onReorder(section.id, config.sections[index + 1]!.id)
                }
              >
                <IconChevronDown size={18} />
              </ActionIcon>
            </Group>
            <Button
              color="red"
              variant="subtle"
              leftSection={<IconTrash size={16} />}
              onClick={onRemove}
            >
              {language === "pl"
                ? "Usuń sekcję"
                : language === "en"
                  ? "Remove section"
                  : "Abschnitt entfernen"}
            </Button>
          </Group>
        </Accordion.Panel>
      </Accordion.Item>
    </>
  );
}

function SectionDragGhost({
  section,
  language,
}: {
  section: SiteConfig["sections"][number];
  language: PanelLanguage;
}) {
  const type = sectionTypes[language].find(
    (option) => option.value === section.type,
  )!;
  const Icon = type.icon;
  return (
    <S.SectionDragGhost>
      <ThemeIcon variant="light" radius="xl" aria-hidden>
        <Icon size={18} />
      </ThemeIcon>
      <div>
        <Text fw={600}>{section.title}</Text>
        <Text size="xs" c="dimmed">
          {type.label}
        </Text>
      </div>
    </S.SectionDragGhost>
  );
}
