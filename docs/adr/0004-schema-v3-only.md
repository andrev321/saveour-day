# ADR-0004: Schema v3 Only (No Runtime Legacy Adapters)

- **Status:** Accepted
- **Date:** 2026-11-10

## Context
Supporting runtime adapters for legacy v1 and v2 configuration schemas increased complexity across the editor, **Variant Projection**, and renderer, creating shallow pass-through translation layers.

## Decision
Accept **schema v3 only** across all runtime code (`packages/domain`, `apps/admin`, `apps/site`, `packages/renderer`). All historical drafts, releases, and snapshots were migrated via a one-time database migration.

## Consequences
- Every **Variant** (including the default) has explicit, typed **Section** placements, independent visibility, and per-use **Crop** coordinates.
- No v1/v2 compatibility branches may be reintroduced into runtime packages.
