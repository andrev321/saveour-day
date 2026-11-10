# Ticket 003: Unify Public Site & Invitation URL Seam in `@invitations/domain`

- **Status:** Done
- **Blocked by:** None
- **Candidate Reference:** Candidate #4 (`architecture-review-saveourday.html`)

## Problem
Commit `ea1a4c0` required editing 5 files across `apps/admin` and `apps/site` (`apps/admin/app/api/sites/[id]/guests/route.ts`, `apps/admin/app/api/sites/route.ts`, `apps/admin/lib/publishing.ts`, `apps/admin/lib/reminders.ts`, and `apps/site/lib/server.ts`) to align how public **Site** URLs (`/s/<id>`) and **Site** lookup keys (UUID `id` vs `public_slug`) are constructed and resolved (Shotgun Surgery).

## What It Delivers
A shared URL and lookup-key seam in `@invitations/domain` (`packages/domain/src/index.ts`):
- `publicSitePath(siteIdOrSlug)`: returns `/s/<id>`.
- `publicSiteUrl(siteIdOrSlug, baseUrl)`: resolves the full public **Site** URL (`new URL(publicSitePath(siteIdOrSlug), baseUrl).href`).
- `invitationTokenPath(token)` / `invitationTokenUrl(token, baseUrl)`: resolves `/i/<token>`.
- `isSiteUuidKey(key)`: determines whether a `/s/<key>` parameter is a canonical UUID `id` (primary lookup) or a legacy `public_slug` fallback.

Consumed across:
- `apps/admin/lib/publishing.ts`
- `apps/admin/lib/reminders.ts`
- `apps/admin/app/api/sites/[id]/guests/route.ts`
- `apps/site/lib/server.ts`

## Acceptance Criteria
1. Red-green-refactor unit tests in `tests/domain.test.ts` verify `publicSitePath`, `publicSiteUrl`, `invitationTokenUrl`, and `isSiteUuidKey`.
2. `publishing.ts`, `reminders.ts`, `guests/route.ts`, and `apps/site/lib/server.ts` delegate URL building and UUID key classification to `@invitations/domain`.
3. `npm run check` passes.
