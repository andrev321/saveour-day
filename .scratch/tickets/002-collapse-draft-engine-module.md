# Ticket 002: Collapse Draft State, Recovery, and 3-Way Merge into a Deep Module

- **Status:** Done
- **Blocked by:** None
- **Candidate Reference:** Candidate #2 (`architecture-review-saveourday.html`)

## Problem
**Draft** state management is fragmented across three shallow files in `apps/admin/lib/`:
- `use-draft.ts` (61 LOC): React hook mixing undo/redo history stack and 500ms coalescing with React state.
- `draft-merge.ts` (19 LOC): 3-way conflict detection (`mergeDraft`).
- `draft-recovery.ts` (45 LOC): structural repair (`recoverDraft`) while `Editor.tsx` manually handles `sessionStorage` JSON parsing, site ID matching, 7-day TTL (`7 * 86400_000`), and equality comparison against the persisted draft.

## What It Delivers
A single deep module `apps/admin/lib/use-draft.ts` that owns the complete **Draft** lifecycle:
- `DraftHistory`: pure, deterministic undo/redo state machine with configurable 500ms coalescing window, directly testable without React DOM.
- `mergeDraft(base, local, remote)`: 3-way field-level conflict resolution.
- `recoverDraft(value)`: structural schema v3 repair for unfinished text/URL fields.
- `createDraftTabSnapshot(config, now)` & `parseDraftTabSnapshot(raw, siteId, persistedConfig, now)`: encapsulates tab-storage envelope serialization, 7-day TTL expiry, site ID scoping, and structural repair so `Editor.tsx` no longer duplicates storage invariants.
- `useDraft(initial)`: React hook delegating history operations to `DraftHistory`.

The shallow pass-through files `draft-merge.ts` and `draft-recovery.ts` are deleted (passing the deletion test).

## Acceptance Criteria
1. Red-green-refactor unit tests in `tests/product-review.test.ts` cover `DraftHistory` (coalescing, undo/redo, reset) and `createDraftTabSnapshot` / `parseDraftTabSnapshot` alongside `mergeDraft` and `recoverDraft`.
2. `Editor.tsx` imports `useDraft`, `mergeDraft`, `createDraftTabSnapshot`, and `parseDraftTabSnapshot` from `../lib/use-draft`, and `draft-merge.ts` + `draft-recovery.ts` are removed.
3. `npm run check` passes.
