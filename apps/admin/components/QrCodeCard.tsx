"use client";

import {
  ActionIcon,
  Alert,
  Card,
  ColorInput,
  Group,
  Select,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { ClipboardIcon, HeartIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type QRCodeStyling from "qr-code-styling";
import type { DotType } from "qr-code-styling/lib/types";

const heartSvg = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="white"/><path d="M32 52S9 39 9 22c0-8 6-13 13-13 5 0 8 3 10 7 2-4 5-7 10-7 7 0 13 5 13 13 0 17-23 30-23 30Z" fill="${color}"/></svg>`,
  )}`;

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
}: {
  url: string;
  published: boolean;
  onMessage: (message: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const qr = useRef<QRCodeStyling | null>(null);
  const [foreground, setForeground] = useState("#5C3B2E");
  const [background, setBackground] = useState("#FFFDF8");
  const [dotStyle, setDotStyle] = useState<DotType>("rounded");
  const [heart, setHeart] = useState(true);
  const [png, setPng] = useState<{ key: string; blob: Blob } | null>(null);
  const qrKey = `${url}|${foreground}|${background}|${dotStyle}|${heart}`;

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
        image: heart ? heartSvg(foreground) : undefined,
        qrOptions: { errorCorrectionLevel: "H" },
        dotsOptions: { color: foreground, type: dotStyle },
        cornersSquareOptions: { color: foreground, type: "extra-rounded" },
        cornersDotOptions: { color: foreground, type: "dot" },
        backgroundOptions: { color: background },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.28,
          margin: 5,
        },
      });
      container.current.replaceChildren();
      instance.append(container.current);
      qr.current = instance;
      const result = await instance.getRawData("png");
      if (active && result instanceof Blob)
        setPng({ key: qrKey, blob: result });
    });
    return () => {
      active = false;
      qr.current = null;
    };
  }, [background, dotStyle, foreground, heart, qrKey, url]);

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
        <Group justify="space-between" align="center">
          <div>
            <Title order={3}>Kod QR strony</Title>
            <Text size="sm" c="dimmed">
              Kod powstaje lokalnie w przeglądarce i prowadzi do publicznego
              adresu zaproszenia.
            </Text>
          </div>
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
        </Group>
        {!published && (
          <Alert color="yellow">
            Najpierw opublikuj stronę. Kod możesz już dopasować, ale kopiowanie
            zostanie włączone po publikacji.
          </Alert>
        )}
        <Group align="flex-start" gap="xl" wrap="wrap">
          <div
            ref={container}
            aria-label="Podgląd kodu QR"
            style={{ minHeight: 280, minWidth: 280 }}
          />
          <Stack style={{ flex: "1 1 240px" }}>
            <ColorInput
              label="Kolor kodu"
              value={foreground}
              onChange={setForeground}
              format="hex"
              swatches={["#1F2937", "#5C3B2E", "#7A263A", "#2F5D50", "#243B6B"]}
            />
            <ColorInput
              label="Kolor tła"
              value={background}
              onChange={setBackground}
              format="hex"
              swatches={["#FFFFFF", "#FFFDF8", "#F8F1E7", "#EEF4F0", "#F8EEF1"]}
            />
            <Select
              label="Styl elementów"
              data={styles}
              value={dotStyle}
              allowDeselect={false}
              onChange={(value) => value && setDotStyle(value as DotType)}
            />
            <Switch
              label="Serduszko pośrodku"
              description="Wysoki poziom korekcji błędów zachowuje czytelność kodu."
              checked={heart}
              onChange={(event) => setHeart(event.currentTarget.checked)}
              thumbIcon={
                heart ? <HeartIcon size={12} weight="fill" /> : undefined
              }
            />
          </Stack>
        </Group>
      </Stack>
    </Card>
  );
}
