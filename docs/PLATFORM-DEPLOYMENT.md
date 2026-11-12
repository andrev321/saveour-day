# Deploying the invitation platform

Start with the [deployment checklist](DEPLOYMENT-CHECKLIST.md) for accounts, settings, variables, and initial setup. Use [Staging status](STAGING-STATUS.md) for recorded environment evidence; do not interpret this guide as a production sign-off.

## Deployment model

Each environment has two Next.js applications (`apps/admin`, `apps/site`) and one Supabase project for Postgres, Auth, and private Storage. Staging and production require separate databases and keys. Use Node.js 24.

Publishing content is a database transaction, not a deployment. It validates the draft/media, creates a release, and updates `sites.published_release_id`. Content rollback does not roll back RSVP or permissions. Code deployments update the shared runtime.

The current application accepts schema v3 only.

| Example route | Purpose |
| --- | --- |
| `https://app.example.com` | Organizer panel |
| `https://invitations.example.com/s/<public_slug>` | General invitation |
| `/i/<token>` | Individual/household link |
| `/v/<invitation_id>` | Invitation selection after OTP; session required |

Per-site custom domains and payments are not part of the implementation. Organizers can distribute individual `/i/<token>` links manually or send initial invitations and reminders from the panel when using `email` access mode. Guest content and private images are authorized by the application, use `private, no-store`, and are not passed through a public image optimizer.

## Database migration procedure

**New environment:** apply every SQL file in `supabase/migrations` in filename order. The chain includes the initial platform and guest tables, templates, deletion/retention, Storage fixes, media lifecycle, contextual editor v3, product improvements, and sample media.

**Existing environment:**

1. Back up the database and Storage and identify the deployed application commit.
2. Compare local migrations with the actual remote migration history by version, name, and content. Do not assume local timestamps match staging timestamps.
3. Test the missing migrations and intended application version on an isolated environment.
4. For incompatible schema changes, prevent old application writes during the coordinated migration/deployment window.
5. Apply only missing migrations in dependency order, then deploy both compatible applications.
6. Validate stored configurations, permissions, publication, snapshots, media, and RSVP before restoring normal use.

The media lifecycle migration must precede code that uses the new upload/read flow. Sample-media migrations must precede applications using those manifests. Historical staging version mappings are recorded in [Staging status](STAGING-STATUS.md); missing entries are not proof a migration was or was not applied.

## Service configuration

Use the checklist as the single source for the environment-variable table and Auth email templates.

- Keep `site-media` private. Privileged keys stay server-only.
- Set Auth Site URL to the panel, with `/auth/confirm` allowed. Guest OTP is entered in the guest app.
- Configure custom SMTP and delivery limits; disable authentication-link tracking.
- Use Next.js presets, root directories for each app, the root workspace install, and no Vite SPA rewrites.
- Set canonical HTTPS `APP_URL`/`SITE_URL` origins and redeploy after changes.
- Retire obsolete publication secrets (`VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_GITHUB_REPO_ID`, `ENGINE_GIT_SHA`, `VERCEL_WEBHOOK_SECRET`) and the old build webhook if still configured.
- Configure retention using [Site deletion](SITE-DELETION.md).
- Keep the platform's trusted IP handling intact; a different hosting platform needs its own trusted IP extraction.

Organizers confirm their email and create their own sites; no platform-admin role is required. Organizers and guests share Auth infrastructure but use separate permissions and session cookies. A prior OTP user can set an organizer password through recovery. CAPTCHA needs corresponding application support before it is enabled.

## Publish and invite

1. Create a site, choose a template or blank start and content language, then edit and save.
2. Set the general variant, access mode, and optional RSVP deadline (Europe/Warsaw). Access codes require at least eight characters; an empty code field during editing keeps the previous code.
3. Publish. After the first publication, publish new variants before assigning invitations to them.
4. Add a household, its guests, variant, and allowed email addresses. Each address represents that entire household.
5. Copy the generated link securely. Only the hash is stored; rotating generates a new link and invalidates the old link and relevant sessions.
6. Public household links allow RSVP; code mode also requires the site code, and email mode requires OTP. The general email entry lists invitations associated with the verified address.
7. Review answers and notes in the panel. Guests may edit until the deadline; organizers may correct them afterward while an active publication exists.

No response differs from declining. Historical answers remain after events are removed. Access changes invalidate the relevant sessions; revocation does not erase content already downloaded.

## Acceptance on real services

Run the local/CI checks in [Testing](TESTING.md), then separately verify on actual staging:

- Two organizer accounts, confirmation, and cross-account access denial.
- Upload/read, publishing, independent draft edits, republishing, and content restoration.
- All three access modes with fresh sessions.
- Real OTP delivery, invalid/expired codes, disallowed addresses, and resending.
- No private content in unauthenticated HTML, metadata, APIs, or direct media responses.
- Rejection of another household's, guest's, event's, and image's IDs.
- Revocation, code changes, and unpublishing with existing sessions.
- RSVP for two guests, changed answers, two-tab conflicts, deadline behavior, and organizer correction.
- No Vercel build triggered by content publication and no cross-site data mixing.
- Template reset/snapshots, CSV, optional questions, calendar, and authorized reminder delivery when enabled.

Record date, commit, environment, results, and untested paths. Automated HTTP mocks do not prove SMTP, Auth, or Storage delivery.

## Operations

Monitor 5xx errors, 429 responses, email delivery, and publication/RSVP audit records. Use request IDs for correlation. Do not log guest names, email addresses, codes, tokens, or full `/i/...` paths. Restrict retention/access to hosting logs that may contain URLs.

Configure alerts, database and Storage backups, and recovery tests before production. For repository/domain changes, use [Staging operations](STAGING-OPERATIONS.md).
