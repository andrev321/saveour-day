# Site deletion and media lifecycle

## Soft deletion

A site owner or platform administrator can delete a site from the project list after confirmation. Other collaborators cannot perform the operation.

`DELETE /api/sites/:id` checks session, origin, and project access. `soft_delete_site` atomically records `deleted_at`/`deleted_by`, clears publication, and increments the access version. RLS and server queries hide the site, drafts, releases, and media. Guest routes/APIs return 404. Triggers reject writes to deleted sites, including in-flight requests. Data remains until purge; the panel has no restore action.

## Monthly purge

Supabase Cron `purge-deleted-sites-monthly` runs at **03:00 UTC on the first day of each month**. It selects only:

```sql
deleted_at < now() - interval '1 month'
```

This is a calendar month, not 30 days. Normal retention is roughly one to almost two months; failures may retain data longer.

The database dispatcher creates a private job and invokes the `purge-sites` Edge Function through pg_net. A random token is scoped to one site, expires after six hours, and cannot reclaim a started job. Only its SHA-256 hash is stored; the service-role key is not placed in the schedule/request body.

The worker first removes every object under the site's `site-media` prefix through the Storage API, in batches of 500, including unfinished uploads. It then deletes RSVP answers, guest sessions, invitations, legacy deployment records, snapshots, releases, media metadata, audit history, drafts, memberships, and the site. Finalization rechecks retention eligibility and absence of files. Never delete `storage.objects` metadata directly with SQL.

Failure preserves the site record and marks the job failed. A later monthly run retries; expired interrupted/undispatched jobs become eligible too. Partially deleted files are not restored.

## Configure the worker

1. Apply missing migrations according to actual environment history; see [Staging status](STAGING-STATUS.md).
2. Deploy `supabase/functions/purge-sites/index.ts` with `handler.ts`. Its `verify_jwt=false` setting is paired with the one-time job token validated in the database before file access. Anonymous and authenticated application clients cannot execute purge functions. The worker uses standard `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables.
3. As database owner, configure the project origin:

```sql
select private.configure_site_purge('https://PROJECT_REF.supabase.co');
```

Calling it again updates the same schedule rather than creating another. Configuration alone does not run a purge.

## Inspect execution

```sql
select jobname, schedule, active from cron.job
where jobname = 'purge-deleted-sites-monthly';

select runid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'purge-deleted-sites-monthly')
order by start_time desc limit 10;

select site_id, status, attempts, requested_at, expires_at, last_error
from private.site_purge_jobs order by requested_at desc;
```

Cron success means dispatch succeeded, not that the worker finished. Inspect Edge Function logs and failed or expired queued/running jobs. A completed job disappears with its site. Never log job tokens or full worker requests.

RLS without client policies on `private.site_purge_jobs` is intentional: clients must not access it.

## Current media lifecycle

`20260930165858_harden_media_lifecycle.sql` introduced the current flow. Apply it before applications that rely on it. It adds `processing`, removes client Storage read/signing access, and hides `original_path`. Legacy prepare/finalize-upload API actions are no longer used.

1. The panel sends raw JPEG/PNG/WebP in one `POST /api/sites/:id/media` request.
2. The server limits the stream to 8 MiB, reserves an asset under a site lock with a ten-minute lease, and creates processed WebP variants under an unpredictable private prefix.
3. Storage upload uses the organizer's JWT. The INSERT policy checks the active site, secret prefix, and unexpired `processing` state. Clients have no SELECT/UPDATE/DELETE policy. Do not replace upload authentication with a privileged client.
4. SQL finalization requires unexpired processing and existing manifest objects.
5. Processing failure starts prefix cleanup. Storage failure retains metadata/deletion reservation for retry.

`deleting` is terminal: do not reset it manually to ready. Before each upload, cleanup considers error/deleting and expired pending/processing records; reservation rechecks status so a late cleanup cannot delete an asset that became ready. The 100-record library limit includes unfinished records; the five-concurrent-upload limit is checked under the same lock.

Admin reads use `GET /api/sites/:id/media/:asset/:file`, with site authorization, ready-state checks, and `private, no-store`. Site/asset activity is checked again after fetching from Storage. Guest reads also recheck site activity and permitted published content.

Current APIs issue no signed Storage upload/read URLs. Bundled public sample images are separately allowlisted; they are not private library uploads.

### Delete an individual image

Remove its invitation references and save first. The database blocks deletion while a saved draft, release, or snapshot references the asset. Deletion reserves the asset, removes objects through Storage, then removes metadata. Retry failed deletions rather than altering status manually.

### Transition from historical signed URLs

Previously issued Storage tokens are not revoked by a code or RLS change. After disabling the old panel, allow at least two hours for old upload tokens and wait for all old read URLs to expire. The old panel issued one-hour read URLs, but a client with historical SELECT access could issue longer ones.

If immediate revocation is required, obtain provider-supported revocation or move files and remove old paths through Storage APIs. A successful migration alone does not prove these historical capabilities have expired.

## Tests

Tests cover owner permissions, RLS isolation, write/API blocking, calendar-month boundaries, file-before-record deletion, invalid tokens, and Storage failures. Browser tests cover sessions, retries, confirmation, and mobile layout.

Media tests cover valid Storage INSERT and rejection of another user, wrong prefix, expired lease, or deleted site; terminal deletion; late cleanup; upload/deletion failures; and authorized reads.

Concurrency tests require a **disposable** PostgreSQL database via `TEST_DATABASE_URL`; CI uses PostgreSQL 17. Never use staging or production.

References: [Cron](https://supabase.com/docs/guides/cron/quickstart), [Storage deletion](https://supabase.com/docs/guides/storage/management/delete-objects), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
