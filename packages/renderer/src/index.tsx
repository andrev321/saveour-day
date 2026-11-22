"use client";
import {
  navigationUrl,
  visibleSections,
  type DeviceCrops,
  themes,
  isDarkColor,
  textOnColor,
  isSampleMediaSource,
  type MediaAsset,
  type SiteConfig,
} from "@invitations/domain";
import { calendarLinks } from "@invitations/domain/operations";
import {
  Anchor,
  ActionIcon,
  Button,
  Group,
  MantineProvider,
  Menu,
  Stack,
  Text,
  Title,
  Tooltip,
  createTheme,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import {
  Children,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { LoadingState } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import * as S from "./lib/styles";
import { useInvitationMotion } from "@invitations/ui/motion";
import {
  ClockIcon,
  MapPinIcon,
  ChatCircleIcon,
  ImagesIcon,
  EnvelopeOpenIcon,
  SparkleIcon,
  DiamondIcon,
  PencilSimpleIcon,
  CalendarPlusIcon,
} from "@phosphor-icons/react";

function PreviewEditButton({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  const label = `Edytuj: ${title}`;
  return (
    <S.PreviewEditControl>
      <Tooltip
        label={label}
        position="left"
        withArrow
        events={{ hover: true, focus: true, touch: false }}
      >
        <ActionIcon
          size={30}
          variant="default"
          aria-label={label}
          onClick={onClick}
        >
          <PencilSimpleIcon size={16} aria-hidden="true" />
        </ActionIcon>
      </Tooltip>
    </S.PreviewEditControl>
  );
}

type Palette = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

const mixHex = (color: string, target: number, amount: number) => {
  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(color.slice(offset, offset + 2), 16),
  );
  return `#${channels
    .map((channel) =>
      Math.round(channel + (target - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

export const createAccentPalette = (accent: string): Palette => [
  mixHex(accent, 255, 0.9),
  mixHex(accent, 255, 0.75),
  mixHex(accent, 255, 0.58),
  mixHex(accent, 255, 0.42),
  mixHex(accent, 255, 0.26),
  mixHex(accent, 255, 0.12),
  accent,
  mixHex(accent, 0, 0.14),
  mixHex(accent, 0, 0.28),
  mixHex(accent, 0, 0.42),
];

export function InvitationProvider({
  config,
  children,
}: {
  config: SiteConfig;
  children: React.ReactNode;
}) {
  const preset = themes[config.theme];
  const theme = createTheme({
    respectReducedMotion: true,
    colors: { accent: createAccentPalette(config.design.accent) },
    primaryColor: "accent",
    primaryShade: 6,
    fontFamily: preset.bodyFont,
    headings: {
      fontFamily: preset.headingFont,
      fontWeight: "400",
    },
    defaultRadius: preset.radius,
    components: {
      Button: Button.extend({
        defaultProps: { radius: preset.radius, size: "md", autoContrast: true },
      }),
    },
  });
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={isDarkColor(config.design.paper) ? "dark" : "light"}
    >
      {children}
    </MantineProvider>
  );
}
function resolveMediaSrc(src: string, resolveMedia?: (src: string) => string) {
  return isSampleMediaSource(src) ? src : (resolveMedia?.(src) ?? src);
}

function buildMediaSrcSet(
  asset: MediaAsset,
  resolveMedia?: (src: string) => string,
) {
  return asset.variants.length
    ? asset.variants
        .map((v) => `${resolveMediaSrc(v.src, resolveMedia)} ${v.width}w`)
        .join(", ")
    : undefined;
}

function Photo({
  media,
  mobile,
  tablet,
  resolveMedia,
  hero = false,
  heroLayout,
  crops = {},
}: {
  media: MediaAsset;
  mobile?: MediaAsset;
  tablet?: MediaAsset;
  resolveMedia?: (src: string) => string;
  hero?: boolean;
  heroLayout?: SiteConfig["hero"]["layout"];
  crops?: DeviceCrops;
}) {
  const resolve = (src: string) => resolveMediaSrc(src, resolveMedia);
  const buildSrcSet = (asset: MediaAsset) =>
    buildMediaSrcSet(asset, resolveMedia);
  const src = resolve(media.src);
  const srcSet = buildSrcSet(media);
  const mobileVariantSrcSet = mobile ? buildSrcSet(mobile) : undefined;
  const mobileSrcSet = mobile
    ? (mobileVariantSrcSet ?? resolve(mobile.src))
    : undefined;
  const tabletVariantSrcSet = tablet ? buildSrcSet(tablet) : undefined;
  const tabletSrcSet = tablet
    ? (tabletVariantSrcSet ?? resolve(tablet.src))
    : undefined;
  const isOverlayHero = hero && heroLayout === "overlay";
  const effectiveSizes = isOverlayHero
    ? "100vw"
    : hero
      ? "(max-width: 48em) 100vw, (max-width: 64em) 65vw, 55vw"
      : "(max-width: 30em) 100vw, (max-width: 64em) 50vw, 480px";
  const tabletSizes = isOverlayHero ? "100vw" : "65vw";
  const sourceKey = JSON.stringify([
    media.id,
    src,
    mobileSrcSet,
    tabletSrcSet,
    srcSet,
  ]);
  const image = useRef<HTMLImageElement>(null);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth)
      setLoadedSource(sourceKey);
  }, [sourceKey]);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const loaded = loadedSource === sourceKey;
  const focalStyle = {
    "--focal": `${crops.desktop?.x ?? 50}% ${crops.desktop?.y ?? 50}%`,
    "--tablet-focal": `${crops.tablet?.x ?? crops.desktop?.x ?? 50}% ${crops.tablet?.y ?? crops.desktop?.y ?? 50}%`,
    "--mobile-focal": `${crops.mobile?.x ?? crops.desktop?.x ?? 50}% ${crops.mobile?.y ?? crops.desktop?.y ?? 50}%`,
  } as CSSProperties;
  const hasBlur = Boolean(
    media.blurDataUrl || tablet?.blurDataUrl || mobile?.blurDataUrl,
  );
  const desktopBlur = media.blurDataUrl ? `url(${media.blurDataUrl})` : "none";
  const tabletBlur = tablet
    ? tablet.blurDataUrl
      ? `url(${tablet.blurDataUrl})`
      : "none"
    : desktopBlur;
  const mobileBlur = mobile
    ? mobile.blurDataUrl
      ? `url(${mobile.blurDataUrl})`
      : "none"
    : desktopBlur;
  const placeholderStyle = {
    ...focalStyle,
    "--blur": desktopBlur,
    "--tablet-blur": tabletBlur,
    "--mobile-blur": mobileBlur,
  } as CSSProperties;
  // Signed URLs can arrive after the first render or be refreshed later.
  // A failure belongs to that request, not permanently to the photo component.
  if (failedSource === sourceKey)
    return (
      <S.InvitationPhotoFallback
        role={media.alt ? "img" : undefined}
        aria-label={media.alt || undefined}
      />
    );
  return (
    <S.PhotoFrame aria-busy={!loaded}>
      {hasBlur ? (
        <S.PhotoPlaceholder
          aria-hidden="true"
          data-loaded={loaded}
          style={placeholderStyle}
        />
      ) : null}
      <S.PhotoPicture>
        {mobile ? (
          <source
            media="(max-width: 47.99em)"
            srcSet={mobileSrcSet}
            sizes={mobileVariantSrcSet ? "100vw" : undefined}
          />
        ) : null}
        {tablet ? (
          <source
            media="(min-width: 48em) and (max-width: 63.99em)"
            srcSet={tabletSrcSet}
            sizes={tabletVariantSrcSet ? tabletSizes : undefined}
          />
        ) : null}
        <S.InvitationPhoto
          ref={image}
          data-loaded={loaded}
          data-has-blur={hasBlur}
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? effectiveSizes : undefined}
          alt={media.alt}
          width={media.width}
          height={media.height}
          loading={hero ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={hero ? "high" : "auto"}
          onError={() => setFailedSource(sourceKey)}
          onLoad={() => {
            setFailedSource(null);
            setLoadedSource(sourceKey);
          }}
          style={focalStyle}
        />
      </S.PhotoPicture>
    </S.PhotoFrame>
  );
}
function Venue({
  venue,
  config,
}: {
  venue: SiteConfig["venues"][number];
  config: SiteConfig;
}) {
  const [showMap, setShowMap] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapSlow, setMapSlow] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  useEffect(() => {
    if (!showMap || mapReady) return;
    const timer = setTimeout(() => setMapSlow(true), 20000);
    return () => clearTimeout(timer);
  }, [showMap, mapReady, mapAttempt]);
  return (
    <Stack gap="md">
      <Title order={3} size="h2">
        {venue.name}
      </Title>
      {venue.address ? <Text c="dimmed">{venue.address}</Text> : null}
      {venue.description ? (
        <S.InvitationProse>{venue.description}</S.InvitationProse>
      ) : null}
      <Group>
        <Button
          component="a"
          href={navigationUrl(venue)}
          target="_blank"
          rel="noopener noreferrer"
          variant="light"
        >
          {config.copy.navigate}
        </Button>
        {venue.mapUrl && !showMap ? (
          <Button variant="subtle" onClick={() => setShowMap(true)}>
            {config.copy.showMap}
          </Button>
        ) : null}
      </Group>
      {venue.mapUrl && showMap ? (
        <div style={{ position: "relative" }} aria-busy={!mapReady}>
          {!mapReady && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                display: "grid",
                placeContent: "center",
                background: "var(--paper)",
              }}
            >
              <LoadingState
                label={loadingText(config.locale.slice(0, 2), "loading")}
                slowLabel={loadingText(config.locale.slice(0, 2), "slow")}
              />
              {mapSlow && (
                <Button
                  onClick={() => {
                    setMapSlow(false);
                    setMapAttempt((n) => n + 1);
                  }}
                >
                  {loadingText(config.locale.slice(0, 2), "retry")}
                </Button>
              )}
            </div>
          )}
          <S.InvitationMap
            key={mapAttempt}
            onLoad={() => setMapReady(true)}
            src={venue.mapUrl}
            title={venue.name}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
    </Stack>
  );
}
function formatPhoneDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (/[\s()-]/.test(trimmed)) return trimmed;
  if (/^\+1\d{10}$/.test(trimmed)) {
    return `+1 ${trimmed.slice(2, 5)} ${trimmed.slice(5, 8)} ${trimmed.slice(8)}`;
  }
  if (/^\+\d{11}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6, 9)} ${trimmed.slice(9)}`;
  }
  if (/^\+\d{12}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6, 9)} ${trimmed.slice(9)}`;
  }
  if (/^\+\d{7,15}$/.test(trimmed)) {
    const cc = trimmed.slice(0, 3);
    const rest = trimmed.slice(3).replace(/(\d{3})(?=\d)/g, "$1 ");
    return `${cc} ${rest}`;
  }
  if (/^\d{9}$/.test(trimmed)) {
    return `${trimmed.slice(0, 3)} ${trimmed.slice(3, 6)} ${trimmed.slice(6)}`;
  }
  return trimmed;
}

function Contact({
  contact,
  copy,
}: {
  contact: SiteConfig["contacts"][number];
  copy: SiteConfig["copy"];
}) {
  const clipboard = useClipboard({ timeout: 2000 });
  return (
    <Stack gap="sm">
      <Text fw={600}>{contact.name}</Text>
      <Anchor href={`tel:${contact.phone}`}>
        {formatPhoneDisplay(contact.phone)}
      </Anchor>
      <Group>
        <Button component="a" href={`tel:${contact.phone}`}>
          {copy.call}
        </Button>
        <Button component="a" variant="light" href={`sms:${contact.phone}`}>
          {copy.sms}
        </Button>
        <Button variant="subtle" onClick={() => clipboard.copy(contact.phone)}>
          {clipboard.copied ? copy.copied : copy.copyPhone}
        </Button>
      </Group>
    </Stack>
  );
}

function GallerySection({
  section,
  config,
  resolveMedia,
  interactive,
}: {
  section: Extract<SiteConfig["sections"][number], { type: "gallery" }>;
  config: SiteConfig;
  resolveMedia?: (src: string) => string;
  interactive: boolean;
}) {
  const items = section.mediaIds
    .map((id) => ({
      id,
      media: config.media.find((m) => m.id === id),
      crops: section.crops[id],
    }))
    .filter(
      (
        entry,
      ): entry is {
        id: string;
        media: MediaAsset;
        crops: DeviceCrops;
      } => Boolean(entry.media),
    );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
        openerRef.current?.focus();
      } else if (event.key === "ArrowLeft" && items.length > 1) {
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + items.length) % items.length,
        );
      } else if (event.key === "ArrowRight" && items.length > 1) {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % items.length,
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, items.length]);

  const closeLightbox = () => {
    setActiveIndex(null);
    openerRef.current?.focus();
  };

  const lightboxLabels =
    config.locale === "pl-PL"
      ? {
          dialog: section.title || "Galeria zdjęć",
          close: "Zamknij podgląd",
          prev: "Poprzednie zdjęcie",
          next: "Następne zdjęcie",
          open: (index: number, alt: string) =>
            alt ? `Powiększ zdjęcie: ${alt}` : `Powiększ zdjęcie ${index + 1}`,
        }
      : config.locale === "en-GB"
        ? {
            dialog: section.title || "Photo gallery",
            close: "Close preview",
            prev: "Previous photo",
            next: "Next photo",
            open: (index: number, alt: string) =>
              alt ? `Open photo: ${alt}` : `Open photo ${index + 1}`,
          }
        : {
            dialog: section.title || "Fotogalerie",
            close: "Vorschau schließen",
            prev: "Vorheriges Foto",
            next: "Nächstes Foto",
            open: (index: number, alt: string) =>
              alt ? `Foto öffnen: ${alt}` : `Foto ${index + 1} öffnen`,
          };

  const activeItem =
    interactive && activeIndex !== null ? items[activeIndex] : undefined;

  return (
    <>
      <S.Gallery
        data-count={items.length}
        data-odd-many={
          items.length >= 5 && items.length % 2 === 1 ? "true" : undefined
        }
      >
        {items.map((item, index) =>
          interactive ? (
            <S.GalleryButton
              key={item.id}
              type="button"
              aria-label={lightboxLabels.open(index, item.media.alt)}
              onClick={(event) => {
                openerRef.current = event.currentTarget;
                setActiveIndex(index);
              }}
            >
              <Photo
                crops={item.crops}
                media={item.media}
                resolveMedia={resolveMedia}
              />
            </S.GalleryButton>
          ) : (
            <Photo
              key={item.id}
              crops={item.crops}
              media={item.media}
              resolveMedia={resolveMedia}
            />
          ),
        )}
      </S.Gallery>
      {activeItem && activeIndex !== null ? (
        <S.Lightbox
          role="dialog"
          aria-modal="true"
          aria-label={lightboxLabels.dialog}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeLightbox();
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            className="lightbox-close"
            aria-label={lightboxLabels.close}
            onClick={closeLightbox}
          >
            ×
          </button>
          <div className="lightbox-stage">
            <figure className="lightbox-figure">
              <img
                src={resolveMediaSrc(activeItem.media.src, resolveMedia)}
                srcSet={buildMediaSrcSet(activeItem.media, resolveMedia)}
                sizes="90vw"
                alt={activeItem.media.alt}
                width={activeItem.media.width}
                height={activeItem.media.height}
                decoding="async"
              />
            </figure>
            <div className="lightbox-meta">
              {items.length > 1 ? (
                <div className="lightbox-controls">
                  <button
                    type="button"
                    aria-label={lightboxLabels.prev}
                    onClick={() =>
                      setActiveIndex(
                        (activeIndex - 1 + items.length) % items.length,
                      )
                    }
                  >
                    ←
                  </button>
                  <span>
                    {activeIndex + 1} / {items.length}
                  </span>
                  <button
                    type="button"
                    aria-label={lightboxLabels.next}
                    onClick={() =>
                      setActiveIndex((activeIndex + 1) % items.length)
                    }
                  >
                    →
                  </button>
                </div>
              ) : (
                <span>
                  {activeIndex + 1} / {items.length}
                </span>
              )}
              {activeItem.media.alt ? (
                <span>{activeItem.media.alt}</span>
              ) : null}
            </div>
          </div>
        </S.Lightbox>
      ) : null}
    </>
  );
}
export function CalendarMenu({
  config,
  icsHref,
  position = "bottom-end",
  children,
}: {
  config: SiteConfig;
  icsHref: string;
  position?: "bottom-end" | "bottom-start";
  children: ReactNode;
}) {
  const links = calendarLinks(config);
  const items =
    config.locale === "de-DE"
      ? {
          google: "Google Kalender",
          outlook: "Outlook",
          apple: "Apple Kalender (.ics)",
        }
      : {
          google: "Google Calendar",
          outlook: "Outlook",
          apple: "Apple Calendar (.ics)",
        };
  return (
    <Menu position={position} shadow="md" withinPortal={false}>
      <Menu.Target>{children}</Menu.Target>
      <Menu.Dropdown>
        {links && (
          <>
            <Menu.Item
              component="a"
              href={links.google}
              target="_blank"
              rel="noopener noreferrer"
            >
              {items.google}
            </Menu.Item>
            <Menu.Item
              component="a"
              href={links.outlook}
              target="_blank"
              rel="noopener noreferrer"
            >
              {items.outlook}
            </Menu.Item>
          </>
        )}
        <Menu.Item component="a" href={icsHref}>
          {items.apple}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
export function Invitation({
  config,
  variantId,
  resolveMedia,
  onEditSection,
  focusSection,
  calendarHref,
  createHref,
  children,
}: {
  config: SiteConfig;
  variantId?: string;
  onEditSection?: (id: string) => void;
  resolveMedia?: (src: string) => string;
  focusSection?: string;
  calendarHref?: string;
  createHref?: string;
  children?: ReactNode;
}) {
  const variant = config.variants.find(
    (v) => v.id === (variantId || config.defaultVariant),
  )!;
  const hero = config.media.find((m) => m.id === config.hero.mediaId);
  const mobile = config.media.find((m) => m.id === config.hero.mobileMediaId);
  const tablet = config.media.find((m) => m.id === config.hero.tabletMediaId);
  const sections = visibleSections(config, variant);
  const showHero = !focusSection || focusSection === "hero";
  const showMain =
    !focusSection || (focusSection !== "hero" && focusSection !== "footer");
  const showFooter =
    (!focusSection || focusSection === "footer") &&
    Boolean(config.copy.footer || (!focusSection && createHref));
  const renderedSections =
    focusSection && showMain
      ? config.sections.filter((section) => section.id === focusSection)
      : sections;
  const orphanVenueIds = new Set<string>();
  for (let i = 0; i < renderedSections.length;) {
    if (renderedSections[i].type !== "venue") {
      i += 1;
      continue;
    }
    let end = i;
    while (
      end < renderedSections.length &&
      renderedSections[end].type === "venue"
    ) {
      end += 1;
    }
    if ((end - i) % 2 === 1) {
      orphanVenueIds.add(renderedSections[end - 1].id);
    }
    i = end;
  }
  const events = variant.eventIds
    .map((id) => config.events.find((e) => e.id === id)!)
    .filter(Boolean);
  const hasChildren = Children.toArray(children).length > 0;
  const motionRef = useInvitationMotion(
    `${variant.id}:${sections.map((section) => section.id).join(":")}:${hasChildren}`,
  );
  const colors = {
    "--paper": config.design.paper,
    "--surface": config.design.surface,
    "--ink": config.design.ink,
    "--accent": config.design.accent,
    "--on-accent": textOnColor(config.design.accent),
  } as CSSProperties;
  const labels =
    config.locale === "pl-PL"
      ? {
          respond: "Potwierdź obecność",
          contact: "Skontaktuj się",
          details: "Zobacz szczegóły",
          navigation: "Nawigacja zaproszenia",
          calendar: "Dodaj do kalendarza",
          createOwn: "Stwórz swoje zaproszenie",
        }
      : config.locale === "en-GB"
        ? {
            respond: "RSVP",
            contact: "Get in touch",
            details: "View details",
            navigation: "Invitation navigation",
            calendar: "Add to calendar",
            createOwn: "Create your invitation",
          }
        : {
            respond: "Teilnahme bestätigen",
            contact: "Kontakt aufnehmen",
            details: "Details ansehen",
            navigation: "Einladungsnavigation",
            calendar: "Zum Kalender hinzufügen",
            createOwn: "Eigene Einladung erstellen",
          };
  const response = hasChildren;
  const contact = sections.find(
    (section) =>
      section.type === "contact" && (section.contactIds.length || section.body),
  );
  const actionTarget = response
    ? "invitation-response"
    : contact
      ? `section-${contact.id}`
      : sections[0]
        ? `section-${sections[0].id}`
        : undefined;
  const actionLabel = response
    ? labels.respond
    : contact
      ? labels.contact
      : labels.details;
  const navigation = [
    sections.find((section) => section.type === "timeline"),
    sections.find((section) => section.type === "venue"),
  ].filter((section) => section !== undefined);
  const colorScheme = isDarkColor(config.design.paper) ? "dark" : "light";
  const heading = config.identity.displayName || config.hero.title;
  const dateLabel = variant.dateLabel || config.hero.dateLabel;
  if (
    !focusSection &&
    !config.identity.displayName &&
    !config.hero.title &&
    !config.hero.description &&
    !config.hero.eyebrow &&
    !hero &&
    !sections.length &&
    !hasChildren
  ) {
    return (
      <InvitationProvider config={config}>
        <S.ThemedInvitation
          ref={motionRef}
          p="xl"
          data-theme={config.theme}
          data-color-scheme={colorScheme}
          data-decorations={config.appearance.decorations}
          style={colors}
        >
          <Text c="dimmed">
            {config.locale === "pl-PL"
              ? "Puste zaproszenie. Dodaj główny napis i treść w edytorze."
              : config.locale === "en-GB"
                ? "Blank invitation. Add a main heading and content in the editor."
                : "Leere Einladung. Ergänze eine Überschrift und Inhalte im Editor."}
          </Text>
        </S.ThemedInvitation>
      </InvitationProvider>
    );
  }
  return (
    <InvitationProvider config={config}>
      <S.ThemedInvitation
        ref={motionRef}
        data-theme={config.theme}
        data-color-scheme={colorScheme}
        data-decorations={config.appearance.decorations}
        style={colors}
      >
        {!focusSection && <S.ReadingProgress aria-hidden="true" />}
        {!focusSection && (
          <S.InvitationHeader>
            <span>{config.identity.displayName || config.hero.eyebrow}</span>
            {navigation.length || actionTarget || calendarHref ? (
              <nav aria-label={labels.navigation}>
                {navigation
                  .filter((section) => `section-${section.id}` !== actionTarget)
                  .map((section) => (
                    <a key={section.id} href={`#section-${section.id}`}>
                      {section.title}
                    </a>
                  ))}
                {calendarHref && (
                  <CalendarMenu config={config} icsHref={calendarHref}>
                    <button
                      type="button"
                      data-calendar=""
                      aria-label={labels.calendar}
                      title={labels.calendar}
                    >
                      <CalendarPlusIcon size={18} aria-hidden="true" />
                    </button>
                  </CalendarMenu>
                )}
                {actionTarget && (
                  <a href={`#${actionTarget}`}>
                    {actionLabel} <span aria-hidden="true">↗</span>
                  </a>
                )}
              </nav>
            ) : null}
          </S.InvitationHeader>
        )}
        {showHero && (
          <S.InvitationHero
            data-layout={config.hero.layout}
            data-has-photo={Boolean(hero)}
          >
            {onEditSection && (
              <PreviewEditButton
                title="Nagłówek"
                onClick={() => onEditSection("hero")}
              />
            )}
            <S.InvitationHeroCopy>
              <ThemeOrnament config={config} />
              {config.hero.eyebrow && (
                <S.InvitationEyebrow>{config.hero.eyebrow}</S.InvitationEyebrow>
              )}
              {heading && (
                <Title order={1} data-long={heading.length > 32}>
                  {heading.split(/( & )/).map((part, index) =>
                    part === " & " ? (
                      <span key={index} className="title-ampersand">
                        {part}
                      </span>
                    ) : (
                      part
                    ),
                  )}
                </Title>
              )}
              {config.identity.displayName && config.hero.title && (
                <S.InvitationTagline order={2}>
                  {config.hero.title}
                </S.InvitationTagline>
              )}
              {config.hero.description && (
                <S.InvitationProse>{config.hero.description}</S.InvitationProse>
              )}
              {dateLabel && <S.HeroDate>{dateLabel}</S.HeroDate>}
              {actionTarget && (
                <S.HeroAction href={`#${actionTarget}`}>
                  {actionLabel}
                  <span aria-hidden="true">↗</span>
                </S.HeroAction>
              )}
            </S.InvitationHeroCopy>
            {hero && (
              <S.InvitationHeroPhoto>
                <Photo
                  crops={config.hero.crops}
                  tablet={tablet}
                  media={hero}
                  mobile={mobile}
                  resolveMedia={resolveMedia}
                  hero
                  heroLayout={config.hero.layout}
                />
              </S.InvitationHeroPhoto>
            )}
          </S.InvitationHero>
        )}
        {showHero && config.theme === "editorial" && dateLabel && (
          <S.DateBand>{dateLabel}</S.DateBand>
        )}
        {showMain && (
          <S.InvitationMain>
            <S.SectionGrid>
              {renderedSections.map((section, index) => (
                <S.InvitationSection
                  component="section"
                  key={section.id}
                  id={`section-${section.id}`}
                  data-kind={section.type}
                  data-span={
                    orphanVenueIds.has(section.id) ? "full" : undefined
                  }
                >
                  {onEditSection && (
                    <PreviewEditButton
                      title={section.title}
                      onClick={() => onEditSection(section.id)}
                    />
                  )}
                  <S.SectionHeading
                    data-has-icon={config.appearance.icons || undefined}
                  >
                    <span aria-hidden="true">
                      {config.theme === "editorial"
                        ? `[${String(index + 1).padStart(2, "0")}]`
                        : `${String(index + 1).padStart(2, "0")} /`}
                    </span>
                    {config.appearance.icons && (
                      <SectionIcon kind={section.type} theme={config.theme} />
                    )}
                    <Title order={2} size="h3">
                      {section.title}
                    </Title>
                  </S.SectionHeading>
                  {section.body ? (
                    <S.InvitationProse mb="lg">
                      {section.body}
                    </S.InvitationProse>
                  ) : null}
                  {section.type === "timeline" ? (
                    <S.Schedule>
                      {section.eventIds
                        .map((id) => events.find((e) => e.id === id))
                        .filter((e): e is SiteConfig["events"][number] => !!e)
                        .map((event) => {
                          return (
                            <li key={event.id}>
                              <Text
                                component="span"
                                className="event-time"
                                fw={600}
                              >
                                {event.time}
                              </Text>
                              <div>
                                <Title order={3} size="h2">
                                  {event.title}
                                </Title>
                                <Text size="sm" c="dimmed">
                                  {event.dateLabel ||
                                    (event.date
                                      ? new Intl.DateTimeFormat(config.locale, {
                                          day: "numeric",
                                          month: "long",
                                          timeZone: config.timeZone,
                                        }).format(
                                          new Date(`${event.date}T12:00:00Z`),
                                        )
                                      : "")}
                                </Text>
                                {event.url ? (
                                  <Anchor
                                    href={event.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    {config.copy.eventLink}
                                  </Anchor>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                    </S.Schedule>
                  ) : null}
                  {section.type === "venue" ? (
                    <Venue
                      venue={config.venues.find(
                        (v) => v.id === section.venueId,
                      )!}
                      config={config}
                    />
                  ) : null}
                  {section.type === "contact" ? (
                    <S.ContactGrid>
                      {section.contactIds
                        .map((id) => config.contacts.find((c) => c.id === id)!)
                        .filter(Boolean)
                        .map((contact) => (
                          <Contact
                            key={contact.id}
                            contact={contact}
                            copy={config.copy}
                          />
                        ))}
                    </S.ContactGrid>
                  ) : null}
                  {section.type === "gallery" ? (
                    <GallerySection
                      section={section}
                      config={config}
                      resolveMedia={resolveMedia}
                      interactive={!onEditSection}
                    />
                  ) : null}
                </S.InvitationSection>
              ))}
            </S.SectionGrid>
          </S.InvitationMain>
        )}
        {!focusSection && hasChildren && (
          <S.InvitationResponse id="invitation-response">
            {children}
          </S.InvitationResponse>
        )}
        {showFooter ? (
          <S.InvitationFooter>
            {config.copy.footer ? <Text>{config.copy.footer}</Text> : null}
            {!focusSection && createHref ? (
              <S.InvitationFooterPromo
                href={createHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {labels.createOwn}
              </S.InvitationFooterPromo>
            ) : null}
          </S.InvitationFooter>
        ) : focusSection === "footer" ? (
          <S.InvitationFooter>
            <Text c="dimmed">
              {config.locale === "pl-PL"
                ? "Stopka jest pusta."
                : config.locale === "en-GB"
                  ? "Footer is empty."
                  : "Fußzeile ist leer."}
            </Text>
          </S.InvitationFooter>
        ) : null}
      </S.ThemedInvitation>
    </InvitationProvider>
  );
}

function SectionIcon({
  kind,
  theme,
}: {
  kind: SiteConfig["sections"][number]["type"];
  theme: SiteConfig["theme"];
}) {
  const Icon = {
    text: EnvelopeOpenIcon,
    timeline: ClockIcon,
    venue: MapPinIcon,
    contact: ChatCircleIcon,
    gallery: ImagesIcon,
  }[kind];
  return (
    <Icon
      aria-hidden="true"
      size={26}
      weight={theme === "celebration" ? "duotone" : "thin"}
      style={{ color: "var(--accent)", flexShrink: 0 }}
    />
  );
}
function ThemeOrnament({ config }: { config: SiteConfig }) {
  if (config.appearance.decorations === "none") return null;
  if (config.theme === "botanical")
    return (
      <S.Ornament aria-hidden="true">
        <svg viewBox="0 0 180 160" fill="none">
          <path
            d="M38 144C60 107 88 70 139 24M64 108C38 110 30 92 27 78C49 78 67 89 64 108ZM82 85C74 61 84 40 97 35C105 59 98 76 82 85ZM98 67C120 78 141 67 148 55C127 46 107 53 98 67ZM118 45C107 29 113 13 124 5C135 21 131 37 118 45ZM54 122C75 127 97 118 103 103C81 96 62 107 54 122Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      </S.Ornament>
    );
  const Icon = config.theme === "celebration" ? SparkleIcon : DiamondIcon;
  return (
    <S.Ornament aria-hidden="true">
      <span />
      <Icon size={32} weight="thin" />
      <span />
    </S.Ornament>
  );
}
