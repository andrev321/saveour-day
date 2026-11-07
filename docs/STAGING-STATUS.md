# Staging status and deployment history

**Current addresses were verified on 2026-11-07.** The service/migration evidence below is a historical record from September–October 2026, not a fresh audit of Supabase, SMTP, or complete user flows.

## Current addresses

| Application | URL |
| --- | --- |
| Admin | https://example-admin-staging.example.com |
| Guest site | https://example-site-staging.example.com |

Repository: `andrev321/saveour-day`; branch: `main`; Vercel team: `example-team`. Projects were renamed to `example-admin-staging` and `example-site-staging`. The separate legacy `slub-strona` project was left unchanged.

Both new origins returned application HTML through authenticated Vercel fetches. The README commit `8855fc6990b6040dacfc76aa1c15b10e1d6d0219` triggered automatic Git deployments. See [Staging operations](STAGING-OPERATIONS.md) for the URL-change follow-up: canonical environment variables, Auth redirects, and test variables were not verified during that change.

Both projects were configured as Next.js, Node 24.x, with roots `apps/admin`/`apps/site` and access to files outside those roots. The working Install Command was:

```sh
cd ../.. && npm ci --include=dev --workspaces --include-workspace-root
```

Initial builds omitted root workspace dependencies; this command resolved that issue. Variables were placed in the Production target of the separate **staging** projects. The owner entered privileged keys directly into service settings.

## Recorded Supabase/Auth setup

Staging project: `example-staging-project`, Frankfurt; API: https://example-staging-project.example.com.

The initial setup recorded three migrations, 13 RLS-enabled tables, and a private `site-media` bucket (8 MiB, JPEG/PNG/WebP). Later migrations below supersede that initial snapshot.

Auth settings recorded: email enabled, registrations and confirmation enabled, anonymous sign-ins disabled. At the time, Site URL was `https://example-admin-staging.example.com` and the redirect ended in `/auth/confirm`. **These are historical configured values, not the new desired origins.** Their update after renaming has not been confirmed here.

Registration and email confirmation through Resend were verified. Full real-service password recovery, guest OTP, upload/publication, and RSVP acceptance was not completed in the original setup. Initial local typecheck/lint, 24 tests, and both builds passed; login and guest demo checks had no console errors.

## Recorded Resend test setup

The owner selected `onboarding@resend.dev` without a custom sender domain. This restricted sender was intended only for the exact Resend account-owner address; other recipients and plus aliases were outside that test.

| Setting | Recorded value |
| --- | --- |
| SMTP host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Sending API key entered directly in Supabase |
| Sender | `onboarding@resend.dev` |
| Sender name | `Pracownia zaproszeń — staging` (historical configured label) |
| Minimum interval per user | 60 seconds |

The `example-staging-sender` sending key was saved by the owner; custom SMTP became active. Confirm signup, Magic Link/OTP, and Reset password templates were saved with Polish subjects/content. Registration and confirmation were tested; reset and guest OTP remained to be tested with the authorized mailbox, assigned to a household for OTP.

Authentication email uses Supabase SMTP, not a Vercel Resend key. The later optional reminder feature separately requires admin `RESEND_API_KEY` and `REMINDER_FROM`.

Before testing other recipients, verify a sender domain, apply provider-supplied DNS records, update the sender/key scope as appropriate, and check delivery limits/link tracking. Application domains can remain on `vercel.app`.

