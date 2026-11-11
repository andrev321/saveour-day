import type { Metadata } from "next";
import { TermsContent } from "../../components/TermsContent";

export const metadata: Metadata = {
  title: "Warunki korzystania / Terms of Service — saveour.day",
  description:
    "Warunki korzystania z platformy saveour.day — tworzenie zaproszeń okolicznościowych i obsługa RSVP. Terms of Service.",
};

export default async function TermsPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const { lang } = (await searchParams) ?? {};
  return <TermsContent initialLang={lang === "en" ? "en" : "pl"} />;
}
