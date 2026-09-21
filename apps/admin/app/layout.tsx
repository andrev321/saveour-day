import "@mantine/core/styles.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/playfair-display/latin-ext-500.css";
import "@fontsource/playfair-display/latin-ext-600.css";
import "@wedding/renderer/styles.css";
import "./styles.css";
import {
  MantineProvider,
  ColorSchemeScript,
  mantineHtmlProps,
} from "@mantine/core";
import { PanelI18nProvider } from "../lib/i18n";
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
        <MantineProvider forceColorScheme="light">
          <PanelI18nProvider>{children}</PanelI18nProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
