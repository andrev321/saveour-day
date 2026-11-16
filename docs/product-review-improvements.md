# Product review improvements

The editor autosaves validated drafts after 1.8 seconds of inactivity, keeps edits made during a pending request, and records up to 50 undo steps. A failed save requires a retry. A revision conflict loads the current server draft and offers a three-way merge; overlapping fields require a user choice. Per-tab recovery retains unsaved changes for seven days, including unfinished text fields. Publishing remains a separate action with readiness checks.

Guest management includes per-event totals, search, response filters, pagination, CSV export/import, stable household member IDs, archived members, family QR codes and confirmation before invalidating links or taking an invitation offline. CSV headers are `rodzina;goscie;email`; separate multiple names or email addresses with `|`. Import is atomic and retry-safe. Export protects spreadsheet formula cells. Store newly generated family links securely: the server stores only token hashes and cannot reveal the same secrets again.

Guests receive localized Polish, English or German forms, themed controls, a sticky RSVP action, saved response summary and a calendar download scoped to their invitation. Organizers can enable diet/allergy, accommodation and transport questions. Disabling a question hides it from guests and preserves its previous answer for organizers.

## Database and reminder setup

Apply `supabase/migrations/20261004111003_product_review_improvements.sql` before deploying the new apps. It is additive, preserves existing RSVP rows, and keeps operations restricted to the service role behind authenticated API routes.

Invitation and reminder emails require server-only `RESEND_API_KEY` and `MAIL_FROM`, with a sender domain verified in Resend (updated in `202611120001_invitations_rsvp_v2.sql`). The panel offers recipient and message preview, then explicit selection and sending in batches of up to 50 via Resend Batch API, subject to a per-site daily quota. Each invitation/kind/address is limited to one delivery per UTC day; retries use a stable provider idempotency key and a stored payload. No background campaign starts automatically. Provider errors show individual outcomes. Verify delivery with an authorized test recipient before enabling live sending.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, builds for both workspaces, and `npm run test:e2e`. GitHub quality checks run PostgreSQL and Chromium plus selected WebKit flows. PostgreSQL concurrency tests require `TEST_DATABASE_URL` and must use a disposable database.

The manual **Staging smoke** workflow tests actual storage, draft persistence, publication, access code, RSVP and calendar, then soft-deletes its own disposable project. Configure the staging environment variables `STAGING_ADMIN_URL`, `STAGING_SITE_URL` and secret `STAGING_PANEL_STORAGE_STATE` containing Playwright storage state for a dedicated test account. Hosts must contain `staging`; never use a production session. The smoke test does not send emails. Real OTP delivery and reminders require a separately authorized mailbox acceptance test; the deterministic guest tests cover the email gateway UI and the SQL tests cover access boundaries.

API failures include `X-Request-Id` for correlation. Server logs redact invitation keys and do not include guest names, tokens or email addresses.
