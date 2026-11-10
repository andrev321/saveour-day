# Ticket 001: Deepen the Media Asset Policy & Intake Seam

- **Status:** Done
- **Blocked by:** None
- **Candidate Reference:** Candidate #1 (`architecture-review-saveourday.html`)

## Problem
`Media Asset` upload invariants (MIME type allowlist `["image/jpeg", "image/png", "image/webp"]`, transport body limit `4 MiB`, client pre-compression limit `10 MiB`, server processing limit `8 MiB`, and pixel budget `20_000_000`) are duplicated across four files:
- `apps/admin/lib/media-limits.ts`
- `apps/admin/lib/media-upload.ts`
- `apps/admin/lib/prepare-photo-upload.ts`
- `apps/admin/lib/media.ts`

Recent commits (`acfd453`, `9e7b8f5`, `cf8e3ec`) required editing 3–4 files simultaneously whenever a limit or MIME check changed (Shotgun Surgery / Low Locality).

## What It Delivers
A deepened `apps/admin/lib/media-limits.ts` module that owns the complete **Media Asset** policy contract and pure validation/scaling helpers, consumed uniformly by `media-upload.ts`, `prepare-photo-upload.ts`, and `media.ts`:
- `MEDIA_POLICY`: canonical frozen constants (`maxTransportBytes: 4 MiB`, `maxServerBytes: 8 MiB`, `maxClientFileBytes: 10 MiB`, `maxInputPixels: 20_000_000`, `targetCanvasPixels: 19_900_000`, `allowedMimeTypes`, `allowedFormats`, `responsiveWidths: [640, 1280, 1920]`, `webpQuality: 82`).
- `isSupportedMediaMime(mimeType)`: single check used by both browser preflight and server stream reader.
- `computeInitialDownscale(width, height)`: pure pixel-budget scaling calculation used by client canvas preparation and directly unit-testable without DOM mocks.
- Backward-compatible exports (`maxImageBytes`, `maxPhotoFileBytes`) so all existing callers continue to work without breakage.

## Acceptance Criteria
1. Red-green-refactor unit tests in `tests/media-upload.test.ts` cover `MEDIA_POLICY`, `isSupportedMediaMime`, `computeInitialDownscale`, and `readImage`.
2. `media-upload.ts`, `prepare-photo-upload.ts`, and `media.ts` delegate all magic numbers and MIME/format checks to `media-limits.ts`.
3. `npm run check` passes (typecheck, eslint, dependency-cruiser boundaries, all unit tests).
