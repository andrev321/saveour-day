"use client";
import { useEffect, useState } from "react";
import { siteConfigSchema, type SiteConfig } from "@wedding/domain";
import { Invitation } from "@wedding/renderer";
export default function Preview() {
  const [state, setState] = useState<{
    config: SiteConfig;
    variant?: string;
    urls: Record<string, string>;
  } | null>(null);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== window.parent ||
        e.data?.type !== "preview-config"
      )
        return;
      const result = siteConfigSchema.safeParse(e.data.config);
      if (result.success) {
        const variant = result.data.variants.some(
          (v) => v.id === e.data.variant,
        )
          ? e.data.variant
          : result.data.defaultVariant;
        setState({ config: result.data, variant, urls: e.data.urls || {} });
      }
    };
    window.addEventListener("message", listener);
    window.parent.postMessage({ type: "preview-ready" }, location.origin);
    return () => window.removeEventListener("message", listener);
  }, []);
  return state ? (
    <Invitation
      config={state.config}
      variantId={state.variant}
      resolveMedia={(src) => state.urls[src] || src}
    />
  ) : (
    <p style={{ padding: 24 }}>Oczekiwanie na prawidłową konfigurację…</p>
  );
}
