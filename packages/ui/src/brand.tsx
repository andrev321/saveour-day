import type { CSSProperties } from "react";
import {
  brandArt,
  brandPalette,
  brandWidths,
  brandWordmarks,
  brandMotion,
} from "./brand-art";

type BrandLogoProps = {
  variant?: "full" | "short" | "mark";
  tone?: "light" | "dark";
  animated?: boolean;
  height?: number;
  className?: string;
  style?: CSSProperties;
  decorative?: boolean;
};

/** Tone describes the background. Vector lettering needs no font download. */
export function BrandLogo({
  variant = "full",
  tone = "light",
  animated = false,
  height = 48,
  className,
  style,
  decorative = false,
}: BrandLogoProps) {
  const palette = brandPalette[tone];
  const width = brandWidths[variant];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} 124`}
      width={(height * width) / 124}
      height={height}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "saveour.day"}
      aria-hidden={decorative || undefined}
      focusable="false"
      className={`${animated ? "sod-animated " : ""}${className ?? ""}`}
      style={{ display: "block", maxWidth: "100%", ...style }}
      data-brand={variant}
    >
      {animated && <style>{brandMotion}</style>}
      <g className="sod-back">
        <path d={brandArt.backTop} fill={palette.back} />
        <path d={brandArt.backSide} fill={palette.side} />
      </g>
      <path className="sod-front" d={brandArt.front} fill={palette.front} />
      {variant !== "mark" && (
        <path
          transform="translate(140 0)"
          d={brandWordmarks[variant].path}
          fill={palette.ink}
        />
      )}
    </svg>
  );
}
