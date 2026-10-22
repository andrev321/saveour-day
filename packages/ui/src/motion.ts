"use client";
import { animate } from "motion/mini";
import { inView } from "motion";
import { useEffect, useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;
const preference = "(prefers-reduced-motion: reduce)";

/** Animate the existing view, preserving form state, focus and scroll position. */
export function useViewMotion(view: string | null) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const reduced = window.matchMedia(preference);
    if (!element || reduced.matches) return;
    const animation = animate(
      element,
      { opacity: [0.7, 1] },
      {
        duration: 0.18,
        ease,
      },
    );
    const finish = () => animation.complete();
    reduced.addEventListener("change", finish);
    return () => {
      animation.cancel();
      reduced.removeEventListener("change", finish);
    };
  }, [view]);
  return ref;
}

/** Content stays visible in SSR and without JS. Each section enters only once. */
export function useInvitationMotion(contentKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(new WeakSet<Element>());
  useEffect(() => {
    const root = ref.current;
    if (!root || !("IntersectionObserver" in window)) return;
    const reduced = window.matchMedia(preference);
    const animations = new Set<ReturnType<typeof animate>>();
    const stop = inView(
      Array.from(
        root.querySelectorAll(
          '[data-ui="invitation-section"], [data-ui="invitation-response"]',
        ),
      ),
      (element) => {
        if (seen.current.has(element)) return;
        seen.current.add(element);
        if (reduced.matches) return;
        const animation = animate(
          element,
          {
            opacity: [0.65, 1],
            transform: ["translateY(8px)", "none"],
          },
          { duration: 0.36, ease },
        );
        animations.add(animation);
        void animation.then(() => animations.delete(animation));
      },
      { amount: "some" },
    );
    const finish = () => {
      animations.forEach((animation) => animation.complete());
    };
    reduced.addEventListener("change", finish);
    return () => {
      stop();
      animations.forEach((animation) => animation.cancel());
      reduced.removeEventListener("change", finish);
    };
  }, [contentKey]);
  return ref;
}
