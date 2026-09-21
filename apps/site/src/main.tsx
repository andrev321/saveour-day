import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Invitation } from "@wedding/renderer";
import { parseSiteConfig } from "@wedding/domain";
import configInput from "virtual:site-config";
import "@mantine/core/styles.css";
import "@fontsource/inter/latin-ext-400.css";
import "@fontsource/inter/latin-ext-600.css";
import "@fontsource/cormorant-garamond/latin-ext-500.css";
import "@wedding/renderer/styles.css";

const config = parseSiteConfig(configInput);
const defaultSlug = config.variants.find(
  (v) => v.id === config.defaultVariant,
)!.slug;
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {config.variants.map((variant) => (
          <Route
            key={variant.id}
            path={`/${variant.slug}`}
            element={<Invitation config={config} variantId={variant.id} />}
          />
        ))}
        <Route path="*" element={<Navigate to={`/${defaultSlug}`} replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
