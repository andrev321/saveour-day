"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import * as S from "./preview.styles";

/** Scale the surface, not its viewport: desktop breakpoints remain accurate. */
export function PreviewCanvas({
  width,
  fit,
  frame,
  title,
}: {
  width: number;
  fit: boolean;
  frame: RefObject<HTMLIFrameElement | null>;
  title: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const device = width <= 390 ? "phone" : width === 768 ? "tablet" : "desktop";
  const height = device === "phone" ? 780 : device === "tablet" ? 1024 : 900;
  const bezel = device === "phone" ? 10 : device === "tablet" ? 14 : 0;
  const top = device === "phone" ? 30 : device === "tablet" ? 12 : 28;
  const bottom = device === "phone" ? 22 : device === "tablet" ? 12 : 0;
  const outerWidth = width + bezel * 2;
  const outerHeight = height + top + bottom + bezel * 2;
  const scale =
    fit && size.width && size.height
      ? Math.min(
          1,
          Math.max(1, size.width - 32) / outerWidth,
          Math.max(1, size.height - 32) / outerHeight,
        )
      : 1;
  return (
    <S.PreviewCanvas ref={host} data-fit={fit}>
      <S.PreviewSurface
        style={{ width: outerWidth * scale, height: outerHeight * scale }}
      >
        <S.PreviewDevice
          data-device={device}
          style={{
            width: outerWidth,
            height: outerHeight,
            padding: bezel,
            transform: `scale(${scale})`,
          }}
        >
          <S.PreviewDeviceScreen>
            <S.PreviewDeviceStatus style={{ height: top }} aria-hidden="true">
              {device === "phone" ? (
                <>
                  <span>9:41</span>
                  <S.PreviewCamera />
                  <S.PreviewStatusIcons>▮▮▮ ▰</S.PreviewStatusIcons>
                </>
              ) : device === "desktop" ? (
                <span>● ● ●</span>
              ) : (
                <S.PreviewTabletCamera />
              )}
            </S.PreviewDeviceStatus>
            <iframe
              ref={frame}
              src="/preview"
              title={title}
              style={{ width, height }}
            />
            <S.PreviewDeviceBottom
              style={{ height: bottom }}
              aria-hidden="true"
            >
              {device !== "desktop" && <i />}
            </S.PreviewDeviceBottom>
          </S.PreviewDeviceScreen>
        </S.PreviewDevice>
      </S.PreviewSurface>
    </S.PreviewCanvas>
  );
}
