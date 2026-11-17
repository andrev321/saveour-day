import { notFound } from "next/navigation";
import { DemoWorkspace } from "../../components/DemoWorkspace";
export const dynamic = "force-dynamic";
export default function Demo() {
  if (
    process.env.VERCEL ||
    (process.env.NODE_ENV === "production" && process.env.E2E_DEMO !== "1")
  )
    notFound();
  return <DemoWorkspace />;
}
