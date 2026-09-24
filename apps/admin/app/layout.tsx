import "@mantine/core/styles.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/playfair-display/latin-ext-500.css";
import "@fontsource/playfair-display/latin-ext-600.css";
import "@invitations/renderer/styles.css";
import "./styles.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { PanelI18nProvider } from "../lib/i18n";
import { PanelTheme } from "../components/PanelTheme";
export const metadata = {
  title: "Pracownia zaproszeń",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body>
        <PanelTheme>
          <PanelI18nProvider>{children}</PanelI18nProvider>
        </PanelTheme>
      </body>
    </html>
  );
}
