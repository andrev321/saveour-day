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

function paintHeart(canvas: HTMLCanvasElement, color: string) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.save();
  context.translate((canvas.width - 64) / 2, (canvas.height - 64) / 2);
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(0, 0, 64, 64, 18);
  context.fill();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(32, 53);
  context.bezierCurveTo(27, 48, 9, 38, 9, 22);
  context.bezierCurveTo(9, 14, 14, 9, 22, 9);
  context.bezierCurveTo(27, 9, 30, 12, 32, 16);
  context.bezierCurveTo(34, 12, 37, 9, 42, 9);
  context.bezierCurveTo(50, 9, 55, 14, 55, 22);
  context.bezierCurveTo(55, 38, 37, 48, 32, 53);
  context.fill();
  context.restore();
}

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
        qrOptions: { errorCorrectionLevel: "H" },
        dotsOptions: { color: foreground, type: dotStyle },
        cornersSquareOptions: { color: foreground, type: "extra-rounded" },
        cornersDotOptions: { color: foreground, type: "dot" },
        backgroundOptions: { color: background },
      });
      container.current.replaceChildren();
      instance.append(container.current);
      qr.current = instance;
      await instance.getRawData("png");
      const canvas = container.current.querySelector("canvas");
      if (!canvas) return;
      if (heart) paintHeart(canvas, foreground);
      canvas.toBlob((result) => {
        if (active && result) setPng({ key: qrKey, blob: result });
      }, "image/png");
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
