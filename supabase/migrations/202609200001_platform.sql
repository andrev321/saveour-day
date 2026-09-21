create extension if not exists pgcrypto;
create table public.platform_admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.sites (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 200),
  vercel_project_id text unique, domain text, created_at timestamptz not null default now()
);
create table public.site_members (
  site_id uuid references public.sites(id) on delete cascade, user_id uuid references auth.users(id) on delete cascade,
  primary key(site_id, user_id)
);
create table public.drafts (
  site_id uuid primary key references public.sites(id) on delete cascade,
  config jsonb not null, revision integer not null default 1, updated_at timestamptz not null default now()
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
  status text not null default 'pending' check(status in ('pending','ready','error')),
  original_path text not null unique, manifest jsonb, created_at timestamptz not null default now()
);
create table public.releases (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
  config jsonb not null, asset_paths jsonb not null, engine_sha text not null,
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  build_token_hash text not null, token_expires_at timestamptz not null
);
create table public.deployments (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
  release_id uuid not null references public.releases(id), vercel_id text unique,
  status text not null check(status in ('preparing','building','ready','error')),
  url text, error text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index one_active_deployment on public.deployments(site_id) where status in ('preparing','building');
create table public.audit_events (
  id bigint generated always as identity primary key, site_id uuid references public.sites(id),
  actor_id uuid references auth.users(id), action text not null, created_at timestamptz not null default now()
);
create function public.is_platform_admin(uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path = '' as $$
  select case when uid = auth.uid() or auth.role() = 'service_role'
    then exists(select 1 from public.platform_admins where user_id = uid)
    else false
  end
$$;
create function public.can_access_site(sid uuid, uid uuid default auth.uid()) returns boolean language sql stable security definer set search_path = '' as $$
  select case when uid = auth.uid() or auth.role() = 'service_role'
    then public.is_platform_admin(uid) or exists(select 1 from public.site_members where site_id = sid and user_id = uid)
    else false
  end
$$;
alter table public.platform_admins enable row level security;
alter table public.sites enable row level security;
alter table public.site_members enable row level security;
alter table public.drafts enable row level security;
alter table public.media_assets enable row level security;
alter table public.releases enable row level security;
alter table public.deployments enable row level security;
alter table public.audit_events enable row level security;
create policy read_admin on public.platform_admins for select to authenticated using (user_id = auth.uid());
create policy read_sites on public.sites for select to authenticated using ((select public.can_access_site(id)));
create policy read_members on public.site_members for select to authenticated using ((select public.can_access_site(site_id)));
create policy read_drafts on public.drafts for select to authenticated using ((select public.can_access_site(site_id)));
create policy read_media on public.media_assets for select to authenticated using ((select public.can_access_site(site_id)));
create policy read_releases on public.releases for select to authenticated using ((select public.can_access_site(site_id)));
create policy read_deployments on public.deployments for select to authenticated using ((select public.can_access_site(site_id)));
create policy read_audit on public.audit_events for select to authenticated using ((select public.can_access_site(site_id)));
-- All writes are through authenticated server endpoints; the browser cannot edit roles or deployments.
revoke all on public.platform_admins, public.sites, public.site_members, public.drafts, public.media_assets, public.releases, public.deployments, public.audit_events from anon, authenticated;
grant select on public.platform_admins, public.sites, public.site_members, public.drafts, public.media_assets, public.releases, public.deployments, public.audit_events to authenticated;
grant all on public.platform_admins, public.sites, public.site_members, public.drafts, public.media_assets, public.releases, public.deployments, public.audit_events to service_role;
grant usage, select on sequence public.audit_events_id_seq to service_role;

create function public.save_site_draft(sid uuid, actor uuid, expected_revision integer, content jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  if not public.can_access_site(sid, actor) then raise exception 'FORBIDDEN'; end if;
  select revision into current_revision from public.drafts where site_id = sid for update;
  if current_revision is null or current_revision <> expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  update public.drafts set config = content, revision = revision + 1, updated_at = now() where site_id = sid;
  insert into public.audit_events(site_id, actor_id, action) values(sid, actor, 'draft.saved');
  return current_revision + 1;
end $$;

create function public.begin_publication(sid uuid, actor uuid, expected_revision integer, content jsonb, assets jsonb, sha text, token_hash text, source_release uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid; did uuid; current_revision integer; current_config jsonb;
begin
  perform 1 from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then raise exception 'FORBIDDEN'; end if;
  select id into did from public.deployments where site_id = sid and status in ('preparing','building');
  if did is not null then raise exception 'DEPLOYMENT_ACTIVE'; end if;
  if (select count(*) from public.deployments where site_id = sid and created_at >= now() - interval '24 hours') >= 10 then raise exception 'DAILY_LIMIT'; end if;
  if source_release is null then
    select revision, config into current_revision, current_config from public.drafts where site_id = sid for update;
    if current_revision <> expected_revision or current_config <> content then raise exception 'REVISION_CONFLICT'; end if;
  else
    if not exists(select 1 from public.releases where id = source_release and site_id = sid and config = content and engine_sha = sha) then raise exception 'INVALID_RELEASE'; end if;
  end if;
  insert into public.releases(site_id, config, asset_paths, engine_sha, created_by, build_token_hash, token_expires_at)
    values(sid, content, assets, sha, actor, token_hash, now() + interval '2 hours') returning id into rid;
  insert into public.deployments(site_id, release_id, status) values(sid, rid, 'preparing') returning id into did;
  insert into public.audit_events(site_id, actor_id, action) values(sid, actor, case when source_release is null then 'release.requested' else 'release.restored' end);
  return did;
end $$;
revoke all on function public.save_site_draft(uuid,uuid,integer,jsonb) from public, anon, authenticated;
revoke all on function public.begin_publication(uuid,uuid,integer,jsonb,jsonb,text,text,uuid) from public, anon, authenticated;
grant execute on function public.save_site_draft(uuid,uuid,integer,jsonb) to service_role;
grant execute on function public.begin_publication(uuid,uuid,integer,jsonb,jsonb,text,text,uuid) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('site-media','site-media',false,8388608,array['image/jpeg','image/png','image/webp']) on conflict (id) do nothing;
create policy read_own_media on storage.objects for select to authenticated using (
  bucket_id = 'site-media' and exists(select 1 from public.sites s where s.id::text = (storage.foldername(name))[1] and (select public.can_access_site(s.id)))
);
-- No browser insert/update policy: upload is authorized by a narrowly scoped signed upload URL.
