# Staging operations

Use dedicated Vercel and Supabase projects and separate credentials for staging. Record the real project names and origins in a private operator record. The staging Git integration can deploy changes automatically. Confirm that both deployed applications use the intended branch and commit.

## Configure or change origins

1. Set admin `APP_URL` to the admin origin and `SITE_URL` in both applications to the guest origin.
2. Set the Supabase Auth Site URL to the admin origin and allow `<admin-origin>/auth/confirm`.
3. Update the GitHub staging variables `STAGING_ADMIN_URL` and `STAGING_SITE_URL`.
4. Refresh test browser state if the origin changed. Store it in the staging environment secret.
5. Redeploy both applications, then verify account confirmation and recovery, media, invitation links, QR codes, and RSVP. Keep old aliases until you verify previously shared links.

Run the [staging smoke test](TESTING.md#manual-staging-smoke-workflow) and record the commit, environment, and observed results. If Vercel Authentication is enabled, arrange authorized access for the test account.

For wrong links or origin errors, compare the actual browser origin with `APP_URL` and `SITE_URL`. For SMTP failures, check provider restrictions, recipient eligibility, Auth logs, and rate limits. Follow the [deployment guide](WDROZENIE-PLATFORMY.md) for migration and full acceptance checks.
