import { notFound } from "next/navigation";
import { Dashboard } from "../../../components/Dashboard";
export const dynamic = "force-dynamic";
export default function ProjectDemo() {
  if (
    process.env.VERCEL ||
    (process.env.NODE_ENV === "production" && process.env.E2E_DEMO !== "1")
  )
    notFound();
  return <Dashboard configured />;
}
