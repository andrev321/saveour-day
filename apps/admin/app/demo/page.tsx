import { notFound } from "next/navigation";
import { DemoWorkspace } from "../../components/DemoWorkspace";
export default function Demo() {
  if (process.env.VERCEL || process.env.NODE_ENV === "production") notFound();
  return <DemoWorkspace />;
}
