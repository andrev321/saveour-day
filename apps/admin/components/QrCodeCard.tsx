"use client";

import {
  ActionIcon,
  Alert,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { ClipboardIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { DotType } from "qr-code-styling/lib/types";

const foreground = "#302F2B";
const background = "#FFFFFF";

const styles: { value: DotType; label: string }[] = [
  { value: "square", label: "Klasyczny" },
  { value: "rounded", label: "Zaokrąglony" },
  { value: "dots", label: "Kropki" },
  { value: "classy-rounded", label: "Elegancki" },
];

export function QrCodeCard({
  url,
  published,
  onMessage,
  title,
}: {
  url: string;
  published: boolean;
  onMessage: (message: string) => void;
  title?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [dotStyle, setDotStyle] = useState<DotType>("rounded");
  const [png, setPng] = useState<{ key: string; blob: Blob } | null>(null);
  const qrKey = `${url}|${dotStyle}`;

  useEffect(() => {
    let active = true;
    void import("qr-code-styling").then(async ({ default: QRCodeStyling }) => {
      if (!active || !container.current) return;
      const instance = new QRCodeStyling({
        type: "canvas",
        width: 280,
        height: 280,
        margin: 12,
        data: url,
        qrOptions: { errorCorrectionLevel: "H" },
        dotsOptions: { color: foreground, type: dotStyle },
        cornersSquareOptions: { color: foreground, type: "extra-rounded" },
        cornersDotOptions: { color: foreground, type: "dot" },
        backgroundOptions: { color: background },
      });
      container.current.replaceChildren();
      instance.append(container.current);
      await instance.getRawData("png");
      const canvas = container.current.querySelector("canvas");
      if (!canvas) return;
      canvas.toBlob((result) => {
        if (active && result) setPng({ key: qrKey, blob: result });
      }, "image/png");
    });
    return () => {
      active = false;
    };
  }, [dotStyle, qrKey, url]);

  async function copyImage() {
    if (!png || png.key !== qrKey || !published) return;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png.blob }),
      ]);
      onMessage("Skopiowano kod QR jako obraz PNG.");
    } catch {
      onMessage(
        "Przeglądarka nie pozwoliła skopiować obrazu. Spróbuj w Chrome lub Edge i zezwól na dostęp do schowka.",
      );
    }
  }

  return (
    <Card withBorder>
      <Stack>
        <div>
          <Title order={3}>{title || "Kod QR strony"}</Title>
          <Text size="sm" c="dimmed">
            Kod powstaje lokalnie w przeglądarce i prowadzi do wskazanego
            adresu zaproszenia.
          </Text>
        </div>
        {!published && (
          <Alert color="yellow">
            Najpierw opublikuj stronę. Kod możesz już dopasować, ale kopiowanie
            zostanie włączone po publikacji.
          </Alert>
        )}
        <Group align="flex-start" gap="xl" wrap="wrap">
          <Stack gap="xs" align="center">
            <div
              ref={container}
              aria-label="Podgląd kodu QR"
              style={{ minHeight: 280, minWidth: 280 }}
            />
            <Tooltip label="Kopiuj kod QR jako obraz">
              <ActionIcon
                size="lg"
                variant="light"
                aria-label="Kopiuj kod QR jako obraz"
                disabled={!published || !png || png.key !== qrKey}
                onClick={() => void copyImage()}
              >
                <ClipboardIcon />
              </ActionIcon>
            </Tooltip>
          </Stack>
          <Stack style={{ flex: "1 1 240px" }}>
            <Select
              label="Styl elementów"
              data={styles}
              value={dotStyle}
              allowDeselect={false}
              onChange={(value) => value && setDotStyle(value as DotType)}
            />
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
