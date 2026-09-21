import { z } from "zod";
import { createDemo } from "./demo.ts";
import { parseSiteConfig } from "./index.ts";

export function importLegacy(
  env: Record<string, string | undefined>,
  names: { firstName: string; secondName: string },
) {
  function read(key: string): Record<string, string> {
    if (!env[key]) return {};
    let value: unknown;
    try {
      value = JSON.parse(env[key]!);
    } catch {
      throw new Error(`${key}: nieprawidłowy JSON`);
    }
    const parsed = z.record(z.string(), z.string()).safeParse(value);
    if (!parsed.success)
      throw new Error(`${key}: wymagany obiekt zawierający tekstowe pola`);
    return parsed.data;
  }
  const common = read("VITE_CONFIG_COMMON"),
    timeline = read("VITE_CONFIG_TIMELINE");
  const reception = read("VITE_CONFIG_SLUB"),
    dinner = read("VITE_CONFIG_OBIAD");
  const grill = read("VITE_CONFIG_GRILL"),
    parking = read("VITE_CONFIG_PARKING");
  const config = createDemo("legacy");
  config.couple = names;
  config.hero.dateLabel = common.weddingDate || "Data do ustalenia";
  config.hero.description = common.description || "";
  config.metadata.title = `${names.firstName} i ${names.secondName} — zaproszenie`;
  config.contacts = common.phone
    ? [{ id: "contact", name: "Kontakt", phone: common.phone }]
    : [];
  const venue = (id: string, input: Record<string, string>) => ({
    id,
    name: input.venueName || "Miejsce do ustalenia",
    address: input.address || "",
    description: input.description || input.desc || "",
    mapUrl: input.mapSrc || "",
    navigationUrl: input.navigateUrl || "",
  });
  config.venues = [
    venue("ceremony", common),
    venue("parking", parking),
    venue("reception", reception),
    venue("dinner", dinner),
    venue("grill", grill),
  ];
  for (const place of config.venues) {
    if (
      place.mapUrl &&
      !place.mapUrl.includes("/maps/embed") &&
      !place.mapUrl.includes("output=embed")
    ) {
      place.navigationUrl ||= place.mapUrl;
      place.mapUrl = "";
    }
  }
  config.events = [
    {
      id: "ceremony",
      title: timeline.ceremonyLabel || "Ceremonia",
      time: timeline.ceremonyTime || "14:00",
      dateLabel: common.weddingDate || "",
      url: "",
      venueId: "ceremony",
    },
    {
      id: "reception",
      title: reception.timelineReceptionLabel || "Poczęstunek",
      time: reception.timelineReceptionTime || "15:00",
      dateLabel: common.weddingDate || "",
      url: "",
      venueId: "reception",
    },
    {
      id: "dinner",
      title: dinner.timelineReceptionLabel || "Obiad",
      time: dinner.timelineReceptionTime || "16:00",
      dateLabel: common.weddingDate || "",
      url: "",
      venueId: "dinner",
    },
    {
      id: "grill",
      title: grill.timelineLabel || "Grill",
      time: grill.time || "15:00",
      dateLabel: grill.date || "",
      url: grill.fbUrl || "",
      venueId: "grill",
    },
  ];
  config.sections = [
    config.sections[0]!,
    ...config.venues.map((place) => ({
      id: place.id,
      type: "venue" as const,
      title:
        place.id === "reception"
          ? reception.sectionTitle || "Poczęstunek"
          : place.name,
      body: "",
      enabled: true,
      venueId: place.id,
      mediaIds: [],
    })),
    config.sections[4]!,
  ];
  config.variants = [
    {
      id: "slub",
      slug: "slub",
      label: "Ślub",
      dateLabel: "",
      eventIds: ["ceremony", "reception"],
      sectionIds: ["timeline", "ceremony", "parking", "reception", "contact"],
      hiddenEventIds: ["dinner", "grill"],
      hiddenSectionIds: ["dinner", "grill"],
    },
    {
      id: "obiad",
      slug: "obiad",
      label: "Obiad",
      dateLabel: "",
      eventIds: ["ceremony", "reception", "dinner"],
      sectionIds: ["timeline", "ceremony", "parking", "dinner", "contact"],
      hiddenEventIds: ["grill"],
      hiddenSectionIds: ["reception", "grill"],
    },
    {
      id: "grill",
      slug: "grill",
      label: "Grill",
      dateLabel: grill.heroDate || "",
      eventIds: ["ceremony", "reception", "grill"],
      sectionIds: ["timeline", "ceremony", "parking", "grill", "contact"],
      hiddenEventIds: ["dinner"],
      hiddenSectionIds: ["reception", "dinner"],
    },
  ];
  config.defaultVariant = "slub";
  return parseSiteConfig(config);
}
