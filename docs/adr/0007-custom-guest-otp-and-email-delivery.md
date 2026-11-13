# ADR-0007: Custom Guest OTP and Unified Email Delivery

- **Status:** Superseded by [ADR-0008](./0008-hybrid-rsvp-without-guest-email.md)
- **Date:** 2026-11-12

## Context
Previously, guest **OTP** verification relied on Supabase Auth (`signInWithOtp` / `verifyOtp`) and Supabase SMTP, which created `auth.users` rows for guests and coupled guest authentication to Supabase Auth rate limits. Meanwhile, outbound RSVP reminders used a dedicated `reminder_deliveries` table with `REMINDER_FROM`, while invitation link emails had no delivery ledger.

## Decision
1. **Custom Guest OTP**: Store hashed short-lived numeric **Guest OTP** codes in `public.guest_otps` (`create_guest_otp` / `verify_guest_otp` RPCs with bounded attempts and TTL expiry) and send OTP emails directly via Resend (`RESEND_API_KEY` + `MAIL_FROM`). Reserve Supabase Auth and optional Supabase SMTP exclusively for **Organizers**.
2. **Unified Email Delivery**: Replace `reminder_deliveries` with `public.email_deliveries` supporting both `invitation` and `reminder` kinds, claimed and finalized in batches via `claim_email_batch` and `finalize_email_batch` with per-site daily limits, per-recipient daily deduplication, and lease-based idempotency.

## Consequences
- Guests never create `auth.users` accounts; both `apps/admin` and `apps/site` use `RESEND_API_KEY` and `MAIL_FROM` for transactional email.
- Invitation emails and RSVP reminders share a single audited delivery ledger, retry lease, and daily site quota.
