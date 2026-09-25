import { Dashboard } from "../components/Dashboard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ emailConfirmed?: string }>;
}) {
  const { emailConfirmed } = await searchParams;
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return (
    <Dashboard
      configured={configured}
      emailConfirmed={emailConfirmed === "1"}
    />
  );
}
