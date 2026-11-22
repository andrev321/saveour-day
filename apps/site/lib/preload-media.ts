import { isSampleMediaSource, type MediaAsset } from "@invitations/domain";
import type { GuestContent } from "@invitations/domain/guest";

const HERO_PRELOAD_TIMEOUT_MS = 1000;
const SECTION_SIZES = "(max-width: 30em) 100vw, (max-width: 64em) 50vw, 480px";
const IDLE_PRELOAD_LIMIT = 12;

function resolveUrl(src: string, resolveMedia: (src: string) => string) {
  return isSampleMediaSource(src) ? src : resolveMedia(src);
}

function preloadAsset(
  asset: MediaAsset,
  sizes: string,
  resolveMedia: (src: string) => string,
): Promise<void> {
  if (typeof Image === "undefined") return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    const finish = () => resolve();
    img.onload = finish;
    img.onerror = finish;

    if (asset.variants.length > 0) {
      img.sizes = sizes;
      img.srcset = asset.variants
        .map((v) => `${resolveUrl(v.src, resolveMedia)} ${v.width}w`)
        .join(", ");
    }
    img.src = resolveUrl(asset.src, resolveMedia);

    if (img.complete) {
      finish();
      return;
    }
    if (typeof img.decode === "function") {
      img.decode().then(finish, finish);
    }
  });
}

function pickHeroTarget(
  config: GuestContent,
): { asset: MediaAsset; sizes: string } | null {
  const byId = new Map(config.media.map((m) => [m.id, m]));
  const desktop = config.hero.mediaId ? byId.get(config.hero.mediaId) : null;
  if (!desktop) return null;

  const isOverlay = config.hero.layout === "overlay";
  const mobile = config.hero.mobileMediaId
    ? byId.get(config.hero.mobileMediaId)
    : null;
  const tablet = config.hero.tabletMediaId
    ? byId.get(config.hero.tabletMediaId)
    : null;

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function"
  ) {
    if (mobile && window.matchMedia("(max-width: 47.99em)").matches) {
      return { asset: mobile, sizes: "100vw" };
    }
    if (
      tablet &&
      window.matchMedia("(min-width: 48em) and (max-width: 63.99em)").matches
    ) {
      return { asset: tablet, sizes: isOverlay ? "100vw" : "65vw" };
    }
  }

  return {
    asset: desktop,
    sizes: isOverlay
      ? "100vw"
      : "(max-width: 48em) 100vw, (max-width: 64em) 65vw, 55vw",
  };
}

/** Preloads and decodes the active hero image up to a short timeout budget. */
export function preloadHeroMedia(
  config: GuestContent,
  resolveMedia: (src: string) => string,
): Promise<void> {
  const target = pickHeroTarget(config);
  if (!target) return Promise.resolve();

  return Promise.race([
    preloadAsset(target.asset, target.sizes, resolveMedia),
    new Promise<void>((resolve) =>
      setTimeout(resolve, HERO_PRELOAD_TIMEOUT_MS),
    ),
  ]);
}

/** Warms remaining section/gallery images during browser idle time. */
export function scheduleIdleMediaPreload(
  config: GuestContent,
  resolveMedia: (src: string) => string,
): () => void {
  const heroIds = new Set(
    [
      config.hero.mediaId,
      config.hero.mobileMediaId,
      config.hero.tabletMediaId,
    ].filter((id): id is string => Boolean(id)),
  );
  const remaining = config.media
    .filter((m) => !heroIds.has(m.id))
    .slice(0, IDLE_PRELOAD_LIMIT);
  if (remaining.length === 0 || typeof window === "undefined") return () => {};

  let cancelled = false;
  const run = () => {
    if (cancelled) return;
    for (const asset of remaining) {
      void preloadAsset(asset, SECTION_SIZES, resolveMedia);
    }
  };

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(run, { timeout: 1500 });
    return () => {
      cancelled = true;
      window.cancelIdleCallback(id);
    };
  }

  const timer = setTimeout(run, 400);
  return () => {
    cancelled = true;
    clearTimeout(timer);
  };
}
