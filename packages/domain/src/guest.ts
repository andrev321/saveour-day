import { type SiteConfig } from "./index";
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
});

/** Only this projection may cross the guest boundary. Never send the editor config. */
export type GuestContent = SiteConfig & { audience: "guest" };
export function guestContent(
  config: SiteConfig,
  variantId: string,
): GuestContent {
  const variant = config.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error("Wariant nie istnieje w opublikowanej wersji");
  const main = variant.id === config.defaultVariant;
  const events = (
    main
      ? config.events
      : variant.eventIds.map((id) => config.events.find((e) => e.id === id)!)
  ).filter((e) => e && (main || !variant.hiddenEventIds.includes(e.id)));
  const sections = (
    main
      ? config.sections
      : variant.sectionIds.map((id) =>
          config.sections.find((s) => s.id === id)!,
        )
  ).filter(
    (s) => s?.enabled && (main || !variant.hiddenSectionIds.includes(s.id)),
  );
  const venues = new Set([
    ...events.map((e) => e.venueId),
    ...sections.map((s) => s.venueId),
  ]);
  const media = new Set([
    config.hero.mediaId,
    config.hero.mobileMediaId,
    config.hero.tabletMediaId,
    ...sections.flatMap((s) => s.mediaIds),
  ]);
  return {
    ...config,
    audience: "guest",
    events,
    sections,
    contacts: sections.some((s) => s.type === "contact") ? config.contacts : [],
    venues: config.venues.filter((v) => venues.has(v.id)),
    media: config.media.filter((m) => media.has(m.id)),
    defaultVariant: variant.id,
    variants: [
      {
        ...variant,
        eventIds: events.map((e) => e.id),
        sectionIds: sections.map((s) => s.id),
        hiddenEventIds: [],
        hiddenSectionIds: [],
      },
    ],
    metadata: { title: "Zaproszenie", description: "", indexing: false },
  };
}
