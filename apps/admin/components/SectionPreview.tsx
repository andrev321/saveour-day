"use client";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "@mantine/core";
import type { SiteConfig } from "@invitations/domain";
import { LoadingState } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { usePanelI18n } from "../lib/i18n";
import { MediaUrlsContext } from "./PhotoReference";

export function SectionPreview({
  config,
  variantId,
  focusSection,
  title,
}: {
  config: SiteConfig;
  variantId: string;
  focusSection: string;
  title: string;
}) {
  const { language } = usePanelI18n();
  const urls = useContext(MediaUrlsContext);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid">(
    "loading",
  );

  const sendConfig = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      {
        type: "preview-config",
        config,
        variant: variantId,
        urls,
        focusSection,
      },
      location.origin,
    );
  }, [config, variantId, urls, focusSection]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== frameRef.current?.contentWindow
      ) {
        return;
      }
      if (e.data?.type === "preview-ready") {
        sendConfig();
      } else if (e.data?.type === "preview-rendered") {
        setStatus("ready");
      } else if (e.data?.type === "preview-invalid") {
        setStatus("invalid");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendConfig]);

  useEffect(() => {
    sendConfig();
  }, [sendConfig]);

  if (status === "invalid") {
    return (
      <Alert color="orange">
        {language === "pl"
          ? "Uzupełnij wymagane pola lub popraw błędne adresy URL, aby wyświetlić podgląd."
          : language === "en"
            ? "Fill in required fields or fix invalid URLs to display the preview."
            : "Fülle Pflichtfelder aus oder korrigiere ungültige URLs, um die Vorschau anzuzeigen."}
      </Alert>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: 380 }}>
      {status === "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <LoadingState compact label={loadingText(language, "preview")} />
        </div>
      )}
      <iframe
        ref={frameRef}
        src="/preview"
        title={title}
        onLoad={() =>
          frameRef.current?.contentWindow?.postMessage(
            { type: "preview-request" },
            location.origin,
          )
        }
        style={{
          width: "100%",
          height: "62vh",
          minHeight: 380,
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: 8,
          display: "block",
        }}
      />
    </div>
  );
}
