-- Read old immutable releases through this deterministic compatibility adapter.
create function public.upgrade_config_v2(content jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case when content->>'schemaVersion'='1' then
    (content-'couple') || jsonb_build_object('schemaVersion',2,'identity',jsonb_build_object('displayName',btrim(content#>>'{couple,firstName}') || ' & ' || btrim(content#>>'{couple,secondName}')))
  else content end
$$;
revoke all on function public.upgrade_config_v2(jsonb) from public,anon,authenticated;
grant execute on function public.upgrade_config_v2(jsonb) to service_role;

create table public.draft_snapshots (
 id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
 config jsonb not null, revision integer not null, created_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create index draft_snapshots_by_site on public.draft_snapshots(site_id,created_at desc);
alter table public.draft_snapshots enable row level security;
revoke all on public.draft_snapshots from anon,authenticated;
grant select on public.draft_snapshots to authenticated;
grant all on public.draft_snapshots to service_role;
create policy read_draft_snapshots on public.draft_snapshots for select to authenticated using(public.can_access_site(site_id));
-- Preserve original drafts for inspection before upgrading their schema.
insert into public.draft_snapshots(site_id,config,revision)
 select site_id,config,revision from public.drafts where config->>'schemaVersion'='1';
update public.drafts set config=public.upgrade_config_v2(config),revision=revision+1 where config->>'schemaVersion'='1';

create function public.replace_invitation_draft(sid uuid, actor uuid, expected_revision integer, content jsonb, snapshot_id uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare s public.sites; d public.drafts; dependencies text;
begin
 select * into s from public.sites where id=sid for update;
 if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
 select * into d from public.drafts where site_id=sid for update;
 if d.revision is distinct from expected_revision then raise exception 'REVISION_CONFLICT'; end if;
 if content->>'id' is distinct from sid::text or content->>'schemaVersion' is distinct from '2' then raise exception 'INVALID_CONFIG'; end if;
 if snapshot_id is not null and not exists(select 1 from public.draft_snapshots where id=snapshot_id and site_id=sid and public.upgrade_config_v2(config)=content) then raise exception 'INVALID_SNAPSHOT'; end if;
 select string_agg(i.label, ', ') into dependencies from public.invitations i
 where i.site_id=sid and not i.revoked and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=i.variant_id);
 if dependencies is not null then raise exception using message='VARIANT_IN_USE',detail=dependencies; end if;
 if s.public_variant_id is not null and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=s.public_variant_id) then raise exception using message='VARIANT_IN_USE', detail='Wariant strony ogólnej'; end if;
 insert into public.draft_snapshots(site_id,config,revision,created_by) values(sid,d.config,d.revision,actor);
 update public.drafts set config=content,revision=revision+1,updated_at=now() where site_id=sid;
 insert into public.audit_events(site_id,actor_id,action) values(sid,actor,case when snapshot_id is null then 'draft.template_reset' else 'draft.snapshot_restored' end);
 return d.revision+1;
end $$;
revoke all on function public.replace_invitation_draft(uuid,uuid,integer,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.replace_invitation_draft(uuid,uuid,integer,jsonb,uuid) to service_role;

create or replace function public.publish_content(sid uuid, actor uuid, expected_revision integer, content jsonb, assets jsonb, source_release uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid; s public.sites; d public.drafts;
begin
  select * into s from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  if source_release is null then
    select * into d from public.drafts where site_id=sid for update;
    if d.revision is distinct from expected_revision or d.config is distinct from content then raise exception 'REVISION_CONFLICT'; end if;
  elsif not exists(select 1 from public.releases where id=source_release and site_id=sid and public.upgrade_config_v2(config)=content and asset_paths=assets) then
    raise exception 'INVALID_RELEASE';
  end if;
  if content->>'schemaVersion' <> '2' or nullif(btrim(content#>>'{identity,displayName}'),'') is null then raise exception 'INVALID_PUBLICATION'; end if;
  if s.public_variant_id is not null and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=s.public_variant_id) then raise exception 'VARIANT_MISSING'; end if;
  if exists(select 1 from public.invitations i where i.site_id=sid and not i.revoked and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=i.variant_id)) then raise exception 'VARIANT_MISSING'; end if;
  if s.access_mode='code' and s.access_code_hash is null then raise exception 'CODE_REQUIRED'; end if;
  if s.access_mode='email' and exists(select 1 from public.invitations where site_id=sid and not revoked and cardinality(emails)=0) then raise exception 'EMAIL_REQUIRED'; end if;
  insert into public.releases(site_id,config,asset_paths,engine_sha,created_by) values(sid,content,assets,'shared-v1',actor) returning id into rid;
  update public.sites set published_release_id=rid, public_variant_id=coalesce(public_variant_id,content->>'defaultVariant') where id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,case when source_release is null then 'content.published' else 'content.restored' end);
  return rid;
end $$;
