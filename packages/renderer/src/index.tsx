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
import {
  Anchor,
  ActionIcon,
  Button,
  Group,
  MantineProvider,
  Stack,
  Text,
  Title,
  Tooltip,
  createTheme,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useState, type CSSProperties, type ReactNode } from "react";
import * as S from "./styles";
import {
  ClockIcon,
  MapPinIcon,
  ChatCircleIcon,
  ImagesIcon,
  EnvelopeOpenIcon,
  SparkleIcon,
  DiamondIcon,
  PencilSimpleIcon,
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
function Photo({
  media,
  mobile,
  tablet,
  resolveMedia,
  hero = false,
  crops = {},
}: {
  media: MediaAsset;
  mobile?: MediaAsset;
  tablet?: MediaAsset;
  resolveMedia?: (src: string) => string;
  hero?: boolean;
  crops?: DeviceCrops;
}) {
  const resolve = (src: string) =>
    isSampleMediaSource(src) ? src : (resolveMedia?.(src) ?? src);
  const src = resolve(media.src);
  const mobileSrc = mobile ? resolve(mobile.src) : undefined;
  const srcSet = media.variants.length
    ? media.variants.map((v) => `${resolve(v.src)} ${v.width}w`).join(", ")
    : undefined;
  const tabletSrc = tablet ? resolve(tablet.src) : undefined;
  const sourceKey = JSON.stringify([
    media.id,
    src,
    mobileSrc,
    tabletSrc,
    srcSet,
  ]);
  const [failedSource, setFailedSource] = useState<string | null>(null);
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
    <picture>
      {mobile ? (
        <source media="(max-width: 47.99em)" srcSet={mobileSrc} />
      ) : null}
      {tablet ? (
        <source
          media="(min-width: 48em) and (max-width: 63.99em)"
          srcSet={tabletSrc}
        />
      ) : null}
      <S.InvitationPhoto
        src={src}
        srcSet={srcSet}
        sizes="(max-width: 48em) 100vw, 60vw"
        alt={media.alt}
        width={media.width}
        height={media.height}
        loading={hero ? "eager" : "lazy"}
        fetchPriority={hero ? "high" : "auto"}
        onError={() => setFailedSource(sourceKey)}
        onLoad={() => setFailedSource(null)}
        style={
          {
            "--focal": `${crops.desktop?.x ?? 50}% ${crops.desktop?.y ?? 50}%`,
            "--tablet-focal": `${crops.tablet?.x ?? crops.desktop?.x ?? 50}% ${crops.tablet?.y ?? crops.desktop?.y ?? 50}%`,
            "--mobile-focal": `${crops.mobile?.x ?? crops.desktop?.x ?? 50}% ${crops.mobile?.y ?? crops.desktop?.y ?? 50}%`,
          } as CSSProperties
        }
      />
    </picture>
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
        <S.InvitationMap
          src={venue.mapUrl}
          title={venue.name}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
    </Stack>
  );
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
      <Anchor href={`tel:${contact.phone}`}>{contact.phone}</Anchor>
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
export function Invitation({
  config,
  variantId,
  resolveMedia,
  onEditSection,
  children,
}: {
  config: SiteConfig;
  variantId?: string;
  onEditSection?: (id: string) => void;
  resolveMedia?: (src: string) => string;
  children?: ReactNode;
}) {
  const variant = config.variants.find(
    (v) => v.id === (variantId || config.defaultVariant),
  )!;
  const hero = config.media.find((m) => m.id === config.hero.mediaId);
  const mobile = config.media.find((m) => m.id === config.hero.mobileMediaId);
  const tablet = config.media.find((m) => m.id === config.hero.tabletMediaId);
  const sections = visibleSections(config, variant);
  const events = variant.eventIds
    .map((id) => config.events.find((e) => e.id === id)!)
    .filter(Boolean);
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
        }
      : config.locale === "en-GB"
        ? {
            respond: "RSVP",
            contact: "Get in touch",
            details: "View details",
            navigation: "Invitation navigation",
          }
        : {
            respond: "Teilnahme bestätigen",
            contact: "Kontakt aufnehmen",
            details: "Details ansehen",
            navigation: "Einladungsnavigation",
          };
  const response = Boolean(children);
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
  const heading = config.identity.displayName || config.hero.title;
  const dateLabel = variant.dateLabel || config.hero.dateLabel;
  if (
    !config.identity.displayName &&
    !config.hero.title &&
    !config.hero.description &&
    !config.hero.eyebrow &&
    !hero &&
    !sections.length &&
    !children
  ) {
    return (
      <InvitationProvider config={config}>
        <S.ThemedInvitation
          p="xl"
          data-theme={config.theme}
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
        data-theme={config.theme}
        data-decorations={config.appearance.decorations}
        style={colors}
      >
        <S.InvitationHeader>
          <span>{config.identity.displayName || config.hero.eyebrow}</span>
          {navigation.length || actionTarget ? (
            <nav aria-label={labels.navigation}>
              {navigation
                .filter((section) => `section-${section.id}` !== actionTarget)
                .map((section) => (
                  <a key={section.id} href={`#section-${section.id}`}>
                    {section.title}
                  </a>
                ))}
              {actionTarget && (
                <a href={`#${actionTarget}`}>
                  {actionLabel} <span aria-hidden="true">↗</span>
                </a>
              )}
            </nav>
          ) : null}
        </S.InvitationHeader>
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
              />
            </S.InvitationHeroPhoto>
          )}
        </S.InvitationHero>
        {config.theme === "editorial" && dateLabel && (
          <S.DateBand>{dateLabel}</S.DateBand>
        )}
        <S.InvitationMain>
          <S.SectionGrid>
            {sections.map((section, index) => (
              <S.InvitationSection
                component="section"
                key={section.id}
                id={`section-${section.id}`}
                data-kind={section.type}
              >
                {onEditSection && (
                  <PreviewEditButton
                    title={section.title}
                    onClick={() => onEditSection(section.id)}
                  />
                )}
                <S.SectionHeading>
                  <span aria-hidden="true">
                    {String(index + 1).padStart(2, "0")} /
                  </span>
                  {config.appearance.icons && (
                    <SectionIcon kind={section.type} theme={config.theme} />
                  )}
                  <Title order={2} size="h3">
                    {section.title}
                  </Title>
                </S.SectionHeading>
                {section.body ? (
                  <S.InvitationProse mb="lg">{section.body}</S.InvitationProse>
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
                    venue={config.venues.find((v) => v.id === section.venueId)!}
                    config={config}
                  />
                ) : null}
                {section.type === "contact" ? (
                  <Stack gap="xl">
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
                  </Stack>
                ) : null}
                {section.type === "gallery" ? (
                  <S.Gallery>
                    {section.mediaIds.map((id) => (
                      <Photo
                        key={id}
                        crops={section.crops[id]}
                        media={config.media.find((m) => m.id === id)!}
                        resolveMedia={resolveMedia}
                      />
                    ))}
                  </S.Gallery>
                ) : null}
              </S.InvitationSection>
            ))}
          </S.SectionGrid>
        </S.InvitationMain>
        {children && (
          <S.InvitationResponse id="invitation-response">
            {children}
          </S.InvitationResponse>
        )}
        {config.copy.footer && (
          <S.InvitationFooter>
            <Text>{config.copy.footer}</Text>
          </S.InvitationFooter>
        )}
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
