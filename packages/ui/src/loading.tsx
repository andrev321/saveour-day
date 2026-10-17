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

const breathe = keyframes`0%,100%{opacity:.45}50%{opacity:1}`;
const reveal = keyframes`from{opacity:0}to{opacity:1}`;
const back = keyframes`0%,100%{transform:translate(0,0)}45%,60%{transform:translate(4px,-4px)}`;
const front = keyframes`0%,100%{transform:translate(0,0)}45%,60%{transform:translate(-4px,4px)}`;
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
  .sod-back {
    animation: ${back} 2.4s ease-in-out infinite;
  }
  .sod-front {
    animation: ${front} 2.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    .sod-back,
    .sod-front {
      animation: none;
    }
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
  children,
}: {
  label: string;
  slowLabel?: string;
  compact?: boolean;
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
      <BrandLogo variant="mark" height={compact ? 26 : 48} decorative />
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
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
  overflow: hidden;
  background: color-mix(in srgb, currentColor 6%, transparent);
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: opacity 180ms;
  }
  &[data-state="pending"]::after {
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
export function LoadingImage({
  src,
  alt = "",
  style,
  unavailable = "—",
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { unavailable?: string }) {
  const [result, setResult] = useState<{
    src: ImgHTMLAttributes<HTMLImageElement>["src"];
    state: "ready" | "error";
  } | null>(null);
  const state = result && result.src === src ? result.state : "pending";
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img?.complete)
      setResult({ src, state: img.naturalWidth ? "ready" : "error" });
  }, [src]);
  return (
    <ImageFrame
      data-state={state}
      style={style as CSSProperties}
      aria-busy={state === "pending"}
    >
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
          alt={alt}
          style={{ opacity: state === "ready" ? 1 : 0 }}
          onLoad={(e) => {
            setResult({ src, state: "ready" });
            props.onLoad?.(e);
          }}
          onError={(e) => {
            setResult({ src, state: "error" });
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
