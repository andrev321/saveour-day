"use client";
import { MantineProvider, Loader, createTheme } from "@mantine/core";
import { IconContext } from "@phosphor-icons/react";
import type { ReactNode } from "react";

const theme = createTheme({
  respectReducedMotion: true,
  components: { Loader: Loader.extend({ defaultProps: { type: "dots" } }) },
  black: "#242B59",
  primaryColor: "brand",
  colors: {
    brand: [
      "#F1F4FC",
      "#E1E8F8",
      "#CDDAF4",
      "#AABDE5",
      "#819BCF",
      "#5D78AE",
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
const icons = { weight: "duotone" as const };
export function PanelTheme({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <IconContext.Provider value={icons}>{children}</IconContext.Provider>
    </MantineProvider>
  );
}
