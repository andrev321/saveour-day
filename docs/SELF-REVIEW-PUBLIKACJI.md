# Publication self-review — 2026-09-22

**Historical report.** Results below describe checks recorded on that date, not the current commit or production readiness. Current workflows are in [Architecture](ARCHITEKTURA.md), [Testing](TESTING.md), and [Deployment](WDROZENIE-PLATFORMY.md).

## Fixes recorded

- Link rotation could reactivate a revoked invitation whose variant was absent from the publication. SQL now checks the published variant; the test also verifies revocation survives rejected rotation.
- Historical RSVP rows could exhaust the Supabase result limit before current answers. Queries filter events before fetching, within the 20 guests × 50 events bound.
- OTP sending and verification shared an attempt counter. They now have separate counters plus the global IP limit.
- The panel offered unpublished draft variants. After publication it uses published variants; before first publication it uses the draft.
- Session loss during RSVP left a stale form. The interface rechecks access and returns to the appropriate gateway. A sessionless `/v/` route in public/code mode instructs guests to use the original link.
- An invalid application URL could fail after invitation creation. URL validation now precedes mutation.
- Invitation operations overwrote unsaved access settings. Refresh now preserves that form state.

## Cleanup recorded

- Removed synthetic deployment records from API/editor history; history uses releases directly.
- Removed an unused platform-admin helper.
- Unified RSVP validation between panel and guest application.
- Added `server-only` dependency declarations, environment examples, and separate guest-environment validation.
- Kept old tables/migrations for history and safe transitions.

## Verification recorded on 2026-09-22

- TypeScript, ESLint, and both production builds passed.
- 20 automated tests passed, covering SQL/RLS, projection, cryptography, rendering, and actual API handlers.
- 24 Playwright tests passed. Four guest/panel tests were repeated after final fixes, including session loss.
- API tests controlled Supabase HTTP responses and cookies; they did not replace real-service acceptance.

## Operational state at the time

The working environment had no Supabase credentials or configured SMTP. No remote migrations or production deployment were performed in that review. Service/domain setup, migrations, real OTP/Storage acceptance, and disabling legacy public copies remained.

Later staging work is recorded separately in [Staging status](STAGING-STATUS.md). Do not carry these historical blockers or passing counts forward as current facts.
