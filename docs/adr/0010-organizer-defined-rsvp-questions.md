# ADR-0010: Organizer-Defined RSVP Questions Outside Releases

- **Status:** Accepted
- **Date:** 2026-11-17

## Context
Sites previously had three hardcoded questions (`diet`, `lodging`, `transport`) stored as booleans in `sites.rsvp_questions`, with labels hardcoded in `apps/site` and answers stored in `invitations.guest_details`. Organizers could not add custom questions, define answer options, or scope questions per invitation vs. per guest or per **Variant**.

## Decision
Store **RSVP Questions** (`rsvp_questions`) and **Question Answers** (`rsvp_question_answers`) as relational tables on the **Site**, outside **Drafts** and **Releases**:
- **Immediate effect**: adding, reordering, or editing questions takes effect immediately without publishing a **Release** and survives **Template** resets.
- **Immutability after answers**: once a question has any **Question Answers**, its `type` (`text`, `single`, `multi`, `number`) and `scope` (`guest`, `invitation`) cannot be changed; the organizer must delete and recreate it.
- **Visibility & validation**: per-guest questions appear only when that **Guest** attends at least one **Event**; per-invitation questions appear when at least one **Guest** on the **Invitation** attends; questions may be restricted to selected **Variants**. Required checks are enforced for guests on the visible set, while organizer edits in admin bypass `required`.

## Considered Options
1. **Store questions inside the Draft/Release JSON schema**: rejected because changing a question (e.g. fixing a typo or adding an option) would require republishing the site, and **Template** resets overwrite the **Draft**.
2. **Allow changing question type/scope in place with lossy conversion**: rejected because existing **Question Answers** would become invalid or silently corrupted.

## Consequences
- `rsvp_questions` and `rsvp_question_answers` use `ON DELETE CASCADE` from `sites`, `invitations`, and `invitation_guests`.
- New sites start with zero questions and offer four **Question Presets** (`diet`, `allergies`, `lodging`, `parking`) as one-click copyable starting templates.
- **Invitation** response status (`answered` / `partial` / `pending`) continues to depend solely on **Attendance**, so adding a new required question later does not flip already-answered invitations back to pending.
