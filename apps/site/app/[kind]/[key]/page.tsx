import { notFound } from "next/navigation";
import { GuestPage } from "../../../components/GuestPage";
import { adminPanelUrl } from "../../../lib/server";
export default async function Page({
  params,
}: {
  params: Promise<{ kind: string; key: string }>;
}) {
  const { kind, key } = await params;
  if (!["i", "s", "v"].includes(kind)) notFound();
  return <GuestPage kind={kind} accessKey={key} adminUrl={adminPanelUrl()} />;
}
