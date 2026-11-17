import { notFound } from "next/navigation";
import { createDemo } from "@invitations/domain/demo";
import { mediaSchema } from "@invitations/domain";
import { Editor } from "../../../components/Editor";

export const dynamic = "force-dynamic";

export default function PhotoDemo() {
  if (
    process.env.VERCEL ||
    (process.env.NODE_ENV === "production" && process.env.E2E_DEMO !== "1")
  )
    notFound();
  const config = createDemo();
  const photo = mediaSchema.parse({
    id: "photo",
    src: "/media/library-demo.webp",
    alt: "Zdjęcie testowe",
    width: 1200,
    height: 800,
  });
  const saved = { ...photo, id: "saved", alt: "Zdjęcie z biblioteki" };
  config.media = [photo];
  config.hero.mediaId = photo.id;
  config.variants[0].sections.push({ sectionId: "gallery", visible: true });
  config.sections.push({
    id: "gallery",
    type: "gallery",
    title: "Galeria",
    body: "",
    crops: {},
    mediaIds: [photo.id],
  });
  return (
    <Editor
      demo
      initial={{
        site: { id: config.id, name: "Zdjęcia" },
        draft: { config, revision: 1 },
        releases: [],
        media: [photo, saved].map((manifest) => ({
          id: manifest.id,
          manifest,
        })),
        urls: {},
      }}
    />
  );
}
