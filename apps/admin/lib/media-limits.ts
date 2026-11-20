/**
 * Canonical Media Asset policy & intake invariants (`GLOSSARY.md` / `ADR-0006`).
 * Shared across client preflight (`prepare-photo-upload.ts`), HTTP stream reader
 * (`media-upload.ts`), and server Sharp processing (`media.ts`).
 */
export const MEDIA_POLICY = Object.freeze({
  /** Leave room below the hosting platform's request body limit (4 MiB). */
  maxTransportBytes: 4 * 1024 * 1024,
  /** Maximum buffer accepted by server-side Sharp processing (8 MiB). */
  maxServerBytes: 8 * 1024 * 1024,
  /** Maximum raw file size accepted by browser pre-compression (10 MiB). */
  maxClientFileBytes: 10 * 1024 * 1024,
  /** Maximum decoded image resolution accepted by server (20 MP). */
  maxInputPixels: 20_000_000,
  /** Target pixel ceiling during client-side canvas downscaling. */
  targetCanvasPixels: 19_900_000,
  /** Progressive canvas scale steps attempted when compressing client photos. */
  clientDownscaleSteps: [1, 0.8, 0.64, 0.5] as const,
  /** Progressive WebP quality steps attempted when compressing client photos. */
  clientWebpQualities: [0.9, 0.8, 0.65] as const,
  /** Allowed HTTP Content-Type MIME types for photo uploads. */
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  /** Allowed decoded Sharp image formats. */
  allowedFormats: ["jpeg", "png", "webp"] as const,
  /** Responsive WebP variant target widths generated on upload. */
  responsiveWidths: [320, 640, 1280, 1920] as const,
  /** WebP encoding quality for server-side variants. */
  webpQuality: 82,
  /** Target width (px) for inline LQIP blur preview WebP stored in manifest. */
  blurPreviewWidth: 24,
  /** WebP encoding quality for inline LQIP blur preview. */
  blurPreviewQuality: 40,
});

// Backward-compatible named exports for existing callers.
export const maxImageBytes = MEDIA_POLICY.maxTransportBytes;
export const maxPhotoFileBytes = MEDIA_POLICY.maxClientFileBytes;

/**
 * Formats a byte limit into a Polish human-readable error message (`"Limit pliku: X MB"`).
 */
export function formatByteLimitError(bytes: number): string {
  const megabytes = Math.round(bytes / (1024 * 1024));
  return `Limit pliku: ${megabytes} MB`;
}

/**
 * Checks whether a Content-Type header or File.type matches an allowed Media Asset MIME type.
 */
export function isSupportedMediaMime(
  mimeOrHeader: string | null | undefined,
): boolean {
  if (!mimeOrHeader) return false;
  const normalized = mimeOrHeader.split(";")[0]?.trim().toLowerCase() || "";
  return (MEDIA_POLICY.allowedMimeTypes as readonly string[]).includes(
    normalized,
  );
}

/**
 * Checks whether a decoded image format and page count represent a non-animated supported photo.
 */
export function isSupportedMediaFormat(
  format: string | undefined,
  pages = 1,
): boolean {
  return (
    (MEDIA_POLICY.allowedFormats as readonly string[]).includes(format || "") &&
    pages === 1
  );
}

/**
 * Computes the initial canvas scaling factor to keep an image within the server's pixel budget.
 */
export function computeInitialDownscale(width: number, height: number): number {
  const pixels = width * height;
  if (pixels <= 0 || pixels <= MEDIA_POLICY.maxInputPixels) return 1;
  return Math.min(1, Math.sqrt(MEDIA_POLICY.targetCanvasPixels / pixels));
}
