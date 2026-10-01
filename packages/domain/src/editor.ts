import type { Section, SiteConfig } from "./index.ts";
export const newId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export function moveSection(
  c: SiteConfig,
  variantId: string,
  from: number,
  to: number,
): SiteConfig {
  return {
    ...c,
    variants: c.variants.map((v) => {
      if (
        v.id !== variantId ||
        from < 0 ||
        to < 0 ||
        from >= v.sections.length ||
        to >= v.sections.length
      )
        return v;
      const sections = [...v.sections];
      sections.splice(to, 0, sections.splice(from, 1)[0]);
      return { ...v, sections };
    }),
  };
}
export function detachSection(
  c: SiteConfig,
  variantId: string,
  id: string,
): SiteConfig {
  const variants = c.variants.map((v) =>
    v.id === variantId
      ? { ...v, sections: v.sections.filter((p) => p.sectionId !== id) }
      : v,
  );
  return {
    ...c,
    variants,
    sections: variants.some((v) => v.sections.some((p) => p.sectionId === id))
      ? c.sections
      : c.sections.filter((s) => s.id !== id),
  };
}
export function removeEntity(
  c: SiteConfig,
  kind: "events" | "contacts" | "venues",
  id: string,
): SiteConfig {
  const sections = c.sections.flatMap((s): Section[] => {
    if (kind === "venues" && s.type === "venue" && s.venueId === id) return [];
    if (kind === "events" && s.type === "timeline")
      return [{ ...s, eventIds: s.eventIds.filter((x) => x !== id) }];
    if (kind === "contacts" && s.type === "contact")
      return [{ ...s, contactIds: s.contactIds.filter((x) => x !== id) }];
    return [s];
  });
  return {
    ...c,
    [kind]: c[kind].filter((x) => x.id !== id),
    events:
      kind === "events"
        ? c.events.filter((x) => x.id !== id)
        : kind === "venues"
          ? c.events.map((e) =>
              e.venueId === id ? { ...e, venueId: undefined } : e,
            )
          : c.events,
    sections,
    variants: c.variants.map((v) => ({
      ...v,
      eventIds:
        kind === "events" ? v.eventIds.filter((x) => x !== id) : v.eventIds,
      sections: v.sections.filter((p) =>
        sections.some((s) => s.id === p.sectionId),
      ),
    })),
  };
}
