# Staging operations

## Current project addresses

| Application | Vercel project | URL |
| --- | --- | --- |
| Admin | `example-admin-staging` | https://example-admin-staging.example.com |
| Guest site | `example-site-staging` | https://example-site-staging.example.com |

Repository: `andrev321/saveour-day`. Branch: `main`. Vercel team: `example-team`.

The addresses and project names were changed on **2026-11-07**. Both new origins returned application HTML in an authenticated Vercel fetch. This is a routing check, not a login/RSVP acceptance test. Existing Vercel authentication protection was retained.

## Repository rename and automatic deploys

The README commit `8855fc6990b6040dacfc76aa1c15b10e1d6d0219` triggered Git deployments for both applications after the repository became `saveour-day`. Reconnecting Git was not required for that test.

For future checks, open each project's Git settings and verify the repository/production branch. After an authorized push, compare the deployment's commit SHA with GitHub. A queued/building deployment confirms the trigger; only READY confirms a completed build.

The separate legacy `slub-strona` project was not renamed or retired as part of the staging URL change.

## Follow-up after a domain change

Adding an alias and renaming a Vercel project do not prove that application configuration has changed. Review:

1. Admin `APP_URL` → the admin origin above.
2. Admin and guest `SITE_URL` → the guest origin above.
3. Supabase Auth Site URL → the admin origin, and allowed redirect → `<admin-origin>/auth/confirm`.
4. GitHub staging variables `STAGING_ADMIN_URL` and `STAGING_SITE_URL`.
5. Authenticated test storage state, browser bookmarks, generated invitation links, and QR codes.
6. Redeployment after changing environment variables, then account confirmation/recovery, mutation origin checks, invitation links, media, and RSVP.

These configuration follow-ups were **not verified during the URL rename**. Do not mark them complete based only on the new homepages loading. Keep old aliases until dependent flows and previously shared links have been reviewed; deleting an alias can break existing links.

## Investigating failures

- Match the failing deployment to the intended project, branch, and commit.
- For build failures, inspect build logs and workspace installation/root-directory settings.
- For wrong links or request-origin errors, compare the actual origin with `APP_URL`/`SITE_URL`.
- For authentication redirects, check Auth Site URL and allowed redirect configuration.
- For database errors, compare applied migration history; do not replay historical migrations.
- For media errors, use the lifecycle guide and preserve pending deletion state.
- For email failures, check provider restrictions, recipient eligibility, Auth logs, and rate limits.

See [Staging status](STAGING-STATUS.md) for historical migration evidence and known acceptance gaps, [Testing](TESTING.md) for smoke setup, and [Deployment checklist](CHECKLISTA-WDROZENIA.md) for a new environment.
