import { notFound } from "next/navigation";
import { createDemo } from "@wedding/domain/demo";
import { Editor } from "../../components/Editor";
export default function Demo() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") notFound();
  const config = createDemo();
  return (
    <Editor
      demo
      initial={{
        site: { id: config.id, name: "Przykładowe zaproszenie" },
        draft: { config, revision: 1 },
        deployments: [],
        releases: [],
        media: [],
        urls: {},
      }}
    />
  );
}
