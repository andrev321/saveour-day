# Production operations

## Environment inventory

Production is provisioned separately from staging. Both applications share the production Supabase project; no staging users, invitation data, or files have been copied.

| Resource | Production |
| --- | --- |
| Vercel team | `example-team` (`[redacted-id]`) |
| Admin project | `example-admin-production` (`[redacted-id]`) |
| Guest project | `example-site-production` (`[redacted-id]`) |
| Admin domain | https://example-admin-production.example.com |
| Guest domain | https://example-site-production.example.com |
| Supabase | `example-production-project` (`example-production-project`), example-organization, Frankfurt (`eu-central-1`) |

Both Vercel projects use Next.js, Node.js 24, their respective `apps/admin` and `apps/site` root directories, and shared files outside those directories. Install command:

```sh
cd ../.. && npm ci --include=dev --workspaces --include-workspace-root
```

## Manual releases only

Production projects were created **without a Git repository connection**, with `skipGitConnectDuringLink` enabled. A push to GitHub must not create production deployments. Staging retains its existing automatic Git deployments. Both staging and production use Vercel's Production target in different projects; the project and credentials determine the actual environment.

Do not import/connect the production projects to GitHub or promote a staging build into production: staging builds contain staging configuration.

After completing the setup below, release manually from a clean checkout of an explicitly selected, tested commit. With an authenticated Vercel CLI, link the checkout to the existing production project using `vercel link --project <production-project-name> --scope example-team`; preserve the existing monorepo settings. Deploy from the repository root using `vercel deploy --prod --skip-domain --scope example-team`. Verify the staged production deployment, then use `vercel promote <deployment-url> --scope example-team`. Repeat for the other application at the **same commit**, relinking the checkout to its project first.

These commands are an operator procedure, not an installed GitHub Actions workflow. The first production release and this procedure have not yet been exercised. Review pending database migrations before each release; reconcile remote migration names/content, since MCP-generated migration timestamps differ from repository filenames. Never blindly push the full migration chain to an existing database.

## Setup status — 2026-11-07

Provisioned and verified:

- Both Vercel project domains belong to the intended project.
- Production projects are absent from the repository's Git-linked project inventory.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SITE_URL` are set for the Production target only in both projects; `APP_URL` is set in the admin project.
- Supabase Auth Site URL is the production admin origin. The allowlist includes exactly `https://example-admin-production.example.com/auth/confirm`.
- Vercel Authentication is configured for preview deployments; production guests should not require a Vercel account.
- A separate Supabase project was created after a quote of USD 0/month. This is the creation quote, not a guarantee about future usage or plan changes.
- The first eight repository migrations were applied in dependency order, through `20260929112334_delete_unused_media.sql`.

**Not live / incomplete:**

- The migration `20260930165858_harden_media_lifecycle.sql` was blocked by automatic approval review because it changes Storage upload permissions and media lifecycle capabilities. It has not been applied. The four subsequent migrations have not been applied either.
- The production server key still needs to be saved as `SUPABASE_SERVICE_ROLE_KEY` in both Vercel projects, restricted to Production. Never copy the staging key or put the key in Git, documentation, chat, or a public variable.
- Configure confirmation, recovery, and numeric OTP templates and custom SMTP using the [deployment checklist](CHECKLISTA-WDROZENIA.md). Real email delivery remains unverified.
- Deploy the retention worker and configure its schedule after the complete migration chain; see [media lifecycle](USUWANIE-REALIZACJI.md).
- No application deployment has been created in either production project. Domain assignment does not mean an application is running.
- No production end-to-end acceptance, email delivery, runtime error scan, backup/restore test, or monitoring configuration has been completed.

Do not launch or accept real customer data until migrations, secrets, Auth/email, and [acceptance checks](WDROZENIE-PLATFORMY.md) are complete. Update this status with the deployed commit and verification evidence after the first successful release.

## Rollback and isolation

Roll back each application only to a build compatible with the production schema. Application rollback does not undo database migrations, RSVP, or other stored data. Keep database and Storage recovery procedures separate.

Never run staging smoke tests against production using staging credentials. Keep production server secrets out of Preview and Development targets. Optional reminders require their own verified sender and admin-only settings; they are not configured by this provisioning step.
