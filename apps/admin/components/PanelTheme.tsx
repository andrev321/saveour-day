"use client";
import {
  MantineProvider,
  Loader,
  Modal,
  Drawer,
  createTheme,
} from "@mantine/core";
import { IconContext } from "@phosphor-icons/react";
import { ToastViewport } from "@invitations/ui/toast";
import { useMemo, type ReactNode } from "react";
import { usePanelI18n, type PanelLanguage } from "../lib/i18n";

const closeLabels: Record<PanelLanguage, string> = {
  pl: "Zamknij",
  en: "Close",
  de: "Schließen",
};

function createPanelTheme(closeLabel: string) {
  return createTheme({
    respectReducedMotion: true,
    spacing: {
      xs: "0.5rem",
      sm: "0.625rem",
      md: "0.75rem",
      lg: "1rem",
      xl: "1.5rem",
    },
    components: {
      Loader: Loader.extend({ defaultProps: { type: "dots" } }),
      Modal: Modal.extend({
        defaultProps: {
          closeButtonProps: { "aria-label": closeLabel },
          transitionProps: {
            transition: "fade-up",
            duration: 200,
            timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        },
        styles: (_theme, props) =>
          props.fullScreen
            ? {}
            : {
                content: {
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                },
                header: {
                  flexShrink: 0,
                },
                body: {
                  flex: "1 1 auto",
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                },
              },
      }),
      Drawer: Drawer.extend({
        defaultProps: {
          closeButtonProps: { "aria-label": closeLabel },
          transitionProps: {
            duration: 240,
            timingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        },
      }),
    },
    black: "#242B59",
    primaryColor: "brand",
    primaryShade: { light: 6, dark: 5 },
    luminanceThreshold: 0.35,
    autoContrast: true,
    colors: {
      dark: [
        "#E8EDF7",
        "#CBD5E6",
        "#AAB8CF",
        "#8799B6",
        "#52627B",
        "#3B4961",
        "#273449",
        "#1C2739",
        "#151E2D",
        "#101724",
      ],
      brand: [
        "#F1F4FC",
        "#E1E8F8",
        "#CDDAF4",
        "#AABDE5",
        "#819BCF",
        "#465D9C",
        "#3D518B",
        "#304176",
        "#242B59",
        "#1A2145",
      ],
    },
    fontFamily: "Inter, sans-serif",
    headings: { fontFamily: "Inter, sans-serif" },
    defaultRadius: "md",
  });
}
const icons = { weight: "duotone" as const };
export function PanelTheme({ children }: { children: ReactNode }) {
  const { language } = usePanelI18n();
  const theme = useMemo(
    () => createPanelTheme(closeLabels[language]),
    [language],
  );
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <ToastViewport />
      <IconContext.Provider value={icons}>{children}</IconContext.Provider>
    </MantineProvider>
  );
}
