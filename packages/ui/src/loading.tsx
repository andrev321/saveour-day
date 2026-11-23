"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ImgHTMLAttributes,
  type ReactNode,
} from "react";
import { styled, keyframes } from "styled-components";
import { BrandLogo } from "./brand";
import { MOTION_EASE_CSS } from "./motion-styles";

const breathe = keyframes`0%,100%{opacity:.45}50%{opacity:1}`;
const reveal = keyframes`from{opacity:0}to{opacity:1}`;
const progressSlide = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
`;
const Status = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 28px 16px;
  text-align: center;
  color: inherit;
  animation: ${reveal} 160ms 200ms both;
  &[data-compact="true"] {
    flex-direction: row;
    justify-content: flex-start;
    padding: 8px 0;
    text-align: left;
    gap: 10px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const ProgressTrack = styled.div`
  width: 72px;
  height: 1.5px;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, currentColor 14%, transparent);
  &[data-compact="true"] {
    display: none;
  }
`;
const ProgressBar = styled.div`
  width: 50%;
  height: 100%;
  border-radius: inherit;
  background: color-mix(in srgb, currentColor 68%, transparent);
  animation: ${progressSlide} 1.5s ${MOTION_EASE_CSS} infinite;
  @media (prefers-reduced-motion: reduce) {
    width: 100%;
    opacity: 0.45;
    animation: none;
  }
`;
const Dots = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-inline-end: 8px;
  vertical-align: middle;
  i {
    width: 4px;
    height: 4px;
    background: currentColor;
    border-radius: 50%;
    animation: ${breathe} 1.4s ease-in-out infinite;
  }
  i:nth-child(2) {
    animation-delay: 160ms;
  }
  i:nth-child(3) {
    animation-delay: 320ms;
  }
  @media (prefers-reduced-motion: reduce) {
    i {
      animation: none;
      opacity: 0.65;
    }
  }
`;
export function LoadingDots() {
  return (
    <Dots aria-hidden="true">
      <i />
      <i />
      <i />
    </Dots>
  );
}
export function BusyLabel({
  busy,
  label,
  children,
}: {
  busy: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <span aria-live="polite">
      {busy ? (
        <>
          <LoadingDots />
          {label}
        </>
      ) : (
        children
      )}
    </span>
  );
}
export function LoadingState({
  label,
  slowLabel,
  compact = false,
  tone,
  children,
}: {
  label: string;
  slowLabel?: string;
  compact?: boolean;
  tone?: "light" | "dark";
  children?: ReactNode;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Status
      role="status"
      aria-label={label}
      aria-live="polite"
      data-compact={compact}
    >
      <BrandLogo
        variant="mark"
        height={compact ? 26 : 38}
        tone={tone}
        decorative
      />
      <ProgressTrack data-compact={compact} aria-hidden="true">
        <ProgressBar />
      </ProgressTrack>
      <div>
        <div
          style={{
            fontWeight: compact ? 500 : 400,
            fontSize: compact ? undefined : "13px",
            letterSpacing: compact ? undefined : "0.01em",
            opacity: compact ? 1 : 0.72,
          }}
        >
          {label}
        </div>
        {slow && slowLabel && (
          <small style={{ display: "block", marginTop: 8, opacity: 0.75 }}>
            {slowLabel}
          </small>
        )}
      </div>
      {children}
    </Status>
  );
}
export const LoadingSkeleton = styled.div`
  background: color-mix(in srgb, currentColor 9%, transparent);
  border-radius: 10px;
  animation: ${breathe} 1.8s ease-in-out infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const ImageFrame = styled.span`
  display: block;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: color-mix(in srgb, currentColor 6%, transparent);
  img {
    display: block;
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 240ms ease-out;
  }
  &[data-state="pending"]:not([data-blur="true"])::after {
    content: "";
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, currentColor 7%, transparent);
    animation: ${breathe} 1.8s infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    img {
      transition: none;
    }
    &::after {
      animation: none;
    }
  }
`;
const BlurBackdrop = styled.span`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-size: cover;
  background-position: center;
  filter: blur(14px);
  transform: scale(1.08);
  transition: opacity 240ms ease-out;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
export function LoadingImage({
  src,
  srcSet,
  alt = "",
  style,
  unavailable = "—",
  blurDataUrl,
  decoding = "async",
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  unavailable?: string;
  blurDataUrl?: string;
}) {
  const sourceKey = `${typeof src === "string" ? src : ""}|${srcSet ?? ""}`;
  const [result, setResult] = useState<{
    sourceKey: string;
    state: "ready" | "error";
  } | null>(null);
  const state =
    result && result.sourceKey === sourceKey ? result.state : "pending";
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img?.complete)
      setResult({ sourceKey, state: img.naturalWidth ? "ready" : "error" });
  }, [sourceKey]);
  return (
    <ImageFrame
      data-state={state}
      data-blur={blurDataUrl ? "true" : undefined}
      style={style as CSSProperties}
      aria-busy={state === "pending"}
    >
      {blurDataUrl && state !== "error" ? (
        <BlurBackdrop
          aria-hidden="true"
          style={{
            backgroundImage: `url(${blurDataUrl})`,
            opacity: state === "ready" ? 0 : 1,
          }}
        />
      ) : null}
      {state === "error" ? (
        <span
          role="img"
          aria-label={alt || unavailable}
          style={{
            display: "grid",
            placeItems: "center",
            height: "100%",
            minHeight: 36,
          }}
        >
          {unavailable}
        </span>
      ) : (
        <img
          {...props}
          ref={ref}
          src={src}
          srcSet={srcSet}
          alt={alt}
          decoding={decoding}
          style={{ opacity: state === "ready" ? 1 : 0 }}
          onLoad={(e) => {
            setResult({ sourceKey, state: "ready" });
            props.onLoad?.(e);
          }}
          onError={(e) => {
            setResult({ sourceKey, state: "error" });
            props.onError?.(e);
          }}
        />
      )}
    </ImageFrame>
  );
}

/** A synchronous lock also prevents two clicks before React's next render. */
export function useOperation() {
  const [operation, setOperation] = useState<string | null>(null);
  const lock = useRef(false);
  function start(name: string) {
    if (lock.current) return false;
    lock.current = true;
    setOperation(name);
    return true;
  }
  function end() {
    lock.current = false;
    setOperation(null);
  }
  return { operation, busy: operation !== null, start, end };
}
