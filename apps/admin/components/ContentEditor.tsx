"use client";
import { MotionDisclosure } from "@invitations/ui/motion-components";
import { FormRow } from "./form-layout.styles";
import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import {
  DotsSixIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  SiteConfig,
  Section,
  DeviceCrops,
  MediaAsset,
} from "@invitations/domain";
import {
  detachSection,
  moveSection,
  newId,
  removeEntity,
} from "@invitations/domain/editor";
import { usePanelI18n } from "../lib/i18n";
import { PhotoCropEditor } from "./PhotoCropEditor";
import { DeviceSelector, type PhotoDevice } from "./DeviceSelector";
import {
  MediaUrlsContext,
  PhotoReference,
  PhotoThumbnail,
  photoName,
} from "./PhotoReference";
type Change = Dispatch<SetStateAction<SiteConfig>>;
function useText() {
  const { language } = usePanelI18n();
  return (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;
}
function useTypes() {
  const t = useText();
  return {
    timeline: t("Program", "Programme", "Programm"),
    venue: t("Miejsce", "Venue", "Ort"),
    contact: t("Kontakt", "Contact", "Kontakt"),
    text: t("Tekst", "Text", "Text"),
    gallery: t("Galeria", "Gallery", "Galerie"),
  };
}
function Shared({
  count,
  onCopy,
  disabled = false,
}: {
  count: number;
  onCopy: () => void;
  disabled?: boolean;
}) {
  const t = useText();
  return count > 1 ? (
    <Alert>
      <Text size="sm">
        {t(
          `Wspólna treść: ${count} użycia. Zmiana zaktualizuje wszystkie.`,
          `Shared content: ${count} uses. Changes update all of them.`,
          `Gemeinsamer Inhalt: ${count} Verwendungen. Änderungen gelten überall.`,
        )}
      </Text>
      <Button size="xs" variant="subtle" disabled={disabled} onClick={onCopy}>
        {t(
          "Utwórz niezależną kopię",
          "Create independent copy",
          "Unabhängige Kopie erstellen",
        )}
      </Button>
    </Alert>
  ) : null;
}
function PhotoUse({
  config,
  id,
  crops,
  onId,
  onCrops,
  device,
  onDevice,
}: {
  config: SiteConfig;
  id?: string;
  crops: DeviceCrops;
  onId: (id: string | null) => void;
  onCrops: (c: DeviceCrops) => void;
  device: PhotoDevice;
  onDevice: (d: PhotoDevice) => void;
}) {
  const t = useText(),
    urls = useContext(MediaUrlsContext);
  const photo = config.media.find((p) => p.id === id);
  return (
    <Stack>
      {!photo && <DeviceSelector device={device} onChange={onDevice} />}
      <Select
        label={t(
          "Zdjęcie dla wybranego urządzenia",
          "Photo for selected device",
          "Foto für ausgewähltes Gerät",
        )}
        searchable
        allowDeselect={false}
        clearable
        value={id || null}
        data={config.media.map((p) => ({ value: p.id, label: photoName(p) }))}
        leftSection={photo ? <PhotoThumbnail photo={photo} /> : undefined}
        leftSectionWidth={48}
        styles={{ input: { minHeight: 48 } }}
        renderOption={({ option }) => (
          <PhotoReference
            photo={config.media.find((p) => p.id === option.value)!}
          />
        )}
        onChange={onId}
      />
      {photo && (
        <PhotoCropEditor
          photo={photo}
          crops={crops}
          urls={urls}
          device={device}
          onDevice={onDevice}
          disabled={false}
          onChange={onCrops}
        />
      )}
    </Stack>
  );
}
function VenueEditor({
  config,
  id,
  onChange,
  onSelect,
}: {
  config: SiteConfig;
  id?: string;
  onChange: Change;
  onSelect: (id: string | undefined) => void;
}) {
  const t = useText();
  const venue = config.venues.find((v) => v.id === id);
  const update = (patch: Partial<SiteConfig["venues"][number]>) =>
    onChange((c) => ({
      ...c,
      venues: c.venues.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  const count =
    config.events.filter((e) => e.venueId === id).length +
    config.sections.filter((s) => s.type === "venue" && s.venueId === id)
      .length;
  return (
    <Stack>
      <FormRow>
        <Select
          label={t("Miejsce", "Venue", "Ort")}
          searchable
          clearable
          value={id || null}
          data={config.venues.map((v) => ({ value: v.id, label: v.name }))}
          onChange={(id) => onSelect(id || undefined)}
        />
        <Button
          disabled={config.venues.length >= 30}
          onClick={() => {
            const id = newId("venue");
            onChange((c) => ({
              ...c,
              venues: [
                ...c.venues,
                {
                  id,
                  name: t("Nowe miejsce", "New venue", "Neuer Ort"),
                  address: "",
                  description: "",
                  mapUrl: "",
                  navigationUrl: "",
                },
              ],
            }));
            onSelect(id);
          }}
        >
          {t("Dodaj miejsce", "Add venue", "Ort hinzufügen")}
        </Button>
      </FormRow>
      {venue && (
        <>
          <Shared
            count={count}
            disabled={config.venues.length >= 30}
            onCopy={() => {
              const next = { ...venue, id: newId("venue") };
              onChange((c) => ({ ...c, venues: [...c.venues, next] }));
              onSelect(next.id);
            }}
          />
          <TextInput
            label={t("Nazwa miejsca", "Venue name", "Name des Ortes")}
            value={venue.name}
            onChange={(e) => update({ name: e.currentTarget.value })}
          />
          <TextInput
            label={t("Adres", "Address", "Adresse")}
            value={venue.address}
            onChange={(e) => update({ address: e.currentTarget.value })}
          />
          <Textarea
            label={t("Opis miejsca", "Venue description", "Ortsbeschreibung")}
            value={venue.description}
            onChange={(e) => update({ description: e.currentTarget.value })}
          />
          <TextInput
            label={t(
              "Link nawigacji (opcjonalny)",
              "Navigation link (optional)",
              "Navigationslink (optional)",
            )}
            value={venue.navigationUrl}
            onChange={(e) => update({ navigationUrl: e.currentTarget.value })}
          />
          <TextInput
            label={t(
              "Mapa Google — adres osadzania (opcjonalny)",
              "Google Maps embed URL (optional)",
              "Google Maps Einbettung (optional)",
            )}
            value={venue.mapUrl}
            onChange={(e) => update({ mapUrl: e.currentTarget.value })}
          />
        </>
      )}
    </Stack>
  );
}
function useSortSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}
function DragHandle({
  setActivatorNodeRef,
  attributes,
  listeners,
  isDragging,
  label,
  testId,
}: {
  setActivatorNodeRef: ReturnType<typeof useSortable>["setActivatorNodeRef"];
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  isDragging: boolean;
  label: string;
  testId: string;
}) {
  return (
    <ActionIcon
      ref={setActivatorNodeRef}
      variant="transparent"
      color="dimmed"
      size={44}
      style={{
        touchAction: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        cursor: isDragging ? "grabbing" : "grab",
        flexShrink: 0,
      }}
      onContextMenu={(e) => e.preventDefault()}
      data-testid={testId}
      aria-label={label}
      {...attributes}
      {...listeners}
    >
      <DotsSixIcon size={20} weight="bold" />
    </ActionIcon>
  );
}
function RelatedRow({
  id,
  item,
  photo,
  selected,
  onSelect,
  onRemove,
}: {
  id: string;
  item?: { name: string; detail?: string };
  photo?: MediaAsset;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const t = useText();
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({ id });
  return (
    <Card
      ref={setNodeRef}
      withBorder
      padding="sm"
      data-ui="reference-row"
      data-testid={`related-item-${id}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <Group wrap="nowrap" gap="xs">
        <DragHandle
          setActivatorNodeRef={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
          isDragging={isDragging}
          testId={`related-handle-${id}`}
          label={`${t("Przeciągnij element", "Drag item", "Eintrag ziehen")}: ${item?.name || id}`}
        />
        <Button
          variant={selected ? "light" : "subtle"}
          aria-label={item?.name || id}
          px={0}
          style={{ flex: 1, minWidth: 0, height: "auto", minHeight: 44 }}
          styles={{ label: { width: "100%", minWidth: 0, textAlign: "left" } }}
          onClick={onSelect}
        >
          {photo ? (
            <PhotoReference photo={photo} />
          ) : (
            <Stack gap={0} align="start">
              <Text
                size="sm"
                style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
              >
                {item?.name || id}
              </Text>
              {item?.detail && (
                <Text size="xs" c="dimmed">
                  {item.detail}
                </Text>
              )}
            </Stack>
          )}
        </Button>
        <ActionIcon
          variant="subtle"
          color="red"
          aria-label={t(
            "Usuń z sekcji",
            "Remove from section",
            "Aus Abschnitt entfernen",
          )}
          onClick={onRemove}
        >
          <TrashIcon />
        </ActionIcon>
      </Group>
    </Card>
  );
}
function RelatedList({
  ids,
  options,
  selected,
  onSelect,
  onIds,
  onAdd,
  photos,
}: {
  ids: string[];
  options: { id: string; name: string; detail?: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onIds: (ids: string[]) => void;
  onAdd: () => void;
  photos?: MediaAsset[];
}) {
  const t = useText();
  const sensors = useSortSensors();
  const [existing, setExisting] = useState<string | null>(null);
  return (
    <Stack gap="sm">
      {!ids.length && (
        <Text c="dimmed" size="sm">
          {t(
            "Lista jest pusta. Dodaj pierwszy element.",
            "The list is empty. Add the first item.",
            "Die Liste ist leer. Füge den ersten Eintrag hinzu.",
          )}
        </Text>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;
          const from = ids.indexOf(String(active.id));
          const to = ids.indexOf(String(over.id));
          if (from >= 0 && to >= 0) onIds(arrayMove(ids, from, to));
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <Stack gap="sm">
            {ids.map((id) => (
              <RelatedRow
                key={id}
                id={id}
                item={options.find((o) => o.id === id)}
                photo={photos?.find((p) => p.id === id)}
                selected={selected === id}
                onSelect={() => onSelect(selected === id ? null : id)}
                onRemove={() => {
                  onIds(ids.filter((x) => x !== id));
                  if (selected === id) onSelect(null);
                }}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>
      <Button variant="light" onClick={onAdd}>
        {t("Dodaj nowy element", "Add new item", "Neuen Eintrag hinzufügen")}
      </Button>
      {options.some((o) => !ids.includes(o.id)) && (
        <FormRow>
          <Select
            searchable
            label={t(
              "Dodaj istniejący",
              "Add existing",
              "Vorhandenen hinzufügen",
            )}
            value={existing}
            onChange={setExisting}
            data={options
              .filter((o) => !ids.includes(o.id))
              .map((o) => ({ value: o.id, label: o.name }))}
            renderOption={
              photos
                ? ({ option }) => (
                    <PhotoReference
                      photo={photos.find((p) => p.id === option.value)!}
                    />
                  )
                : undefined
            }
          />
          <Button
            disabled={!existing}
            onClick={() => {
              if (existing) {
                onIds([...ids, existing]);
                onSelect(existing);
                setExisting(null);
              }
            }}
          >
            {t("Dodaj", "Add", "Hinzufügen")}
          </Button>
        </FormRow>
      )}
    </Stack>
  );
}
function SectionRow({
  section,
  visible,
  onEdit,
  onVisibility,
  expanded,
  children,
}: {
  expanded: boolean;
  children: ReactNode;
  section: Section;
  visible: boolean;
  onEdit: () => void;
  onVisibility: () => void;
}) {
  const t = useText(),
    types = useTypes();
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    isDragging,
    transform,
    transition,
  } = useSortable({ id: section.id });
  return (
    <Card
      ref={setNodeRef}
      withBorder
      padding="sm"
      data-testid={`section-${section.id}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: visible ? 1 : 0.6,
      }}
    >
      <Group wrap="nowrap" gap="xs">
        <DragHandle
          setActivatorNodeRef={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
          isDragging={isDragging}
          testId={`drag-handle-${section.id}`}
          label={t("Przeciągnij sekcję", "Drag section", "Abschnitt ziehen")}
        />
        <Button
          variant="subtle"
          px="sm"
          py="xs"
          style={{ flex: 1, minWidth: 0, height: "auto", minHeight: 44 }}
          onClick={onEdit}
          aria-expanded={expanded}
          aria-controls={`content-${section.id}`}
          styles={{ label: { width: "100%", minWidth: 0, textAlign: "left" } }}
        >
          <Group gap="xs" wrap="nowrap" w="100%">
            <Stack gap={0} align="start" style={{ flex: 1, minWidth: 0 }}>
              <Text
                size="sm"
                fw={600}
                style={{ whiteSpace: "normal", overflowWrap: "anywhere" }}
              >
                {section.title}
              </Text>
              <Text size="xs" c="dimmed">
                {types[section.type]}
              </Text>
            </Stack>
            <CaretDownIcon
              className="content-disclosure-chevron"
              size={16}
              style={{
                flexShrink: 0,
                transform: expanded ? "rotate(180deg)" : undefined,
              }}
            />
          </Group>
        </Button>
        <ActionIcon
          variant="subtle"
          aria-label={
            visible
              ? t("Ukryj sekcję", "Hide section", "Abschnitt ausblenden")
              : t("Pokaż sekcję", "Show section", "Abschnitt anzeigen")
          }
          onClick={onVisibility}
        >
          {visible ? <EyeIcon /> : <EyeSlashIcon />}
        </ActionIcon>
      </Group>
      <MotionDisclosure id={`content-${section.id}`} open={expanded}>
        {children}
      </MotionDisclosure>
    </Card>
  );
}
type ContentEditorProps = {
  config: SiteConfig;
  onChange: Change;
  variantId: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  device: PhotoDevice;
  onDevice: (d: PhotoDevice) => void;
};
function SectionDetails({
  config,
  onChange,
  variantId,
  selected,
  onSelect,
  device,
  onDevice,
}: ContentEditorProps) {
  const t = useText(),
    types = useTypes();
  const [entity, setEntity] = useState<string | null>(null),
    [deleting, setDeleting] = useState(false);
  const variant = config.variants.find((v) => v.id === variantId)!;
  const section = config.sections.find((s) => s.id === selected);
  const update = (patch: Partial<Section>) =>
    onChange((c) => ({
      ...c,
      sections: c.sections.map((s) =>
        s.id === section?.id ? ({ ...s, ...patch } as Section) : s,
      ),
    }));
  const hero = (patch: Partial<SiteConfig["hero"]>) =>
    onChange((c) => ({ ...c, hero: { ...c.hero, ...patch } }));
  const photoId =
    device === "mobile"
      ? config.hero.mobileMediaId || config.hero.mediaId
      : device === "tablet"
        ? config.hero.tabletMediaId || config.hero.mediaId
        : config.hero.mediaId;
  const event =
      section?.type === "timeline"
        ? config.events.find((e) => e.id === entity)
        : undefined,
    contact =
      section?.type === "contact"
        ? config.contacts.find((c) => c.id === entity)
        : undefined;
  const updateEvent = (patch: Partial<SiteConfig["events"][number]>) =>
    onChange((c) => ({
      ...c,
      events: c.events.map((e) =>
        e.id === event?.id ? { ...e, ...patch } : e,
      ),
    }));
  const updateContact = (patch: Partial<SiteConfig["contacts"][number]>) =>
    onChange((c) => ({
      ...c,
      contacts: c.contacts.map((x) =>
        x.id === contact?.id ? { ...x, ...patch } : x,
      ),
    }));
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <Stack ref={formRef} pt="md">
      {selected === "hero" ? (
        <>
          <Title order={3}>
            {t(
              "Początek zaproszenia",
              "Invitation introduction",
              "Beginn der Einladung",
            )}
          </Title>
          <Text size="sm" c="dimmed">
            {t(
              "Wspólny dla wszystkich wariantów.",
              "Shared by all variants.",
              "Für alle Varianten gemeinsam.",
            )}
          </Text>
          <TextInput
            label={t("Główny napis", "Main heading", "Hauptüberschrift")}
            value={config.identity.displayName}
            onChange={(e) => {
              const displayName = e.currentTarget.value;
              onChange((c) => ({ ...c, identity: { displayName } }));
            }}
          />
          {(["eyebrow", "title", "dateLabel"] as const).map((key, i) => (
            <TextInput
              key={key}
              label={
                [
                  t(
                    "Tekst nad nagłówkiem",
                    "Text above heading",
                    "Text über der Überschrift",
                  ),
                  t(
                    "Dodatkowy nagłówek",
                    "Additional heading",
                    "Zusätzliche Überschrift",
                  ),
                  t("Data do wyświetlenia", "Display date", "Anzeigedatum"),
                ][i]
              }
              value={config.hero[key]}
              onChange={(e) => hero({ [key]: e.currentTarget.value })}
            />
          ))}
          <Textarea
            label={t("Opis", "Description", "Beschreibung")}
            value={config.hero.description}
            onChange={(e) => hero({ description: e.currentTarget.value })}
          />
          <Select
            label={t("Układ", "Layout", "Layout")}
            allowDeselect={false}
            value={config.hero.layout}
            data={[
              {
                value: "split",
                label: t(
                  "Zdjęcie obok tekstu",
                  "Photo beside text",
                  "Foto neben Text",
                ),
              },
              {
                value: "overlay",
                label: t(
                  "Tekst na zdjęciu",
                  "Text over photo",
                  "Text auf Foto",
                ),
              },
            ]}
            onChange={(v) => hero({ layout: v as "split" | "overlay" })}
          />
          <PhotoUse
            config={config}
            id={photoId}
            crops={config.hero.crops}
            onId={(id) =>
              hero({
                [device === "mobile"
                  ? "mobileMediaId"
                  : device === "tablet"
                    ? "tabletMediaId"
                    : "mediaId"]: id || undefined,
              })
            }
            onCrops={(crops) => hero({ crops })}
            device={device}
            onDevice={onDevice}
          />
        </>
      ) : selected === "footer" ? (
        <Textarea
          label={t("Stopka", "Footer", "Fußzeile")}
          value={config.copy.footer}
          onChange={(e) => {
            const footer = e.currentTarget.value;
            onChange((c) => ({ ...c, copy: { ...c.copy, footer } }));
          }}
        />
      ) : section ? (
        <>
          <Title order={3}>{types[section.type]}</Title>
          <Shared
            count={
              config.variants.filter((v) =>
                v.sections.some((p) => p.sectionId === section.id),
              ).length
            }
            disabled={config.sections.length >= 30}
            onCopy={() => {
              const next = {
                ...structuredClone(section),
                id: newId("section"),
              };
              onChange((c) => ({
                ...c,
                sections: [...c.sections, next],
                variants: c.variants.map((v) =>
                  v.id === variant.id
                    ? {
                        ...v,
                        sections: v.sections.map((p) =>
                          p.sectionId === section.id
                            ? { ...p, sectionId: next.id }
                            : p,
                        ),
                      }
                    : v,
                ),
              }));
              onSelect(next.id);
            }}
          />
          <TextInput
            label={t("Tytuł sekcji", "Section title", "Abschnittstitel")}
            value={section.title}
            onChange={(e) => update({ title: e.currentTarget.value })}
          />
          <Textarea
            autosize
            label={t("Treść sekcji", "Section text", "Abschnittstext")}
            value={section.body}
            onChange={(e) => update({ body: e.currentTarget.value })}
          />
          {section.type === "venue" && (
            <VenueEditor
              config={config}
              id={section.venueId}
              onChange={onChange}
              onSelect={(id) => {
                if (id) update({ venueId: id });
              }}
            />
          )}
          {section.type === "timeline" && (
            <>
              <RelatedList
                ids={section.eventIds}
                options={config.events.map((e) => ({
                  id: e.id,
                  name: e.title,
                  detail: `${e.date || ""} ${e.time}`,
                }))}
                selected={entity}
                onSelect={setEntity}
                onIds={(eventIds) => update({ eventIds })}
                onAdd={() => {
                  if (config.events.length >= 50) return;
                  const id = newId("event");
                  onChange((c) => ({
                    ...c,
                    events: [
                      ...c.events,
                      {
                        id,
                        title: t(
                          "Nowe wydarzenie",
                          "New event",
                          "Neue Veranstaltung",
                        ),
                        time: "15:00",
                        url: "",
                        dateLabel: "",
                      },
                    ],
                    sections: c.sections.map((s) =>
                      s.id === section.id && s.type === "timeline"
                        ? { ...s, eventIds: [...s.eventIds, id] }
                        : s,
                    ),
                    variants: c.variants.map((v) =>
                      v.id === variant.id
                        ? { ...v, eventIds: [...v.eventIds, id] }
                        : v,
                    ),
                  }));
                  setEntity(id);
                }}
              />
              {event && (
                <Card withBorder>
                  <Stack>
                    <Shared
                      count={
                        config.sections.filter(
                          (s) =>
                            s.type === "timeline" &&
                            s.eventIds.includes(event.id),
                        ).length
                      }
                      disabled={config.events.length >= 50}
                      onCopy={() => {
                        const next = { ...event, id: newId("event") };
                        onChange((c) => ({
                          ...c,
                          events: [...c.events, next],
                          variants: c.variants.map((v) =>
                            v.id === variant.id && v.eventIds.includes(event.id)
                              ? { ...v, eventIds: [...v.eventIds, next.id] }
                              : v,
                          ),
                        }));
                        update({
                          eventIds: section.eventIds.map((id) =>
                            id === event.id ? next.id : id,
                          ),
                        });
                        setEntity(next.id);
                      }}
                    />
                    <TextInput
                      label={t(
                        "Nazwa wydarzenia",
                        "Event name",
                        "Name der Veranstaltung",
                      )}
                      value={event.title}
                      onChange={(e) =>
                        updateEvent({ title: e.currentTarget.value })
                      }
                    />
                    <Group grow>
                      <TextInput
                        type="date"
                        label={t("Data", "Date", "Datum")}
                        value={event.date || ""}
                        onChange={(e) =>
                          updateEvent({
                            date: e.currentTarget.value || undefined,
                          })
                        }
                      />
                      <TextInput
                        type="time"
                        label={t("Godzina", "Time", "Uhrzeit")}
                        value={event.time}
                        onChange={(e) =>
                          updateEvent({ time: e.currentTarget.value })
                        }
                      />
                    </Group>
                    <TextInput
                      label={t(
                        "Opis daty (opcjonalny)",
                        "Date label (optional)",
                        "Datumsbeschreibung (optional)",
                      )}
                      value={event.dateLabel}
                      onChange={(e) =>
                        updateEvent({ dateLabel: e.currentTarget.value })
                      }
                    />
                    <VenueEditor
                      config={config}
                      id={event.venueId}
                      onChange={onChange}
                      onSelect={(venueId) => updateEvent({ venueId })}
                    />
                    <TextInput
                      label={t(
                        "Link wydarzenia (opcjonalny)",
                        "Event link (optional)",
                        "Veranstaltungslink (optional)",
                      )}
                      value={event.url}
                      onChange={(e) =>
                        updateEvent({ url: e.currentTarget.value })
                      }
                    />
                    <Checkbox
                      label={t(
                        "Goście tego wariantu są zaproszeni na to wydarzenie",
                        "Guests of this variant are invited to this event",
                        "Gäste dieser Variante sind zu dieser Veranstaltung eingeladen",
                      )}
                      checked={variant.eventIds.includes(event.id)}
                      onChange={(e) => {
                        const checked = e.currentTarget.checked;
                        onChange((c) => ({
                          ...c,
                          variants: c.variants.map((v) =>
                            v.id === variant.id
                              ? {
                                  ...v,
                                  eventIds: checked
                                    ? [
                                        ...v.eventIds.filter(
                                          (id) => id !== event.id,
                                        ),
                                        event.id,
                                      ]
                                    : v.eventIds.filter(
                                        (id) => id !== event.id,
                                      ),
                                }
                              : v,
                          ),
                        }));
                      }}
                    />
                    {!variant.eventIds.includes(event.id) && (
                      <Alert color="orange">
                        {t(
                          "To wydarzenie nie pojawi się w programie ani RSVP gości tego wariantu.",
                          "This event is excluded from the programme and RSVP of this variant.",
                          "Dieses Ereignis erscheint nicht im Programm und RSVP dieser Variante.",
                        )}
                      </Alert>
                    )}
                  </Stack>
                </Card>
              )}
            </>
          )}
          {section.type === "contact" && (
            <>
              <RelatedList
                ids={section.contactIds}
                options={config.contacts.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))}
                selected={entity}
                onSelect={setEntity}
                onIds={(contactIds) => update({ contactIds })}
                onAdd={() => {
                  if (config.contacts.length >= 10) return;
                  const id = newId("contact");
                  onChange((c) => ({
                    ...c,
                    contacts: [
                      ...c.contacts,
                      {
                        id,
                        name: t("Nowy kontakt", "New contact", "Neuer Kontakt"),
                        phone: "",
                      },
                    ],
                    sections: c.sections.map((s) =>
                      s.id === section.id && s.type === "contact"
                        ? { ...s, contactIds: [...s.contactIds, id] }
                        : s,
                    ),
                  }));
                  setEntity(id);
                }}
              />
              {contact && (
                <Card withBorder>
                  <Stack>
                    <Shared
                      count={
                        config.sections.filter(
                          (s) =>
                            s.type === "contact" &&
                            s.contactIds.includes(contact.id),
                        ).length
                      }
                      disabled={config.contacts.length >= 10}
                      onCopy={() => {
                        const next = { ...contact, id: newId("contact") };
                        onChange((c) => ({
                          ...c,
                          contacts: [...c.contacts, next],
                        }));
                        update({
                          contactIds: section.contactIds.map((id) =>
                            id === contact.id ? next.id : id,
                          ),
                        });
                        setEntity(next.id);
                      }}
                    />
                    <TextInput
                      label={t("Imię / nazwa", "Name", "Name")}
                      value={contact.name}
                      onChange={(e) =>
                        updateContact({ name: e.currentTarget.value })
                      }
                    />
                    <TextInput
                      type="tel"
                      label={t("Telefon", "Phone", "Telefon")}
                      value={contact.phone}
                      onChange={(e) =>
                        updateContact({ phone: e.currentTarget.value })
                      }
                    />
                  </Stack>
                </Card>
              )}
            </>
          )}
          {section.type === "gallery" && (
            <>
              <RelatedList
                photos={config.media}
                ids={section.mediaIds}
                options={config.media.map((p) => ({
                  id: p.id,
                  name: photoName(p),
                }))}
                selected={entity}
                onSelect={setEntity}
                onIds={(mediaIds) =>
                  update({
                    mediaIds,
                    crops: Object.fromEntries(
                      Object.entries(section.crops).filter(([id]) =>
                        mediaIds.includes(id),
                      ),
                    ),
                  })
                }
                onAdd={() => setEntity("choose")}
              />
              {entity === "choose" ? (
                <Select
                  label={t("Wybierz zdjęcie", "Choose photo", "Foto auswählen")}
                  data={config.media
                    .filter((p) => !section.mediaIds.includes(p.id))
                    .map((p) => ({ value: p.id, label: photoName(p) }))}
                  renderOption={({ option }) => (
                    <PhotoReference
                      photo={config.media.find((p) => p.id === option.value)!}
                    />
                  )}
                  onChange={(id) => {
                    if (id) {
                      update({ mediaIds: [...section.mediaIds, id] });
                      setEntity(id);
                    }
                  }}
                />
              ) : (
                entity &&
                section.mediaIds.includes(entity) && (
                  <PhotoUse
                    config={config}
                    id={entity}
                    crops={section.crops[entity] || {}}
                    device={device}
                    onDevice={onDevice}
                    onCrops={(crops) =>
                      update({ crops: { ...section.crops, [entity]: crops } })
                    }
                    onId={(id) => {
                      if (
                        id === entity ||
                        (id && section.mediaIds.includes(id))
                      )
                        return;
                      const crops = { ...section.crops };
                      delete crops[entity];
                      update({
                        mediaIds: id
                          ? section.mediaIds.map((x) => (x === entity ? id : x))
                          : section.mediaIds.filter((x) => x !== entity),
                        crops,
                      });
                      setEntity(id);
                    }}
                  />
                )
              )}
            </>
          )}
          <Button
            color="red"
            variant="subtle"
            onClick={() => setDeleting(true)}
          >
            {t(
              "Usuń sekcję z wariantu",
              "Remove section from variant",
              "Abschnitt aus Variante entfernen",
            )}
          </Button>
          {deleting && (
            <Alert color="red">
              <Text>
                {t(
                  "Sekcja zostanie odłączona od tego wariantu.",
                  "The section will be detached from this variant.",
                  "Der Abschnitt wird aus dieser Variante entfernt.",
                )}
              </Text>
              <Group>
                <Button variant="default" onClick={() => setDeleting(false)}>
                  {t("Anuluj", "Cancel", "Abbrechen")}
                </Button>
                <Button
                  color="red"
                  onClick={() => {
                    onChange((c) => detachSection(c, variant.id, section.id));
                    onSelect(null);
                  }}
                >
                  {t("Usuń", "Remove", "Entfernen")}
                </Button>
              </Group>
            </Alert>
          )}
        </>
      ) : null}
    </Stack>
  );
}
function FixedSection({
  id,
  label,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card withBorder padding="sm">
      <Group wrap="nowrap" gap="xs">
        <span aria-hidden="true" style={{ width: 44, flexShrink: 0 }} />
        <Button
          variant="subtle"
          px="sm"
          py="xs"
          style={{ flex: 1, minWidth: 0, height: "auto", minHeight: 44 }}
          styles={{ label: { width: "100%", minWidth: 0, textAlign: "left" } }}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`content-${id}`}
        >
          <Group gap="xs" wrap="nowrap" w="100%">
            <Text
              size="sm"
              fw={600}
              style={{
                flex: 1,
                whiteSpace: "normal",
                overflowWrap: "anywhere",
              }}
            >
              {label}
            </Text>
            <CaretDownIcon
              className="content-disclosure-chevron"
              size={16}
              style={{
                flexShrink: 0,
                transform: expanded ? "rotate(180deg)" : undefined,
              }}
            />
          </Group>
        </Button>
        <span aria-hidden="true" style={{ width: 28, flexShrink: 0 }} />
      </Group>
      <MotionDisclosure id={`content-${id}`} open={expanded}>
        {children}
      </MotionDisclosure>
    </Card>
  );
}
export function ContentEditor(props: ContentEditorProps) {
  const { config, onChange, variantId, selected, onSelect } = props;
  const t = useText(),
    types = useTypes();
  const [adding, setAdding] = useState(false),
    [resources, setResources] = useState(false);
  const variant = config.variants.find((v) => v.id === variantId)!;
  const sensors = useSortSensors();
  const toggle = (id: string) => onSelect(selected === id ? null : id);
  const details = <SectionDetails key={selected} {...props} />;
  const place = (id: string) =>
    onChange((c) => ({
      ...c,
      variants: c.variants.map((v) =>
        v.id === variant.id
          ? {
              ...v,
              sections: [...v.sections, { sectionId: id, visible: true }],
            }
          : v,
      ),
    }));
  return (
    <Stack>
      <Title order={3}>
        {t("Treść zaproszenia", "Invitation content", "Einladungsinhalt")}
      </Title>
      <Text size="sm" c="dimmed">
        {t(
          "Rozwiń sekcję, aby edytować jej treść. Kolejność i widoczność dotyczą wybranego wariantu.",
          "Expand a section to edit. Order and visibility apply to the selected variant.",
          "Klappe einen Abschnitt auf. Reihenfolge und Sichtbarkeit gelten für die ausgewählte Variante.",
        )}
      </Text>
      <FixedSection
        id="hero"
        label={t(
          "Początek zaproszenia",
          "Invitation introduction",
          "Beginn der Einladung",
        )}
        expanded={selected === "hero"}
        onToggle={() => toggle("hero")}
      >
        {selected === "hero" && details}
      </FixedSection>
      <DndContext
        id="content-sections"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (over)
            onChange((c) =>
              moveSection(
                c,
                variant.id,
                variant.sections.findIndex((p) => p.sectionId === active.id),
                variant.sections.findIndex((p) => p.sectionId === over.id),
              ),
            );
        }}
      >
        <SortableContext
          items={variant.sections.map((p) => p.sectionId)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap="sm">
            {variant.sections.map((p) => {
              const s = config.sections.find((s) => s.id === p.sectionId)!;
              return (
                <SectionRow
                  key={s.id}
                  section={s}
                  visible={p.visible}
                  expanded={selected === s.id}
                  onEdit={() => toggle(s.id)}
                  onVisibility={() =>
                    onChange((c) => ({
                      ...c,
                      variants: c.variants.map((v) =>
                        v.id === variant.id
                          ? {
                              ...v,
                              sections: v.sections.map((x) =>
                                x.sectionId === s.id
                                  ? { ...x, visible: !x.visible }
                                  : x,
                              ),
                            }
                          : v,
                      ),
                    }))
                  }
                >
                  {selected === s.id && details}
                </SectionRow>
              );
            })}
          </Stack>
        </SortableContext>
      </DndContext>
      <Button onClick={() => setAdding(true)}>
        {t("Dodaj sekcję", "Add section", "Abschnitt hinzufügen")}
      </Button>
      <FixedSection
        id="footer"
        label={t("Stopka", "Footer", "Fußzeile")}
        expanded={selected === "footer"}
        onToggle={() => toggle("footer")}
      >
        {selected === "footer" && details}
      </FixedSection>
      <Button variant="subtle" onClick={() => setResources(true)}>
        {t(
          "Zarządzaj wspólnymi danymi",
          "Manage shared data",
          "Gemeinsame Daten verwalten",
        )}
      </Button>
      <Modal
        opened={adding}
        onClose={() => setAdding(false)}
        title={t("Dodaj sekcję", "Add section", "Abschnitt hinzufügen")}
      >
        <Stack>
          {Object.entries(types).map(([type, label]) => (
            <Button
              key={type}
              variant="light"
              disabled={
                config.sections.length >= 30 || variant.sections.length >= 30
              }
              onClick={() => {
                const base = { id: newId("section"), title: label, body: "" };
                let next: Section;
                if (type === "timeline") next = { ...base, type, eventIds: [] };
                else if (type === "contact")
                  next = { ...base, type, contactIds: [] };
                else if (type === "gallery")
                  next = { ...base, type, mediaIds: [], crops: {} };
                else if (type === "venue") {
                  const venue = config.venues[0] || {
                    id: newId("venue"),
                    name: t("Nowe miejsce", "New venue", "Neuer Ort"),
                    address: "",
                    description: "",
                    mapUrl: "",
                    navigationUrl: "",
                  };
                  if (!config.venues.length)
                    onChange((c) => ({ ...c, venues: [venue] }));
                  next = { ...base, type, venueId: venue.id };
                } else next = { ...base, type: "text" };
                onChange((c) => ({ ...c, sections: [...c.sections, next] }));
                place(next.id);
                onSelect(next.id);
                setAdding(false);
              }}
            >
              {label}
            </Button>
          ))}
          {config.sections
            .filter((s) => !variant.sections.some((p) => p.sectionId === s.id))
            .map((s) => (
              <Button
                key={s.id}
                variant="subtle"
                disabled={variant.sections.length >= 30}
                onClick={() => {
                  place(s.id);
                  onSelect(s.id);
                  setAdding(false);
                }}
              >
                {t(
                  "Użyj istniejącej: ",
                  "Use existing: ",
                  "Vorhandenen verwenden: ",
                )}
                {s.title}
              </Button>
            ))}
        </Stack>
      </Modal>
      <Resources
        opened={resources}
        onClose={() => setResources(false)}
        config={config}
        onChange={onChange}
      />
    </Stack>
  );
}
function Resources({
  opened,
  onClose,
  config,
  onChange,
}: {
  opened: boolean;
  onClose: () => void;
  config: SiteConfig;
  onChange: Change;
}) {
  const t = useText();
  const [kind, setKind] = useState<"events" | "contacts" | "venues">("events"),
    [removing, setRemoving] = useState<string | null>(null);
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t(
        "Wspólne dane projektu",
        "Shared project data",
        "Gemeinsame Projektdaten",
      )}
    >
      <Stack>
        <Select
          allowDeselect={false}
          aria-label={t("Rodzaj danych", "Data type", "Datentyp")}
          value={kind}
          data={[
            {
              value: "events",
              label: t("Wydarzenia", "Events", "Veranstaltungen"),
            },
            { value: "contacts", label: t("Kontakty", "Contacts", "Kontakte") },
            { value: "venues", label: t("Miejsca", "Venues", "Orte") },
          ]}
          onChange={(v) => {
            setKind(v as typeof kind);
            setRemoving(null);
          }}
        />
        {config[kind].map((item) => (
          <Card key={item.id} withBorder>
            <Group justify="space-between">
              <Text>{"title" in item ? item.title : item.name}</Text>
              <Button
                variant="subtle"
                color="red"
                onClick={() => setRemoving(item.id)}
              >
                {t(
                  "Usuń z projektu",
                  "Delete from project",
                  "Aus Projekt löschen",
                )}
              </Button>
            </Group>
          </Card>
        ))}
        {removing && (
          <Alert color="red">
            <Stack>
              <Text size="sm">
                {t(
                  "Usunięcie obejmie wszystkie odwołania w szkicu. Usunięcie miejsca usunie też jego sekcje. Historyczne wydania i odpowiedzi RSVP pozostaną zachowane.",
                  "Deletion removes all draft references and venue sections. Historical releases and RSVP answers remain.",
                  "Alle Entwurfsverweise und Ortsabschnitte werden entfernt. Historische Veröffentlichungen und RSVP bleiben erhalten.",
                )}
              </Text>
              <Button
                color="red"
                onClick={() => {
                  onChange((c) => removeEntity(c, kind, removing));
                  setRemoving(null);
                }}
              >
                {t(
                  "Usuń i uporządkuj powiązania",
                  "Delete and clean references",
                  "Löschen und Verweise bereinigen",
                )}
              </Button>
              <Button variant="default" onClick={() => setRemoving(null)}>
                {t("Anuluj", "Cancel", "Abbrechen")}
              </Button>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
