# ADR-0006: Authorized Media API and Scoped Storage Uploads

- **Status:** Accepted
- **Date:** 2026-11-10

## Context
Private organizer photos (**Media Assets**) must not be publicly guessable or remain accessible after an **Invitation** is revoked or a **Variant** hides a gallery. Conversely, allowing privileged server keys to perform raw Storage writes risked bypassing per-site quotas and lifecycle states.

## Decision
1. **Uploads**: Accept a single authenticated request in `apps/admin`, validate size/dimensions (max 8 MiB, 20 MP), convert to WebP variants with Sharp, and write to Supabase Storage using the organizer's scoped JWT and RLS `INSERT` policy (never bypassing via service role).
2. **Reads**: Serve all private **Media Assets** through authorized API routes (`/api/sites/[id]/media/...` and `/api/media/...`) with `Cache-Control: private, no-store`, checking active **Release** manifests and **Variant Projection**. Do not issue signed Storage URLs to clients.

## Consequences
- Access revocation takes effect immediately on image requests.
- Media deletion uses a two-phase terminal `deleting` state to remove Storage objects before metadata, blocked if referenced by any **Draft** or **Release**.
