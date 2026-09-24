"use client";
import { MantineProvider, createTheme } from "@mantine/core";
import { IconContext } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const theme = createTheme({
  respectReducedMotion: true,
  primaryColor: "forest",
  colors: {
    forest: [
      "#f0f5ef",
      "#e2ebdf",
      "#c5d7c2",
      "#a5c0a4",
      "#83a785",
      "#648c69",
      "#35604c",
      "#2c5442",
      "#234635",
      "#173526",
    ],
  },
  fontFamily: "Inter, sans-serif",
  headings: { fontFamily: "Inter, sans-serif" },
  defaultRadius: "md",
});
const icons = { weight: "duotone" as const };
export function PanelTheme({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <IconContext.Provider value={icons}>{children}</IconContext.Provider>
    </MantineProvider>
  );
}
