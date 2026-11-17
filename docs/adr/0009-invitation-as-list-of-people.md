# ADR-0009: Invitation as a List of People

- **Status:** Accepted
- **Date:** 2026-11-17

## Context
Previously, an **Invitation** required a mandatory family/household `label`, stored **Named Guests** in a JSONB array, modeled an unnamed companion as a separate `allow_plus_one` flag + `plus_one` JSONB column, and kept removed people in `archived_guests`. Every SQL RPC, admin view, and CSV export had to branch on `plus_one` and `archived_guests`, and companions were excluded from admin headcounts.

## Decision
Model every **Invitation** as a relational list of 1 to 20 **Guests** (`invitation_guests`), each with `kind` (`named` | `companion`) and optional `group_name` on the **Invitation**:
- A **Companion** is a regular row on the list with `kind = 'companion'` and nullable `name`. Multiple companions per invitation are allowed within the 20-guest limit.
- A **Companion** can attend an **Event** only if at least one **Named Guest** on the same **Invitation** attends that **Event** (enforced in both UI and server).
- **Guest Lookup** searches only `named` guests added by the **Organizer**. An **Organizer** can convert a **Companion** into a **Named Guest** (preserving their **Attendance** and **Question Answers**).
- Drop `archived_guests`: removing a **Guest** cascades to their **Attendance** and **Question Answers** after confirmation.

## Considered Options
1. **Keep `allow_plus_one` boolean + `plus_one` slot**: rejected because it prevents inviting multiple unnamed companions (e.g. a couple plus unnamed children) and duplicates logic across SQL and UI.
2. **Add a `companion_slots` integer counter**: rejected because each companion needs independent **Attendance**, **Question Answers**, and an optional name.

## Consequences
- `attendances` (formerly `rsvp_answers`) references `invitation_guests(id)` with `ON DELETE CASCADE`, eliminating manual cross-invitation UUID checks in SQL.
- Headcounts, filters, and CSV exports treat **Named Guests** and **Companions** uniformly, with companion counts called out in summary captions.
- Data migration is destructive (existing invitations, answers, and guest sessions of kind invitation are cleared).
