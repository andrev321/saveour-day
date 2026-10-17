"use client";
import { useEffect, useState } from "react";
import { siteConfigSchema, type SiteConfig } from "@invitations/domain";
import { LoadingState } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { usePanelI18n } from "../../lib/i18n";
import { Invitation } from "@invitations/renderer";
export default function Preview() {
  const { language } = usePanelI18n();
  const [state, setState] = useState<{
    config: SiteConfig;
    variant?: string;
    urls: Record<string, string>;
  } | null>(null);
  useEffect(() => {
    const listener = (e: MessageEvent) => {
      if (
        e.origin === location.origin &&
        e.source === window.parent &&
        e.data?.type === "preview-request"
      ) {
        window.parent.postMessage({ type: "preview-ready" }, location.origin);
        return;
      }
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
  useEffect(() => {
    if (state)
      window.parent.postMessage({ type: "preview-rendered" }, location.origin);
  }, [state]);
  return state ? (
    <Invitation
      onEditSection={(id) =>
        window.parent.postMessage(
          { type: "preview-select-section", id },
          location.origin,
        )
      }
      config={state.config}
      variantId={state.variant}
      resolveMedia={(src) => state.urls[src] || src}
    />
  ) : (
    <LoadingState
      label={loadingText(language, "preview")}
      slowLabel={loadingText(language, "slow")}
    />
  );
}
