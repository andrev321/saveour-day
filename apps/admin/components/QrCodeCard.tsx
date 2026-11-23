"use client";
import { QrPreview } from "./form-layout.styles";

import { ActionIcon, Button, Stack, Text, Tooltip } from "@mantine/core";
import { ClipboardIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { LoadingState, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { toast } from "@invitations/ui/toast";
import { usePanelI18n } from "../lib/i18n";

const foreground = "#302F2B";
const background = "#FFFFFF";

export function QrCodeCard({ url, title }: { url: string; title?: string }) {
  const { language } = usePanelI18n();
  const { busy, start, end } = useOperation();
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [png, setPng] = useState<{ key: string; blob: Blob } | null>(null);
  const qrKey = `${url}|${attempt}`;

  useEffect(() => {
    let active = true;
    void import("qr-code-styling")
      .then(async ({ default: QRCodeStyling }) => {
        if (!active || !container.current) return;
        const instance = new QRCodeStyling({
          type: "canvas",
          width: 280,
          height: 280,
          margin: 12,
          data: url,
          qrOptions: { errorCorrectionLevel: "H" },
          dotsOptions: { color: foreground, type: "rounded" },
          cornersSquareOptions: { color: foreground, type: "extra-rounded" },
          cornersDotOptions: { color: foreground, type: "dot" },
          backgroundOptions: { color: background },
        });
        container.current.replaceChildren();
        instance.append(container.current);
        await instance.getRawData("png");
        if (!active || !container.current) return;
        const canvas = container.current.querySelector("canvas");
        if (!canvas) throw new Error("Missing QR canvas");
        canvas.toBlob((result) => {
          if (active) {
            if (result) setPng({ key: qrKey, blob: result });
            else setFailure(qrKey);
          }
        }, "image/png");
      })
      .catch(() => {
        if (active) setFailure(qrKey);
      });
    return () => {
      active = false;
    };
  }, [qrKey, url]);

  async function copyImage() {
    if (!png || png.key !== qrKey) return;
    if (!start("copy")) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png.blob }),
      ]);
      toast.success("Skopiowano kod QR jako obraz PNG.");
    } catch {
      toast.error(
        "Przeglądarka nie pozwoliła skopiować obrazu. Spróbuj w Chrome lub Edge i zezwól na dostęp do schowka.",
      );
    } finally {
      end();
    }
  }

  return (
    <Stack gap="xs">
      {title && (
        <Text fw={600} size="sm">
          {title}
        </Text>
      )}
      <QrPreview aria-busy={png?.key !== qrKey}>
        {png?.key !== qrKey && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background: "var(--panel-surface)",
              color: "var(--panel-text)",
              display: "grid",
              placeContent: "center",
            }}
          >
            {failure === qrKey ? (
              <div role="alert">
                <Text>{loadingText(language, "qrError")}</Text>
                <Button onClick={() => setAttempt((n) => n + 1)}>
                  {loadingText(language, "retry")}
                </Button>
              </div>
            ) : (
              <LoadingState
                label={loadingText(language, "qr")}
                slowLabel={loadingText(language, "slow")}
              />
            )}
          </div>
        )}
        <div
          ref={container}
          aria-label="Podgląd kodu QR"
          style={{ width: "100%" }}
        />
        {png?.key === qrKey && (
          <Tooltip
            label={
              busy ? loadingText(language, "copy") : "Kopiuj kod QR jako obraz"
            }
          >
            <ActionIcon
              data-qr-copy=""
              size="lg"
              variant="default"
              aria-label="Kopiuj kod QR jako obraz"
              loading={busy}
              aria-busy={busy}
              disabled={busy}
              onClick={() => void copyImage()}
            >
              <ClipboardIcon />
            </ActionIcon>
          </Tooltip>
        )}
      </QrPreview>
    </Stack>
  );
}
