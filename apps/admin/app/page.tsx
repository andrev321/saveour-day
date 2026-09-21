import { Dashboard } from "../components/Dashboard";
export default function Page() {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
  return <Dashboard configured={configured} />;
}
