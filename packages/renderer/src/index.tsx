"use client";
import { useState, type CSSProperties } from "react";
import {
  Anchor,
  Box,
  Button,
  Card,
  Container,
  Group,
  MantineProvider,
  SimpleGrid,
  Stack,
  Text,
  Timeline,
  Title,
  createTheme,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import {
  navigationUrl,
  type SiteConfig,
  type MediaAsset,
} from "@wedding/domain";

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
  const theme = createTheme({
    colors: { wedding: createAccentPalette(config.design.accent) },
    primaryColor: "wedding",
    primaryShade: 6,
    fontFamily: "Inter, sans-serif",
    headings: {
      fontFamily: "Playfair Display, Georgia, serif",
      fontWeight: "500",
    },
    defaultRadius: "lg",
    components: {
      Button: Button.extend({
        defaultProps: { radius: "xl", size: "md", autoContrast: true },
      }),
    },
  });
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
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
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <Box
        className="invitation-photo-fallback"
        role={media.alt ? "img" : undefined}
        aria-label={media.alt || undefined}
      />
    );
  return (
    <picture>
      {mobile ? (
        <source media="(max-width: 47.99em)" srcSet={resolve(mobile.src)} />
      ) : null}
      <img
        className="invitation-photo"
        src={resolve(media.src)}
        srcSet={
          media.variants.length
            ? media.variants
                .map((v) => `${resolve(v.src)} ${v.width}w`)
                .join(", ")
            : undefined
        }
        sizes="(max-width: 48em) 100vw, 60vw"
        alt={media.alt}
        width={media.width}
        height={media.height}
        loading={hero ? "eager" : "lazy"}
        fetchPriority={hero ? "high" : "auto"}
        onError={() => setFailed(true)}
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
        <Text className="invitation-prose">{venue.description}</Text>
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
        <iframe
          src={venue.mapUrl}
          title={venue.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="invitation-map"
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
  const sections = variant.sectionIds
    .map((id) => config.sections.find((s) => s.id === id)!)
    .filter((s) => s.enabled);
  return (
    <InvitationProvider config={config}>
      <Box
        className="invitation"
        style={
          {
            "--paper": config.design.paper,
            "--surface": config.design.surface,
            "--ink": config.design.ink,
            "--accent": config.design.accent,
          } as CSSProperties
        }
      >
        <Container size="xl" py="lg">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              {config.couple.firstName} & {config.couple.secondName}
            </Text>
            <Text size="sm">{variant.dateLabel || config.hero.dateLabel}</Text>
          </Group>
        </Container>
        <section className={`invitation-hero hero-${config.hero.layout}`}>
          <div className="invitation-hero-photo">
            {hero ? (
              <Photo
                media={hero}
                mobile={mobile}
                resolveMedia={resolveMedia}
                hero
              />
            ) : (
              <div className="invitation-photo-fallback" />
            )}
          </div>
          <div className="invitation-hero-copy">
            <Text className="invitation-eyebrow">{config.hero.eyebrow}</Text>
            <Title order={1}>
              {config.couple.firstName}
              <span> & </span>
              {config.couple.secondName}
            </Title>
            <Title order={2} className="invitation-tagline">
              {config.hero.title}
            </Title>
            <Text className="invitation-prose">{config.hero.description}</Text>
            <Text fw={600} mt="xl">
              {variant.dateLabel || config.hero.dateLabel}
            </Text>
          </div>
        </section>
        <Container component="main" size="lg" py={{ base: 32, md: 64 }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {sections.map((section) => (
              <Card
                component="section"
                key={section.id}
                withBorder
                p={{ base: "lg", sm: "xl" }}
                className={`invitation-section section-${section.type}`}
              >
                <Text className="invitation-eyebrow" mb="md">
                  {section.title}
                </Text>
                {section.body ? (
                  <Text mb="lg" className="invitation-prose">
                    {section.body}
                  </Text>
                ) : null}
                {section.type === "timeline" ? (
                  <Timeline active={-1} bulletSize={14} lineWidth={1}>
                    {variant.eventIds.map((id) => {
                      const event = config.events.find((e) => e.id === id)!;
                      return (
                        <Timeline.Item
                          key={id}
                          title={<Text fw={600}>{event.time}</Text>}
                        >
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
                                  }).format(new Date(`${event.date}T12:00:00Z`))
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
                        </Timeline.Item>
                      );
                    })}
                  </Timeline>
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
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {section.mediaIds.map((id) => (
                      <Photo
                        key={id}
                        media={config.media.find((m) => m.id === id)!}
                        resolveMedia={resolveMedia}
                      />
                    ))}
                  </SimpleGrid>
                ) : null}
              </Card>
            ))}
          </SimpleGrid>
        </Container>
        <Container component="footer" ta="center" py="xl">
          <Text>{config.copy.footer}</Text>
        </Container>
      </Box>
    </InvitationProvider>
  );
}
