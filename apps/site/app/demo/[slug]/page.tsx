import { notFound } from "next/navigation";
import { Invitation } from "@invitations/renderer";
import { createDemo } from "@invitations/domain/demo";
import { guestContent } from "@invitations/domain/guest";
export default async function Demo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const config = createDemo();
  config.variants.push({ ...config.variants[0], id: "full", slug: "pelna" });
  config.variants.push({
    ...config.variants[0],
    id: "limited",
    slug: "ograniczona",
    hiddenEventIds: ["party"],
    hiddenSectionIds: ["party"],
  });
  const variant = config.variants.find((v) => v.slug === slug);
  if (!variant) notFound();
  return <Invitation config={guestContent(config, variant.id)} />;
}
