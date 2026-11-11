import type { Metadata } from "next";
import { PrivacyContent } from "../../components/PrivacyContent";

export const metadata: Metadata = {
  title: "Polityka prywatności / Privacy Policy — saveour.day",
  description:
    "Polityka prywatności serwisu saveour.day oraz zasady przetwarzania danych użytkowników Google OAuth. Privacy Policy and Google User Data compliance.",
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const { lang } = (await searchParams) ?? {};
  return <PrivacyContent initialLang={lang === "en" ? "en" : "pl"} />;
}
