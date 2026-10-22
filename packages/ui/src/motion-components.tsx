"use client";
import { AnimatePresence, usePresence } from "motion/react";
import { animate } from "motion/mini";
import { useEffect, useRef, type ReactNode } from "react";

function DisclosureBody({ children }: { children: ReactNode }) {
  const [present, remove] = usePresence();
  const ref = useRef<HTMLDivElement>(null);
  const interrupted = useRef<{ height: number; opacity: number } | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const start = interrupted.current;
    interrupted.current = null;
    // Keep natural height after opening so textareas and async content can grow.
    element.style.overflow = "visible";
    element.style.height = "auto";
    if (reduced.matches) {
      if (!present) remove?.();
      return;
    }
    let active = true;
    const height = element.getBoundingClientRect().height;
    element.style.overflow = "hidden";
    const animation = animate(
      element,
      {
        height: [start?.height ?? (present ? 0 : height), present ? height : 0],
        opacity: [start?.opacity ?? (present ? 0 : 1), present ? 1 : 0],
      },
      {
        duration: present ? 0.24 : 0.18,
        ease: [0.22, 1, 0.36, 1],
      },
    );
    void animation.then(() => {
      if (!active) return;
      element.style.height = "auto";
      element.style.overflow = "visible";
      if (!present) remove?.();
    });
    const finish = () => animation.complete();
    reduced.addEventListener("change", finish);
    return () => {
      active = false;
      interrupted.current = {
        height: element.getBoundingClientRect().height,
        opacity: Number.parseFloat(getComputedStyle(element).opacity),
      };
      animation.cancel();
      reduced.removeEventListener("change", finish);
    };
  }, [present, remove]);
  return (
    <div ref={ref} inert={!present} aria-hidden={!present || undefined}>
      {children}
    </div>
  );
}

/** Retain the exiting form until its closing animation has finished. */
export function MotionDisclosure({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div id={id} data-ui="motion-disclosure">
      <AnimatePresence initial={false}>
        {open && <DisclosureBody key="body">{children}</DisclosureBody>}
      </AnimatePresence>
    </div>
  );
}
