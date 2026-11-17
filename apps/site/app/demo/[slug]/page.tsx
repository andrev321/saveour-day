import { notFound } from "next/navigation";
import { Invitation } from "@invitations/renderer";
import { createDemo } from "@invitations/domain/demo";
import { guestContent } from "@invitations/domain/guest";
import { themes, themeNames } from "@invitations/domain";
export default async function Demo({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { slug } = await params;
  const config = createDemo();
  const { theme } = await searchParams;
  const selected = themeNames.find((id) => id === theme);
  if (selected) {
    config.theme = selected;
    config.design = { ...themes[selected].design };
    config.appearance = { ...themes[selected].appearance };
    config.hero.layout = themes[selected].layout;
  }
  config.variants.push({ ...config.variants[0], id: "full", slug: "pelna" });
  config.variants.push({
    ...config.variants[0],
    id: "limited",
    slug: "ograniczona",
    eventIds: ["ceremony"],
    sections: config.variants[0].sections.map((p) => ({
      ...p,
      visible: p.sectionId !== "party",
    })),
  });
  const normalizedSlug =
    slug === "main"
      ? "glowna"
      : slug === "full"
        ? "pelna"
        : slug === "limited"
          ? "ograniczona"
          : slug;
  const variant = config.variants.find(
    (v) => v.slug === normalizedSlug || v.slug === slug || v.id === slug,
  );
  if (!variant) notFound();
  return <Invitation config={guestContent(config, variant.id)} />;
}
