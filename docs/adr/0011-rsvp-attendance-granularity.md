# ADR-0011: Configurable RSVP Attendance Granularity

- **Status:** Accepted
- **Date:** 2026-11-20

## Context

Previously, every **Event** listed in a **Variant**'s `eventIds` automatically became a separate Yes/No **Attendance** question for every **Guest** in the **RSVP**. Organizers who wanted a detailed schedule (e.g. Ceremony, Wishes, Dinner, Cake, Midnight games, Afterparty) forced guests to answer 5–6 attendance radios per person, even when the organizer only wanted to know whether a guest is attending the occasion as a whole or attending 2 specific parts (e.g. Wedding + Afterparty).

## Decision

Decouple schedule visibility (`variant.eventIds`) from **RSVP** attendance granularity by storing site-level attendance settings on `public.sites` (outside **Drafts** and **Releases**, consistent with ADR-0010):

- `rsvp_attendance_mode`: `'overall'` (default for new sites) or `'events'`.
- `rsvp_event_ids`: `text[]` of selected **Event** IDs when `rsvp_attendance_mode = 'events'`.
- In `'overall'` mode, attendance is recorded in `public.attendances` using the reserved sentinel `event_id = '__overall__'` (guaranteed disjoint from `idSchema`, which requires `[a-z0-9]` as the first character).
- In `'events'` mode, each **Invitation**'s allowed RSVP events are the ordered intersection of `variant.eventIds` and `sites.rsvp_event_ids` (preserving ADR-0003 **Variant Projection**). If a **Variant** has zero events in that intersection, it gracefully falls back to `'__overall__'`.
- Switching modes or unchecking events is non-destructive: existing rows in `attendances` are retained so switching back restores them, and the admin UI warns when prior responses exist.

## Considered Options

1. **Store RSVP attendance mode per Variant inside `SiteConfig` (Draft/Release)**: rejected because changing RSVP granularity would require publishing a new **Release**, would be overwritten by **Template** resets, and would split RSVP configuration away from the Guests & RSVP tab.
2. **Create a separate `overall_attendances` table**: rejected because reusing `attendances` with sentinel `'__overall__'` preserves a single code path for headcounts, **Companion** decline cascades, **RSVP Question** visibility, self-registration, and pending-invitation merges.

## Consequences

- New sites default to `'overall'` (one Yes/No per guest), and guests can RSVP even if no schedule **Events** are configured.
- Existing sites that already have event-level rows in `attendances` are backfilled to `'events'` with their recorded `event_id`s so existing responses remain visible.
- `private.resolve_rsvp_event_ids` in SQL and `resolveRsvpEvents` in `packages/domain/src/invitation.ts` share the exact same resolution rules.
