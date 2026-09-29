import { notFound } from "next/navigation";
import { Dashboard } from "../../../components/Dashboard";
export default function ProjectDemo() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") notFound();
  return <Dashboard configured />;
}
