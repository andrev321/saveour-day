import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/playfair-display/latin-ext-500.css";
import "@fontsource/playfair-display/latin-ext-600.css";
import "@invitations/renderer/styles.css";
import "./styles.css";
export const metadata: Metadata = {
  title: "Zaproszenie",
  robots: { index: false, follow: false },
  description: "Otwórz swoje zaproszenie",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