Historical references: [Supabase with Resend SMTP](https://resend.com/docs/send-with-supabase-smtp), [resend.dev restrictions](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## Panel and QR checks recorded

After email confirmation, the panel showed an account-activation message. Personal-event templates used consistent fictional examples in PL/EN/DE.

The general invitation QR generator ran locally in the browser, with code/background colors, element style, and a center heart. Published codes could be copied as PNG. Scanning with at least two phones, particularly after color changes, remained an acceptance step. Later guest management also added household QR codes.

## Recorded migration mappings

The integration assigned remote versions different from local filenames. Do not replay migrations or run `supabase db push` without reconciling actual history.

| Local file | Recorded remote version | Name |
| --- | --- | --- |
| 202609200001_platform.sql | 20260924210635 | platform |
| 202609210001_guest_platform.sql | 20260924210649 | guest_platform |
| 202609230001_invitation_templates.sql | 20260924210816 | invitation_templates |
| 20260929060915_site_soft_delete.sql | 20260929062727 | site_soft_delete |
| 20260929060918_monthly_site_purge.sql | 20260929062743 | monthly_site_purge |
| 20260929063114_isolate_purge_extension.sql | 20260929063222 | isolate_purge_extension |
| 20260929112149_fix_storage_media_read_policy.sql | 20260929112326 | fix_storage_media_read_policy |
| 20260929112334_delete_unused_media.sql | 20260929113018 | delete_unused_media |
| 20260930165858_harden_media_lifecycle.sql | 20260930173525 | harden_media_lifecycle |
| 20260930204955_contextual_editor_v3.sql | 20261001054945 | contextual_editor_v3 |
| 20261005123525_template_sample_media.sql | 20261005193143 | template_sample_media |

This is recorded evidence, not a complete live migration listing. The repository also includes product-review and contextual-sample-media migrations whose remote versions were not recorded in the source report. Verify them against actual history before a release.

## 2026-09-29: Storage read and deletion fixes

The `storage.objects.read_own_media` policy incorrectly resolved an unqualified `name` to `sites.name`. Qualifying `storage.objects.name` restored owner signed-URL access at that time. A transactional owner/RLS check confirmed six files for two images; local tests covered owner/member access and isolation. **The later September 30 lifecycle change removed client signed-URL reads, superseding this flow.**

Unused-image reservation/finalization functions were deployed, restricted to the service role with actor validation in SQL. No user images were deleted during verification. Isolated database tests and Storage fakes exercised deletion; no new function-related advisor warnings were recorded.

Soft-delete migrations and `purge-sites` Edge Function version 1 were deployed. Cron `purge-deleted-sites-monthly` was active at `0 3 1 * *` (03:00 UTC on the first day). Invalid job tokens returned 403, and purge functions were unavailable to anon/authenticated clients. No existing sites were purged; positive deletion used isolated PGlite/Storage fakes.

## 2026-09-30: Media lifecycle hardening

PR #1 merged as `9905cac55f2a9db50a8d4f5434d638bdc5fe7b8f`. Git integration deployed the applications before the migration; the database was updated at 17:35 UTC (19:35 Poland). Future incompatible changes must use the coordinated sequence in [Deployment](WDROZENIE-PLATFORMY.md).

| Component | State recorded after migration |
| --- | --- |
| Admin | READY, `[redacted-id]`, former `example-admin-staging.example.com` alias |
| Guest site | READY, `[redacted-id]`, former `example-site-staging.example.com` alias |
| Supabase | `harden_media_lifecycle`, remote version `20260930173525` |
| Purge worker | ACTIVE version 1; repository code matched, no redeployment needed |
| Purge Cron | Active `0 3 1 * *`, correct worker URL |

Recorded verification:

- Private bucket; only client Storage INSERT through `can_upload_media`; `original_path` hidden.
- Reservation/finalization/deletion functions restricted to service role.
- A transaction rolled back after testing upload reservation, exact variant path authorization, denied owner Storage reads, terminal deleting, late-finalization rejection, and metadata removal.
- Panel root/demo returned 200. Unauthenticated list/upload/media APIs returned 401 with no-store; nonexistent invitation returned 404.
- Invalid purge token returned 403; client purge execution remained denied.
- Two media records and six Storage objects were preserved; no user image deletion or existing-site purge.
- No error/fatal deployment logs in the inspected post-migration window.

PR CI passed 36 tests (including PostgreSQL concurrency), 54 E2E, lint, TypeScript, and demo/admin builds; guest build also passed locally. Full authenticated real upload/read and positive irreversible purge against live Storage were not tested.

Previously issued signed URLs were not revoked. Old upload tokens could remain valid for two hours; read tokens until expiry, possibly longer if issued by clients with historical SELECT access. See [Media lifecycle](USUWANIE-REALIZACJI.md) for the transition procedure.

## 2026-10-01: Contextual editor v3

Change `0a38e3b` reorganized the editor around sections, in-place event/venue/contact editing, per-use crops, and independent variant order/visibility/event permissions. Runtime accepts only v3.

The first migration attempt rolled back because archived-site protection blocked conversion. Fix `21b6c9c` included archives, locked four tables during conversion, temporarily suspended required triggers, and restored them before commit. Deletion state, IDs, and media paths were preserved.

Recorded after migration:

- All seven stored draft/release/history configurations passed strict v3 validation without normalization.
- A site created during rollout brought the count to three sites/drafts, two releases, two snapshots, and two media records.
- No old `upgrade_config_v2` or helper adapters remained; protection triggers were active.
- Snapshot restore, publish, and stale-revision rejection were tested in a rolled-back transaction.
- No new advisor warnings compared with the previous state.
- Both Vercel apps were READY; guest demo worked. Admin required login and its development `/demo` route was disabled on Vercel. Full editor checks were local/CI.

CI for `0a38e3b` passed typecheck, lint, 42 tests with PostgreSQL, builds, and 59 E2E. Older database fixtures were then updated to include prerequisite migrations/triggers; consult GitHub Actions for that final commit's result.

## 2026-10-05: Sample media

`template_sample_media` was applied as remote `20261005193143` to `example-staging-project`; local file `20261005123525_template_sample_media.sql`. Earlier migrations were compared by name because timestamps differed.

SQL accepted exact sample manifests, rejected substituted paths, and confirmed no direct anon/authenticated EXECUTE on the new private function. Local checks: 55 tests passed, one external-PostgreSQL test skipped; nine E2E, lint, TypeScript, and both builds passed. No new migration-function advisor warnings were reported.

## Historical advisor findings and remaining acceptance

These findings were recorded then, not re-queried for this documentation update:

- `extension_in_public` for pg_net. Automatic approval rejected recreating it in `extensions` because that could disrupt the dispatcher. It remained in place.
- `isolate_purge_extension` contained REVOKE USAGE, but managed grants from `supabase_admin` still applied. Do not treat migration success as proof of revocation. Do not expose `net` through the Data API.
- SECURITY DEFINER warnings for `can_access_site`, `is_platform_admin`, and pre-existing `rls_auto_enable`; the first two check identity for RLS, but permissions still require production review.
- `can_upload_media` intentionally grants authenticated EXECUTE and checks identity/site/state/expiry/secret path; anon access was revoked.
- Leaked-password protection was disabled.
- RLS without client policies on `access_attempts` and `guest_sessions` was intentional: server-only access.

References: [pg_net permissions](https://supabase.com/docs/guides/database/extensions/pg_net#permissions), [extension warning](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [anonymous SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Use [Testing](TESTING.md) and the [acceptance checklist](WDROZENIE-PLATFORMY.md) to close real SMTP/OTP, authenticated media, RSVP, and production-readiness gaps. Do not convert historical observations into a claim that all current flows have passed.
