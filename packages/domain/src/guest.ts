import { visibleSections, type SiteConfig } from "./index";
import { questionAnswerInputSchema } from "./rsvp-questions";
import { z } from "zod";

export const rsvpSchema = z.object({
  revision: z.number().int().nonnegative(),
  note: z.string().max(2000),
  answers: z
    .array(
      z.object({
        guestId: z.uuid(),
        eventId: z.string().min(1).max(64),
        attending: z.boolean(),
      }),
    )
    .max(1000),
  companionNames: z
    .record(z.uuid(), z.string().trim().max(200).nullable())
    .optional(),
  questionAnswers: z.array(questionAnswerInputSchema).max(500).optional(),
});

export const guestLookupSchema = z.object({
  query: z.string().trim().min(1).max(200),
  disambiguator: z.string().trim().max(200).optional(),
});

export const selfRegisterSchema = z.object({
  name: z.string().trim().min(1).max(200),
  withCompanion: z.boolean().default(false),
  companionName: z.string().trim().max(200).nullable().optional(),
  rsvp: rsvpSchema,
});

/** Only this projection may cross the guest boundary. Never send the editor config. */
export type GuestContent = SiteConfig & { audience: "guest" };
export function guestContent(
  config: SiteConfig,
  variantId: string,
): GuestContent {
  const variant = config.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error("Wariant nie istnieje w opublikowanej wersji");
  const events = variant.eventIds
    .map((id) => config.events.find((e) => e.id === id)!)
    .filter(Boolean);
  const sections = visibleSections(config, variant).map((s) =>
    s.type === "timeline"
      ? {
          ...s,
          eventIds: s.eventIds.filter((id) => variant.eventIds.includes(id)),
        }
      : s,
  );
  const venues = new Set([
    ...events.map((e) => e.venueId),
    ...sections.flatMap((s) => (s.type === "venue" ? [s.venueId] : [])),
  ]);
  const media = new Set([
    config.hero.mediaId,
    config.hero.mobileMediaId,
    config.hero.tabletMediaId,
    ...sections.flatMap((s) => (s.type === "gallery" ? s.mediaIds : [])),
  ]);
  const contacts = new Set(
    sections.flatMap((s) => (s.type === "contact" ? s.contactIds : [])),
  );
  return {
    ...config,
    audience: "guest",
    events,
    sections,
    contacts: config.contacts.filter((c) => contacts.has(c.id)),
    venues: config.venues.filter((v) => venues.has(v.id)),
    media: config.media.filter((m) => media.has(m.id)),
    defaultVariant: variant.id,
    variants: [
      {
        ...variant,
        eventIds: events.map((e) => e.id),
        sections: sections.map((s) => ({ sectionId: s.id, visible: true })),
      },
    ],
    metadata: { title: "Zaproszenie", description: "", indexing: false },
  };
}
