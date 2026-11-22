"use client";
import { animate } from "motion/mini";
import { inView } from "motion";
import { useEffect, useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;
const preference = "(prefers-reduced-motion: reduce)";

/** Animate the existing view, preserving form state, focus and scroll position. */
export function useViewMotion(view: string | null, selector?: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = selector
      ? ref.current?.querySelector<HTMLElement>(selector)
      : ref.current;
    const reduced = window.matchMedia(preference);
    if (!element || reduced.matches) return;
    const animation = animate(
      element,
      {
        opacity: [0.82, 1],
        ...(selector ? { transform: ["translateY(5px)", "none"] } : {}),
      },
      {
        duration: 0.22,
        ease,
      },
    );
    const finish = () => animation.complete();
    reduced.addEventListener("change", finish);
    return () => {
      animation.cancel();
      reduced.removeEventListener("change", finish);
    };
  }, [view, selector]);
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
    // Leave the primary heading and hero image untouched for immediate reading.
    const details = Array.from(
      root.querySelectorAll('[data-ui="invitation-hero-copy"] > :not(h1)'),
    );
    const detailOrder = new Map(
      details.map((element, index) => [element, index]),
    );
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-ui="invitation-section"], [data-ui="invitation-response"]',
      ),
    );
    const markSectionsInView = () => {
      sections.forEach((section) => {
        section.dataset.inView = "true";
      });
    };
    const syncMotionPreference = () => {
      if (reduced.matches) {
        delete root.dataset.motionReady;
        animations.forEach((animation) => animation.complete());
        markSectionsInView();
      } else {
        root.dataset.motionReady = "true";
      }
    };
    syncMotionPreference();

    const stop = inView(
      [...details, ...sections],
      (element) => {
        if (
          element instanceof HTMLElement &&
          (element.dataset.ui === "invitation-section" ||
            element.dataset.ui === "invitation-response")
        ) {
          element.dataset.inView = "true";
        }
        if (seen.current.has(element)) return;
        seen.current.add(element);
        if (reduced.matches) return;
        const detail = detailOrder.get(element);
        const isDetail = detail !== undefined;
        const animation = animate(
          element,
          {
            opacity: isDetail ? [0.55, 1] : [0.6, 1],
            transform: [`translateY(${isDetail ? 8 : 10}px)`, "none"],
          },
          {
            duration: isDetail ? 0.48 : 0.42,
            delay: isDetail ? Math.min(detail * 0.055, 0.22) : 0,
            ease,
          },
        );
        animations.add(animation);
        void animation.then(() => animations.delete(animation));
      },
      { amount: "some" },
    );

    const header = root.querySelector<HTMLElement>(
      '[data-ui="invitation-header"]',
    );
    const navTargets = header
      ? Array.from(header.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]'))
          .map((link) => {
            const id = link.getAttribute("href")?.slice(1);
            const target = id ? document.getElementById(id) : null;
            return target && root.contains(target) ? { link, target } : null;
          })
          .filter(
            (entry): entry is { link: HTMLAnchorElement; target: HTMLElement } =>
              entry !== null,
          )
      : [];

    const updateScrollState = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollable))
          : 0;
      root.style.setProperty("--scroll-progress", String(progress));

      if (header) {
        if (window.scrollY > 48) {
          header.dataset.scrolled = "true";
        } else {
          delete header.dataset.scrolled;
        }
      }

      if (navTargets.length > 0) {
        const headerHeight = header ? header.getBoundingClientRect().height : 0;
        const threshold = Math.max(headerHeight + 48, window.innerHeight * 0.33);
        const atBottom = scrollable > 48 && window.scrollY >= scrollable - 2;
        let activeLink: HTMLAnchorElement | null = null;
        let bestTop = -Infinity;

        for (const { link, target } of navTargets) {
          const rect = target.getBoundingClientRect();
          const eligible = atBottom
            ? rect.top < window.innerHeight && rect.bottom > headerHeight
            : rect.top <= threshold && rect.bottom > headerHeight;
          if (eligible && rect.top >= bestTop) {
            bestTop = rect.top;
            activeLink = link;
          }
        }

        for (const { link } of navTargets) {
          if (link === activeLink) {
            link.dataset.active = "true";
          } else {
            delete link.dataset.active;
          }
        }
      }
    };

    let frame: number | null = null;
    const scheduleScrollUpdate = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateScrollState();
      });
    };

    updateScrollState();
    window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
    window.addEventListener("resize", scheduleScrollUpdate, { passive: true });
    reduced.addEventListener("change", syncMotionPreference);

    return () => {
      stop();
      animations.forEach((animation) => animation.cancel());
      reduced.removeEventListener("change", syncMotionPreference);
      window.removeEventListener("scroll", scheduleScrollUpdate);
      window.removeEventListener("resize", scheduleScrollUpdate);
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      delete root.dataset.motionReady;
    };
  }, [contentKey]);
  return ref;
}
