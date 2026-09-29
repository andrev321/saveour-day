"use client";
import {
  navigationUrl,
  themes,
  type MediaAsset,
  type SiteConfig,
} from "@invitations/domain";
import {
  Anchor,
  Button,
  Container,
  Group,
  MantineProvider,
  Stack,
  Text,
  Title,
  createTheme,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { useState, type CSSProperties } from "react";
import * as S from "./styles";
import {
  ClockIcon,
  MapPinIcon,
  ChatCircleIcon,
  ImagesIcon,
  EnvelopeOpenIcon,
  LeafIcon,
  SparkleIcon,
  DiamondIcon,
} from "@phosphor-icons/react";

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
      fontWeight: "600",
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
      forceColorScheme={config.theme === "evening" ? "dark" : "light"}
    >
      {children}
    </MantineProvider>
  );
}
function Photo({
  media,
  mobile,
  resolveMedia,
  hero = false,
}: {
  media: MediaAsset;
  mobile?: MediaAsset;
  resolveMedia?: (src: string) => string;
  hero?: boolean;
}) {
  const resolve = resolveMedia || ((src: string) => src);
  const src = resolve(media.src);
  const mobileSrc = mobile ? resolve(mobile.src) : undefined;
  const srcSet = media.variants.length
    ? media.variants.map((v) => `${resolve(v.src)} ${v.width}w`).join(", ")
    : undefined;
  const sourceKey = JSON.stringify([media.id, src, mobileSrc, srcSet]);
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
            "--focal": `${media.focalX}% ${media.focalY}%`,
            "--mobile-focal": `${mobile?.mobileFocalX ?? media.mobileFocalX}% ${mobile?.mobileFocalY ?? media.mobileFocalY}%`,
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
}: {
  config: SiteConfig;
  variantId?: string;
  resolveMedia?: (src: string) => string;
}) {
  const variant = config.variants.find(
    (v) => v.id === (variantId || config.defaultVariant),
  )!;
  const hero = config.media.find((m) => m.id === config.hero.mediaId);
  const mobile = config.media.find((m) => m.id === config.hero.mobileMediaId);
  const isMainPage = variant.id === config.defaultVariant;
  const sections = (
    isMainPage
      ? config.sections
      : variant.sectionIds.map((id) =>
          config.sections.find((s) => s.id === id)!,
        )
  ).filter(
    (section) =>
      section.enabled &&
      (isMainPage || !variant.hiddenSectionIds.includes(section.id)),
  );
  const events = isMainPage
    ? config.events
    : variant.eventIds
        .map((id) => config.events.find((e) => e.id === id)!)
        .filter((event) => !variant.hiddenEventIds.includes(event.id));
  const colors = {
    "--paper": config.design.paper,
    "--surface": config.design.surface,
    "--ink": config.design.ink,
    "--accent": config.design.accent,
  } as CSSProperties;
  if (
    !config.identity.displayName &&
    !config.hero.title &&
    !config.hero.description &&
    !config.hero.eyebrow &&
    !hero &&
    !sections.length
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
        <Container size="xl" py="lg">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {config.identity.displayName}
            </Text>
            <Text size="sm">{variant.dateLabel || config.hero.dateLabel}</Text>
          </Group>
        </Container>
        <S.InvitationHero
          data-layout={config.hero.layout}
          data-has-photo={Boolean(hero)}
        >
          <S.InvitationHeroPhoto>
            {hero ? (
              <Photo
                media={hero}
                mobile={mobile}
                resolveMedia={resolveMedia}
                hero
              />
            ) : (
              <S.InvitationPhotoFallback as="div" />
            )}
          </S.InvitationHeroPhoto>
          <S.InvitationHeroCopy>
            <ThemeOrnament config={config} />
            {config.hero.eyebrow && (
              <S.InvitationEyebrow>{config.hero.eyebrow}</S.InvitationEyebrow>
            )}
            {config.identity.displayName && (
              <Title order={1}>{config.identity.displayName}</Title>
            )}
            {config.hero.title && (
              <S.InvitationTagline order={2}>
                {config.hero.title}
              </S.InvitationTagline>
            )}
            {config.hero.description && (
              <S.InvitationProse>{config.hero.description}</S.InvitationProse>
            )}
            {(variant.dateLabel || config.hero.dateLabel) && (
              <Text fw={600} mt="xl">
                {variant.dateLabel || config.hero.dateLabel}
              </Text>
            )}
          </S.InvitationHeroCopy>
        </S.InvitationHero>
        <Container component="main" size="lg" py={{ base: 32, md: 64 }}>
          <S.SectionGrid>
            {sections.map((section) => (
              <S.InvitationSection
                component="section"
                key={section.id}
                withBorder
                p={{ base: "lg", sm: "xl" }}
                data-kind={section.type}
              >
                <Group gap="sm" mb="lg">
                  {config.appearance.icons && (
                    <SectionIcon kind={section.type} theme={config.theme} />
                  )}
                  <Title order={2} size="h3">
                    {section.title}
                  </Title>
                </Group>
                {section.body ? (
                  <S.InvitationProse mb="lg">{section.body}</S.InvitationProse>
                ) : null}
                {section.type === "timeline" ? (
                  <S.Schedule>
                    {events.map((event) => {
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
                    {config.contacts.map((contact) => (
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
                        media={config.media.find((m) => m.id === id)!}
                        resolveMedia={resolveMedia}
                      />
                    ))}
                  </S.Gallery>
                ) : null}
              </S.InvitationSection>
            ))}
          </S.SectionGrid>
        </Container>
        {config.copy.footer && (
          <Container component="footer" ta="center" py="xl">
            <Text>{config.copy.footer}</Text>
          </Container>
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
  const Icon =
    config.theme === "botanical"
      ? LeafIcon
      : config.theme === "celebration"
        ? SparkleIcon
        : DiamondIcon;
  return (
    <S.Ornament aria-hidden="true">
      <span />
      <Icon size={32} weight="thin" />
      <span />
    </S.Ornament>
  );
}
