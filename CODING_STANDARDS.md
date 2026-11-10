# Coding Standards (`saveour-day`)

This document is read during **Review** (`/code-review`), not implementation. Everything enforceable by deterministic tooling (`npm run typecheck`, `npm run lint`, `npm run lint:boundaries`) is omitted here. Reserve this file for **judgement calls** and architectural invariants.

## 1. Domain Vocabulary Alignment
- Code symbols, route parameters, and error messages must match [`GLOSSARY.md`](./GLOSSARY.md) terms (**Site**, **Draft**, **Release**, **Variant**, **Variant Projection**, **Invitation**, **Guest**, **Event**, **RSVP Answer**, **Media Asset**, **Crop**, **Template**, **Theme**).
- Do not introduce synonyms such as `project` (for **Site**), `deployment`/`bundle` (for **Release**), or `guestGroup` (for **Invitation**).

## 2. Deep Modules & Seams (`codebase-design`)
- **High Depth**: Prefer modules with a small, explicit **Interface** hiding substantial implementation complexity over shallow pass-through wrappers.
- **Single Source of Policy**: Domain and media quotas, limits, and allowlists must live in one authoritative policy module (e.g., `MEDIA_POLICY` in `apps/admin/lib/media-limits.ts`) rather than duplicated literals across client and server files.
- **Test Through the Interface**: Tests in `tests/*.test.ts` must exercise modules through their public entry points. Do not export internal helpers solely for unit tests if they can be tested through the module's primary interface.

## 3. Security & Isolation Invariants (`docs/adr/`)
- **Server-Side Variant Projection (`ADR-0003`)**: Never rely on client-side filtering or CSS hiding to restrict sections, events, venues, contacts, or media across **Variants**.
- **Scoped Media Uploads (`ADR-0006`)**: Never use `serviceDb()` to upload raw objects to `site-media` Storage; always use the organizer's scoped client (`uploadDb`) so RLS `INSERT` policies execute, while keeping metadata reservation/completion on transactional RPCs.
- **Versioned Guest Sessions (`ADR-0005`)**: Any mutation that changes **Access Mode**, rotates an **Invitation** link, or revokes access must increment the corresponding `access_version`.
