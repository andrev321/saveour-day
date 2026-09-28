import { StyledRegistry } from "@invitations/ui/registry";
import { AdminGlobalStyles } from "../components/workspace.styles";
import "@mantine/core/styles.css";
import "@fontsource/cormorant-garamond/latin-ext-400.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-ext-600.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/dm-sans/latin-ext-400.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-ext-600.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/bodoni-moda/latin-ext-400.css";
import "@fontsource/bodoni-moda/latin-400.css";
import "@fontsource/bodoni-moda/latin-ext-600.css";
import "@fontsource/bodoni-moda/latin-600.css";
import "@fontsource/fraunces/latin-ext-400.css";
import "@fontsource/fraunces/latin-400.css";
import "@fontsource/fraunces/latin-ext-600.css";
import "@fontsource/fraunces/latin-600.css";
import "@fontsource/nunito-sans/latin-ext-400.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-ext-600.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/playfair-display/latin-ext-500.css";
import "@fontsource/playfair-display/latin-500.css";
import "@fontsource/playfair-display/latin-ext-600.css";
import "@fontsource/playfair-display/latin-600.css";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { PanelI18nProvider } from "../lib/i18n";
import { PanelTheme } from "../components/PanelTheme";
export const metadata = {
  title: "saveour.day — Pracownia zaproszeń",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript forceColorScheme="light" />
      </head>
      <body>
        <StyledRegistry>
          <AdminGlobalStyles />
          <PanelTheme>
            <PanelI18nProvider>{children}</PanelI18nProvider>
          </PanelTheme>
        </StyledRegistry>
      </body>
    </html>
  );
}
