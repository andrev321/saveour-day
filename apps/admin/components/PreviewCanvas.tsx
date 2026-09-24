"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

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
    <div className="preview-canvas" ref={host} data-fit={fit}>
      <div
        className="preview-surface"
        style={{ width: outerWidth * scale, height: outerHeight * scale }}
      >
        <div
          className="preview-device"
          data-device={device}
          style={{
            width: outerWidth,
            height: outerHeight,
            padding: bezel,
            transform: `scale(${scale})`,
          }}
        >
          <div className="preview-device-screen">
            <div
              className="preview-device-status"
              style={{ height: top }}
              aria-hidden="true"
            >
              {device === "phone" ? (
                <>
                  <span>9:41</span>
                  <i className="preview-camera" />
                  <span className="preview-status-icons">▮▮▮ ▰</span>
                </>
              ) : device === "desktop" ? (
                <span>● ● ●</span>
              ) : (
                <i className="preview-tablet-camera" />
              )}
            </div>
            <iframe
              ref={frame}
              src="/preview"
              title={title}
              style={{ width, height }}
            />
            <div
              className="preview-device-bottom"
              style={{ height: bottom }}
              aria-hidden="true"
            >
              {device !== "desktop" && <i />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
