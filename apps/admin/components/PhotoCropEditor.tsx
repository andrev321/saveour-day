"use client";
import { useRef, type PointerEvent } from "react";
import { Button, Stack, Text } from "@mantine/core";
import type { MediaAsset, DeviceCrops } from "@invitations/domain";
import { usePanelI18n } from "../lib/i18n";
import { mediaUi } from "../lib/media-i18n";
import { cropFrame, cropPosition } from "../lib/crop";
import { DeviceSelector, type PhotoDevice } from "./DeviceSelector";
import * as S from "./PhotoLibrary.styles";

export function PhotoCropEditor({
  photo,
  crops,
  urls,
  device,
  onDevice,
  disabled,
  onChange,
}: {
  photo: MediaAsset;
  crops: DeviceCrops;
  urls: Record<string, string>;
  device: PhotoDevice;
  onDevice: (device: PhotoDevice) => void;
  disabled: boolean;
  onChange: (crops: DeviceCrops) => void;
}) {
  const { language } = usePanelI18n();
  const copy = mediaUi[language];
  const offset = useRef({ x: 0, y: 0 });
  const xKey = "x",
    yKey = "y";
  const change = (patch: { x?: number; y?: number }) =>
    onChange({
      ...crops,
      [device]: {
        x: crops[device]?.x ?? crops.desktop?.x ?? 50,
        y: crops[device]?.y ?? crops.desktop?.y ?? 50,
        ...patch,
      },
    });
  const frame = cropFrame(
    photo.width / photo.height,
    device === "mobile" ? 3 / 4 : device === "tablet" ? 1 : 4 / 3,
  );
  const x = crops[device]?.x ?? crops.desktop?.x ?? 50;
  const y = crops[device]?.y ?? crops.desktop?.y ?? 50;
  const left = ((100 - frame.width) * x) / 100;
  const top = ((100 - frame.height) * y) / 100;
  function position(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    change({
      [xKey]: cropPosition(
        ((event.clientX - bounds.left) / bounds.width) * 100 - offset.current.x,
        frame.width,
      ),
      [yKey]: cropPosition(
        ((event.clientY - bounds.top) / bounds.height) * 100 - offset.current.y,
        frame.height,
      ),
    });
  }
  return (
    <Stack gap="sm">
      <DeviceSelector device={device} onChange={onDevice} />
      <Text fw={600}>{copy.point}</Text>
      <Text size="sm" c="dimmed" id="photo-focus-help">
        {copy.pointHelp}
      </Text>
      <S.Focus
        style={{
          width: `min(100%, ${(photo.width / photo.height) * 440}px)`,
          alignSelf: "center",
        }}
        role="group"
        tabIndex={disabled ? -1 : 0}
        aria-label={copy.point}
        aria-describedby="photo-focus-help"
        aria-disabled={disabled}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          const bounds = event.currentTarget.getBoundingClientRect();
          const draggingFrame = (event.target as HTMLElement).closest(
            '[data-ui="photo-crop-frame"]',
          );
          offset.current = draggingFrame
            ? {
                x:
                  ((event.clientX - bounds.left) / bounds.width) * 100 -
                  left -
                  frame.width / 2,
                y:
                  ((event.clientY - bounds.top) / bounds.height) * 100 -
                  top -
                  frame.height / 2,
              }
            : { x: 0, y: 0 };
          event.currentTarget.setPointerCapture(event.pointerId);
          position(event);
        }}
        onPointerMove={(event) => {
          if (
            !disabled &&
            event.currentTarget.hasPointerCapture(event.pointerId)
          )
            position(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onKeyDown={(event) => {
          if (
            disabled ||
            ![
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          const step = event.shiftKey ? 10 : 2;
          change({
            [xKey]:
              event.key === "Home"
                ? 50
                : Math.max(
                    0,
                    Math.min(
                      100,
                      x +
                        (event.key === "ArrowRight"
                          ? step
                          : event.key === "ArrowLeft"
                            ? -step
                            : 0),
                    ),
                  ),
            [yKey]:
              event.key === "Home"
                ? 50
                : Math.max(
                    0,
                    Math.min(
                      100,
                      y +
                        (event.key === "ArrowDown"
                          ? step
                          : event.key === "ArrowUp"
                            ? -step
                            : 0),
                    ),
                  ),
          });
        }}
      >
        <img
          src={urls[photo.src] || photo.src}
          alt={photo.alt}
          draggable={false}
          width={photo.width}
          height={photo.height}
        />
        <S.CropFrame
          data-ui="photo-crop-frame"
          data-testid="photo-crop"
          data-position={`${x}% ${y}%`}
          aria-hidden="true"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `${frame.width}%`,
            height: `${frame.height}%`,
          }}
        />
      </S.Focus>
      <Text size="sm" c="dimmed">
        {copy.cropHelp}
      </Text>
      <Button
        variant="subtle"
        disabled={disabled}
        onClick={() => change({ [xKey]: 50, [yKey]: 50 })}
      >
        {copy.center}
      </Button>
    </Stack>
  );
}
