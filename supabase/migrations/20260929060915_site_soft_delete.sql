-- Soft deletion hides a project through the shared RLS predicate immediately.
alter table public.sites add column deleted_at timestamptz, add column deleted_by uuid references auth.users(id) on delete set null;
grant select(deleted_at) on public.sites to authenticated;
create index sites_pending_deletion on public.sites(deleted_at,id) where deleted_at is not null;

create or replace function public.can_access_site(sid uuid, uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = '' as $$
  select case when uid = auth.uid() or auth.role() = 'service_role' then
    exists(select 1 from public.sites s where s.id=sid and s.deleted_at is null)
    and (public.is_platform_admin(uid) or exists(select 1 from public.site_members where site_id=sid and user_id=uid))
  else false end
$$;

create function public.soft_delete_site(sid uuid, actor uuid) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare s public.sites; removed timestamptz;
begin
  select * into s from public.sites where id=sid for update;
  if s.id is null or actor is null or (s.owner_id is distinct from actor and not public.is_platform_admin(actor)) then raise exception 'FORBIDDEN'; end if;
  if s.deleted_at is not null then return s.deleted_at; end if;
  removed := clock_timestamp();
  update public.sites set deleted_at=removed,deleted_by=actor,published_release_id=null,access_version=access_version+1 where id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'site.deleted');
  return removed;
end $$;
revoke all on function public.soft_delete_site(uuid,uuid) from public,anon,authenticated;
grant execute on function public.soft_delete_site(uuid,uuid) to service_role;

create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
-- Block requests already in flight when a project is marked for deletion.
create function private.guard_active_site() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=new.site_id and deleted_at is null for share;
  if not found then raise exception 'SITE_DELETED'; end if;
  return new;
end $$;
revoke all on function private.guard_active_site() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['drafts','media_assets','releases','deployments','draft_snapshots','invitations','guest_sessions','rsvp_answers'] loop
    execute format('create trigger require_active_site before insert or update on public.%I for each row execute function private.guard_active_site()',t);
  end loop;
end $$;
create function private.guard_deleted_site() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.deleted_at is not null then raise exception 'SITE_DELETED'; end if;
  return new;
end $$;
revoke all on function private.guard_deleted_site() from public,anon,authenticated;
create trigger prevent_deleted_site_changes before update on public.sites for each row execute function private.guard_deleted_site();

-- A short-lived, single-use capability authorizes one worker for one deleted site.
create table private.site_purge_jobs (
  site_id uuid primary key references public.sites(id) on delete cascade,
  token_hash bytea not null,
  expires_at timestamptz not null,
  status text not null check(status in ('queued','running','failed')),
  started_at timestamptz,
  attempts integer not null default 1,
  last_error text,
  requested_at timestamptz not null default now()
);
alter table private.site_purge_jobs enable row level security;
revoke all on private.site_purge_jobs from public,anon,authenticated;

create function public.claim_site_purge(sid uuid, token text) returns boolean
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
begin
  perform 1 from public.sites where id=sid and deleted_at < now()-interval '1 month' for update;
  if not found then return false; end if;
  update private.site_purge_jobs set status='running',started_at=now()
    where site_id=sid and token_hash=sha256(convert_to(token,'UTF8')) and status='queued' and expires_at>now();
  return found;
end $$;
create function public.site_purge_paths(sid uuid, token text) returns table(path text)
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
begin
  if not exists(select 1 from private.site_purge_jobs j join public.sites s on s.id=j.site_id
    where s.id=sid and s.deleted_at < now()-interval '1 month' and j.status='running'
    and j.token_hash=sha256(convert_to(token,'UTF8')) and j.expires_at>now()) then raise exception 'FORBIDDEN'; end if;
  return query select o.name from storage.objects o where o.bucket_id='site-media' and o.name like sid::text||'/%' order by o.name limit 500;
end $$;
create function public.finish_site_purge(sid uuid, token text) returns void
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
begin
  perform 1 from public.sites where id=sid and deleted_at < now()-interval '1 month' for update;
  if not found or not exists(select 1 from private.site_purge_jobs where site_id=sid and status='running'
    and token_hash=sha256(convert_to(token,'UTF8')) and expires_at>now()) then raise exception 'FORBIDDEN'; end if;
  -- Storage API must finish first; SQL must never delete Storage metadata.
  if exists(select 1 from storage.objects where bucket_id='site-media' and name like sid::text||'/%') then raise exception 'MEDIA_REMAIN'; end if;
  delete from public.rsvp_answers where site_id=sid;
  delete from public.guest_sessions where site_id=sid;
  delete from public.invitations where site_id=sid;
  delete from public.deployments where site_id=sid;
  delete from public.draft_snapshots where site_id=sid;
  delete from public.releases where site_id=sid;
  delete from public.media_assets where site_id=sid;
  delete from public.audit_events where site_id=sid;
  -- drafts, memberships and the job are removed by their existing FK cascades.
  delete from public.sites where id=sid;
end $$;
create function public.fail_site_purge(sid uuid, token text) returns void
language sql security definer set search_path = '' as $$
  update private.site_purge_jobs set status='failed',last_error='Storage or database cleanup failed; retry on next monthly run'
    where site_id=sid and status='running' and token_hash=sha256(convert_to(token,'UTF8'))
$$;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid
    where n.nspname='public' and p.proname in ('claim_site_purge','site_purge_paths','finish_site_purge','fail_site_purge') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;

