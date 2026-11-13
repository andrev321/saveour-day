# ADR-0008: Hybrid RSVP Without Guest Email or OTP

- **Status:** Accepted
- **Date:** 2026-11-13
- **Supersedes:** [ADR-0007](./0007-custom-guest-otp-and-email-delivery.md)

## Context
Sending invitation links, reminders, and numeric OTP codes via Resend (`email` access mode, `email_deliveries`, `guest_otps`) coupled guest RSVP to email deliverability, required `RESEND_API_KEY`/`MAIL_FROM` configuration, and forced guests without email addresses or who received links over WhatsApp/SMS/print to go through email OTP. Meanwhile, some organizers also want purely informational sites without any RSVP collection.

## Decision
1. **Remove Guest Email Delivery & OTP**: Drop `email_deliveries`, `guest_otps`, `packages/email`, `EmailDeliveryPanel`, and the `email` access mode. Keep Supabase Auth emails exclusively for **Organizers** (account registration, password reset).
2. **Two Access Modes (`public` | `code`)**: Sites use either open `public` access or a shared scrypt-hashed `code` (`Site Code`).
3. **Auto-Generated `short_code` & Collision Alerts**: Every **Invitation** receives a unique-per-site 6-character unambiguous `short_code`. The admin panel detects normalized guest name collisions (`detectGuestCollisions`) across invitations and provides 1-click copy for both `link + code` (shared `/s/<slug>` + `short_code`) and personal `/i/<token>` messages.
4. **Guest Self-Lookup with Overwrite Protection**: On `/s/<public_slug>`, guests can look up their **Invitation** by normalized full name (`normalize_guest_lookup`, diacritic-insensitive) or `short_code` without exposing a public guest directory. Collisions require `short_code` or companion name disambiguation. Invitations with `rsvp_revision > 0` return `locked` on unauthenticated lookups from another device and require `short_code` (or `/i/<token>`) to edit.
5. **Optional Self-Registration (`allow_self_registration`)**: When enabled on a **Site** (default `false`), unmatched guests can submit an RSVP into a `pending_match` queue (`origin = 'self_registered'`), which the **Organizer** can approve or merge (`approve_pending_invitation` / `merge_pending_invitation`).
6. **Info-Only Mode (`rsvp_enabled`)**: When `rsvp_enabled = false` (default `true`), `/s/<public_slug>` and `/i/<token>` hide all RSVP lookup/forms and display event info + `.ics` calendar downloads only, while RSVP write endpoints reject mutations.

## Consequences
- Zero external email provider dependency (`RESEND_API_KEY` / `MAIL_FROM`) for guest flows; `apps/site` and `apps/admin` remain simpler to deploy and operate.
- Organizers can distribute links via any channel (WhatsApp, SMS, Messenger, QR/print) with built-in collision safety and optional self-registration.
