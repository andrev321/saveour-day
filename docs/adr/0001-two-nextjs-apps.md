# ADR-0001: Separate Organizer (`apps/admin`) and Guest (`apps/site`) Next.js Applications

- **Status:** Accepted
- **Date:** 2026-11-10

## Context
The platform serves two fundamentally different actors with distinct security models, traffic patterns, and bundle requirements:
1. **Organizers**, who authenticate with email/password via Supabase Auth, edit drafts, upload media, and manage guest lists.
2. **Guests**, who access published **Releases** via `/s/<public_slug>` or `/i/<token>` using lightweight versioned `HttpOnly` cookie sessions without Supabase Auth tokens.

Earlier iterations deployed separate Vite builds per client, creating operational overhead.

## Decision
Maintain two shared Next.js 16 applications (`apps/admin` and `apps/site`) inside a single monorepo, sharing pure domain logic (`packages/domain`), rendering (`packages/renderer`), and UI primitives (`packages/ui`).

## Consequences
- Separate origins isolate organizer authentication and privileged mutations from guest traffic.
- Publishing a **Release** is a database operation (`publish_content`), requiring zero per-customer Vercel builds or deployments.
- Shared packages must remain compatible with both applications and pass unified `typecheck` and boundary checks.
