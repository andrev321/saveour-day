# Deployment checklist

Use this checklist for a new environment, first staging and then production. It is not evidence that the steps have been completed. [Deployment](PLATFORM-DEPLOYMENT.md) contains migration and legacy-transition details; [Staging status](STAGING-STATUS.md) records historical checks and current addresses.

## 1. Prepare accounts and access

- [ ] Push the intended code, lockfile, and migrations to GitHub.
- [ ] Confirm access to Vercel, Supabase, a transactional SMTP provider, and sender-domain DNS.
- [ ] Prepare separate staging and production Supabase projects and credentials.
- [ ] Prepare two organizer test accounts and an authorized guest mailbox.
- [ ] Record non-secret environment details: Supabase project ID, Vercel project names, admin/site origins, sender address, and responsible operator.
- [ ] Confirm hosting, database, Storage, and email budgets. Keep keys in service settings or a password manager, never Git.

Stable `vercel.app` addresses are sufficient for the applications. The email sender domain is a separate requirement. Each household does not need its own domain or Vercel project.

## 2. Database and Storage

- [ ] Back up an existing database and Storage before changes.
- [ ] For a fresh database, apply **all** SQL files in `supabase/migrations` in filename order, not just the first three.
- [ ] For an existing database, reconcile local and remote migration history and apply only missing changes. Staging has different historical version numbers; do not blindly run `db push`.
- [ ] Confirm application tables, including `sites`, `drafts`, `releases`, `invitations`, `rsvp_answers`, `guest_sessions`, `guest_otps`, `email_deliveries`, `access_attempts`, and `draft_snapshots`.
- [ ] Confirm that `site-media` is private, with the intended image limits and current upload policy. Do not add anonymous read access.
- [ ] Obtain the project URL, public/publishable key, and server-only privileged key. The code reads the privileged key from `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Deploy and configure the retention worker using [Site deletion](SITE-DELETION.md).

Organizers register and receive membership when creating a project. Ordinary clients do not need manual entries in `platform_admins`.

## 3. Authentication and email

- [ ] Verify the sender domain with Resend using its supplied DNS records.
- [ ] Optionally configure custom SMTP in Supabase Auth **only for organizer accounts** (signup confirmation and password reset). Guest OTP, invitation emails, and RSVP reminders are sent directly via Resend using `RESEND_API_KEY` and `MAIL_FROM`.
- [ ] Enable email authentication, registrations, and email confirmation. Do not enable CAPTCHA until the application supports it.
- [ ] For Google OAuth, configure Web Client ID in Google Cloud Console with Supabase OAuth callback (`https://<project-ref>.supabase.co/auth/v1/callback`).
- [ ] Enable Google Provider in Supabase Auth, supply Client ID & Secret, and enable "Link accounts with same email".
- [ ] Set Auth **Site URL** to the admin origin and allow `<admin-origin>/auth/confirm` as a redirect.
- [ ] Configure the organizer Auth templates below, preserving the template expressions exactly.
- [ ] Check Resend rate limits, OTP expiry, and delivery to an authorized test recipient. The guest form accepts 6-digit numeric codes.
- [ ] Disable provider link tracking for authentication email.

| Organizer Auth template | Required HTML example |
| --- | --- |
| Confirm signup | `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your account</a>` |
| Reset password | `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Set your password</a>` |

Supabase sends organizer authentication email through its built-in mailer or optional custom SMTP. Guest OTP, invitation links, and RSVP reminders use server-only `RESEND_API_KEY` and `MAIL_FROM` in both applications.

For optional organizer SMTP with Resend, the settings are `smtp.resend.com`, port `465`, username `resend`, and a sending API key as the password. The restricted `onboarding@resend.dev` sender is for the exact account-owner address, not general guest testing. Check Resend's [Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp) when configuring organizer SMTP.

## 4. Vercel applications

Import the same repository into two projects:

| Setting | Admin | Guest site |
| --- | --- | --- |
| Root Directory | `apps/admin` | `apps/site` |
| Framework | Next.js | Next.js |
| Node.js | 24.x | 24.x |
| Output Directory | Next.js default | Next.js default |
| Build | App's `build` script | `apps/site/vercel.json` |
| Shared files | Include files outside Root Directory | Include files outside Root Directory |

Use this Install Command in both projects:

```sh
cd ../.. && npm ci --include=dev --workspaces --include-workspace-root
```

- [ ] Assign stable admin/site domains and verify HTTPS.
- [ ] Set environment variables for the intended deployment target. The dedicated staging projects use Vercel's Production target but staging Supabase credentials.
- [ ] Deploy both applications after the required migrations.
- [ ] Verify that guest access has the intended Vercel protection. Staging may remain protected; real guests must not need a Vercel account in production.

| Variable | Admin | Guest site |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required | Required |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Required | Required |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Server secret |
| `APP_URL` | Canonical admin origin | Not used |
| `SITE_URL` | Canonical guest origin | Same guest origin |
| `RESEND_API_KEY` | Server secret (invitations & reminders) | Server secret (guest OTP) |
| `MAIL_FROM` | Verified transactional sender | Same verified transactional sender |

Use HTTPS origins without paths or query strings. Both applications must use the same Supabase environment and `SITE_URL`. Do not expose production secrets to untrusted previews. Redeploy after changing environment variables.

Changing a domain also requires reviewing `APP_URL`, `SITE_URL`, Auth Site URL/redirects, and staging test URLs. A working homepage alone does not verify login or mutation origins. See [Staging operations](STAGING-OPERATIONS.md).

## 5. Acceptance and maintenance

- [ ] Register and confirm an organizer, create a site, upload an image, save, and publish.
- [ ] Check template selection, blank drafts, reset cancellation/confirmation, and snapshot restoration.
- [ ] Check autosave, recovery after refresh, undo/redo, and two-tab revision conflicts.
- [ ] Test public/code/email access, images, and RSVP with fresh sessions.
- [ ] Test two household members, CSV import/export, archiving/restoring members, optional questions, and calendar downloads.
- [ ] Check code changes, link rotation/revocation, unpublishing, and stale sessions.
- [ ] Verify that a second organizer cannot access the first organizer's site or media.
- [ ] Run the dedicated-account Staging smoke workflow and record commit/date/results; see [Testing](TESTING.md).
- [ ] Review invitation/reminder recipients and content, and verify delivery to an authorized test mailbox.
- [ ] Complete the deeper acceptance scenarios in [Deployment](PLATFORM-DEPLOYMENT.md).
- [ ] Configure monitoring, error ownership, cost/delivery checks, database **and Storage** backups, and a tested restore procedure.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Demo works but a client route returns 503 | Environment variables, migrations, server logs |
| Request-origin error | Current host versus `APP_URL`/`SITE_URL` |
| OTP is not delivered | `RESEND_API_KEY`, `MAIL_FROM`, sender DNS, limits, invitation email, spam, server logs |
| Account confirmation fails | Auth Site URL, `token_hash`, `type=signup`, expiry |
| Invitation returns 404 | Publication, correct link, revocation, soft deletion |
| Missing workspace modules during build | Root lockfile and workspace Install Command |
