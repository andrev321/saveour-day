# Production operations

Production admin panel: https://saveour-day-admin-production.vercel.app. Set admin `APP_URL` and the Supabase Auth Site URL to this origin.

## Provision

- Keep production Supabase, credentials, and storage separate from staging.
- Create separate Vercel projects for `apps/admin` and `apps/site`. Use Node.js 24 and allow access to files outside each project root.
- Keep both production projects disconnected from GitHub for manual releases. Staging can retain automatic deploys.
- Set the install command below for both applications. Configure secrets, migrations, SMTP, and the retention worker using the [deployment checklist](DEPLOYMENT-CHECKLIST.md).

```sh
cd ../.. && npm ci --include=dev --workspaces --include-workspace-root
```

Keep the project inventory, deployed commit, deployment IDs, and acceptance evidence in a private operator record.

## Release

Preferred: run `.github/workflows/production-deploy.yml` (*Actions → Deploy production → Run workflow*). It pushes pending `supabase/migrations/` to production first (`PROD_SUPABASE_DB_URL`, the IPv4 Session pooler URI), and only after migrations succeed deploys `apps/admin` and `apps/site` to Vercel (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROD_ADMIN_PROJECT_ID`, `VERCEL_PROD_SITE_PROJECT_ID`).

Manual fallback from a clean checkout of the tested release commit (run from the repository root for each application at the same commit, substituting the actual team, project, and deployment values):

```sh
vercel link --project "<production-project>" --scope "<team>"
vercel deploy --prod --skip-domain --scope "<team>"
vercel promote "<deployment-url>" --scope "<team>"
```

Inspect the candidate deployment before promotion. Reconcile migration history before applying changes to an existing database. After promotion, follow the [deployment acceptance checks](PLATFORM-DEPLOYMENT.md) for both applications. Verify account confirmation, password recovery, guest OTP, media, publication, and RSVP with authorized test accounts.

## Roll back

Promote a previous deployment compatible with the current database schema. Keep database and Storage recovery procedures separate. Use staging credentials only with staging projects.
