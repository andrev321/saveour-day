-- Additive migration: old deployments remain recorded, but can no longer publish.
alter table public.sites
  add column public_slug text unique,
  add column owner_id uuid references auth.users(id),
  add column published_release_id uuid,
  add column access_mode text not null default 'public' check(access_mode in ('public','code','email')),
  add column access_code_hash text,
  add column access_version integer not null default 1,
  add column public_variant_id text,
  add column rsvp_deadline timestamptz;
update public.sites set public_slug = 'zaproszenie-' || id::text;
alter table public.sites alter column public_slug set not null;
alter table public.releases add constraint releases_site_identity unique(site_id,id);
alter table public.sites add constraint published_release_same_site foreign key(id,published_release_id) references public.releases(site_id,id);
-- A code hash is never readable by browser clients, including organizers.
revoke select on public.sites from authenticated;
grant select(id,name,vercel_project_id,domain,created_at,public_slug,owner_id,published_release_id,access_mode,access_version,public_variant_id,rsvp_deadline) on public.sites to authenticated;
alter table public.releases alter column build_token_hash drop not null, alter column token_expires_at drop not null;

create table public.invitations (
  id uuid primary key default gen_random_uuid(), site_id uuid not null references public.sites(id),
  label text not null, variant_id text not null, token_hash text unique not null,
  emails text[] not null default '{}', guests jsonb not null,
  revoked boolean not null default false, version integer not null default 1,
  rsvp_revision integer not null default 0, note text not null default '',
  created_at timestamptz not null default now(), unique(site_id,id)
);
create table public.rsvp_answers (
  site_id uuid not null, invitation_id uuid not null, guest_id uuid not null, event_id text not null,
  attending boolean not null, updated_at timestamptz not null default now(),
  primary key(invitation_id,guest_id,event_id),
  foreign key(site_id,invitation_id) references public.invitations(site_id,id)
);
create table public.guest_sessions (
  token_hash text primary key, site_id uuid not null references public.sites(id),
  invitation_id uuid, access_version integer not null, invitation_version integer,
  email text, expires_at timestamptz not null,
  foreign key(site_id,invitation_id) references public.invitations(site_id,id)
);
create table public.access_attempts (key text primary key, window_start timestamptz not null, attempts integer not null);
create index invitations_by_site on public.invitations(site_id,created_at);
create index answers_by_site on public.rsvp_answers(site_id);
create index sessions_by_expiry on public.guest_sessions(expires_at);
create index attempts_by_window on public.access_attempts(window_start);
alter table public.invitations enable row level security;
alter table public.rsvp_answers enable row level security;
alter table public.guest_sessions enable row level security;
alter table public.access_attempts enable row level security;
revoke all on public.invitations,public.rsvp_answers,public.guest_sessions,public.access_attempts from anon,authenticated;
create policy read_invitations on public.invitations for select to authenticated using(public.can_access_site(site_id));
create policy read_answers on public.rsvp_answers for select to authenticated using(public.can_access_site(site_id));
grant select(id,site_id,label,variant_id,emails,guests,revoked,version,rsvp_revision,note,created_at) on public.invitations to authenticated;
grant select on public.rsvp_answers to authenticated;
grant all on public.invitations,public.rsvp_answers,public.guest_sessions,public.access_attempts to service_role;

create function public.create_owned_site(actor uuid, title text, slug text, sid uuid, content jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'FORBIDDEN'; end if;
  insert into public.sites(id,name,public_slug,owner_id) values(sid,title,slug,actor);
  insert into public.site_members(site_id,user_id) values(sid,actor);
  insert into public.drafts(site_id,config) values(sid,content);
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'site.created');
  return sid;
end $$;

create function public.publish_content(sid uuid, actor uuid, expected_revision integer, content jsonb, assets jsonb, source_release uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid; s public.sites; d public.drafts;
begin
  select * into s from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  if source_release is null then
    select * into d from public.drafts where site_id=sid for update;
    if d.revision is distinct from expected_revision or d.config is distinct from content then raise exception 'REVISION_CONFLICT'; end if;
  elsif not exists(select 1 from public.releases where id=source_release and site_id=sid and config=content and asset_paths=assets) then
    raise exception 'INVALID_RELEASE';
  end if;
  if s.public_variant_id is not null and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=s.public_variant_id) then raise exception 'VARIANT_MISSING'; end if;
  if exists(select 1 from public.invitations i where i.site_id=sid and not i.revoked and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=i.variant_id)) then raise exception 'VARIANT_MISSING'; end if;
  if s.access_mode='code' and s.access_code_hash is null then raise exception 'CODE_REQUIRED'; end if;
  if s.access_mode='email' and exists(select 1 from public.invitations where site_id=sid and not revoked and cardinality(emails)=0) then raise exception 'EMAIL_REQUIRED'; end if;
  insert into public.releases(site_id,config,asset_paths,engine_sha,created_by) values(sid,content,assets,'shared-v1',actor) returning id into rid;
  update public.sites set published_release_id=rid, public_variant_id=coalesce(public_variant_id,content->>'defaultVariant') where id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,case when source_release is null then 'content.published' else 'content.restored' end);
  return rid;
end $$;

create function public.configure_access(sid uuid, actor uuid, mode text, code_hash text, variant text, deadline timestamptz, expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare s public.sites; content jsonb;
begin
  select * into s from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  if s.access_version<>expected_version then raise exception 'REVISION_CONFLICT'; end if;
  if mode not in ('public','code','email') then raise exception 'INVALID_MODE'; end if;
  if mode<>'public' and s.vercel_project_id is not null then raise exception 'LEGACY_PUBLICATION_ACTIVE'; end if;
  if mode='code' and coalesce(code_hash,s.access_code_hash) is null then raise exception 'CODE_REQUIRED'; end if;
  if mode='email' and exists(select 1 from public.invitations where site_id=sid and not revoked and cardinality(emails)=0) then raise exception 'EMAIL_REQUIRED'; end if;
  select config into content from public.releases where id=s.published_release_id and site_id=sid;
  if content is null then select config into content from public.drafts where site_id=sid; end if;
  if not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=variant) then raise exception 'VARIANT_MISSING'; end if;
  update public.sites set access_mode=mode, access_code_hash=coalesce(code_hash,access_code_hash), public_variant_id=variant, rsvp_deadline=deadline, access_version=access_version+1 where id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'access.updated');
end $$;

create function public.unpublish_content(sid uuid, actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  update public.sites set published_release_id=null, access_version=access_version+1 where id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'content.unpublished');
end $$;

create function public.manage_invitation(sid uuid, actor uuid, operation text, iid uuid, payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare s public.sites; content jsonb;
begin
  select * into s from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  if operation in ('create','update') then
    select config into content from public.releases where site_id=sid and id=s.published_release_id;
    if content is null then select config into content from public.drafts where site_id=sid; end if;
    if not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=payload->>'variantId') then raise exception 'VARIANT_MISSING'; end if;
    if s.access_mode='email' and jsonb_array_length(payload->'emails')=0 then raise exception 'EMAIL_REQUIRED'; end if;
    if operation='create' then
      insert into public.invitations(id,site_id,label,variant_id,token_hash,emails,guests)
      values(iid,sid,payload->>'label',payload->>'variantId',payload->>'tokenHash',array(select jsonb_array_elements_text(payload->'emails')),payload->'guests');
    else
      update public.invitations set label=payload->>'label',variant_id=payload->>'variantId',emails=array(select jsonb_array_elements_text(payload->'emails')),version=version+1
        where id=iid and site_id=sid and version=(payload->>'version')::integer;
      if not found then raise exception 'REVISION_CONFLICT'; end if;
    end if;
  elsif operation='rotate' then
    select config into content from public.releases where site_id=sid and id=s.published_release_id;
    if content is null then select config into content from public.drafts where site_id=sid; end if;
    if not exists(select 1 from public.invitations i, jsonb_array_elements(content->'variants') v where i.id=iid and i.site_id=sid and v->>'id'=i.variant_id) then raise exception 'VARIANT_MISSING'; end if;
    update public.invitations set token_hash=payload->>'tokenHash',version=version+1,revoked=false where id=iid and site_id=sid;
    if not found then raise exception 'NOT_FOUND'; end if;
    if s.access_mode='email' and exists(select 1 from public.invitations where id=iid and cardinality(emails)=0) then raise exception 'EMAIL_REQUIRED'; end if;
  elsif operation='revoke' then
    update public.invitations set revoked=true,version=version+1 where id=iid and site_id=sid;
    if not found then raise exception 'NOT_FOUND'; end if;
  else raise exception 'INVALID_OPERATION'; end if;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'invitation.'||operation);
  return iid;
end $$;

create function public.consume_access_attempt(attempt_key text, max_attempts integer, window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  delete from public.access_attempts where window_start < now()-interval '1 day';
  delete from public.guest_sessions where expires_at < now();
  insert into public.access_attempts as a(key,window_start,attempts) values(attempt_key,now(),1)
  on conflict(key) do update set
    attempts=case when a.window_start < now()-make_interval(secs=>window_seconds) then 1 else a.attempts+1 end,
    window_start=case when a.window_start < now()-make_interval(secs=>window_seconds) then now() else a.window_start end
  returning attempts into n;
  return n<=max_attempts;
end $$;

create function public.save_rsvp(sid uuid, iid uuid, expected_revision integer, answers jsonb, message text, session_hash text default null, actor uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare s public.sites; i public.invitations; g public.guest_sessions; content jsonb; variant jsonb; answer jsonb; is_admin boolean;
begin
  select * into s from public.sites where id=sid for update;
  select * into i from public.invitations where id=iid and site_id=sid for update;
  if i.id is null then raise exception 'FORBIDDEN'; end if;
  is_admin := actor is not null and public.can_access_site(sid,actor);
  if not is_admin then
    select * into g from public.guest_sessions where token_hash=session_hash and site_id=sid and invitation_id=iid;
    if g.token_hash is null or g.expires_at<=now() or g.access_version<>s.access_version or g.invitation_version<>i.version or i.revoked then raise exception 'FORBIDDEN'; end if;
    if s.access_mode='email' and (g.email is null or not g.email=any(i.emails)) then raise exception 'FORBIDDEN'; end if;
    if s.rsvp_deadline is not null and now()>s.rsvp_deadline then raise exception 'RSVP_CLOSED'; end if;
  end if;
  if s.published_release_id is null then raise exception 'UNPUBLISHED'; end if;
  if i.rsvp_revision<>expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  if length(message)>2000 or jsonb_typeof(answers)<>'array' or jsonb_array_length(answers)>1000 then raise exception 'INVALID_ANSWERS'; end if;
  select config into content from public.releases where id=s.published_release_id and site_id=sid;
  select v into variant from jsonb_array_elements(content->'variants') v where v->>'id'=i.variant_id;
  if variant is null then raise exception 'VARIANT_MISSING'; end if;
  if (select count(*) from jsonb_array_elements(answers)) <> (select count(distinct (v->>'guestId',v->>'eventId')) from jsonb_array_elements(answers) v) then raise exception 'INVALID_ANSWERS'; end if;
  for answer in select * from jsonb_array_elements(answers) loop
    if not exists(select 1 from jsonb_array_elements(i.guests) invited_guest where invited_guest->>'id'=answer->>'guestId')
      or not exists(select 1 from jsonb_array_elements(content->'events') e where e->>'id'=answer->>'eventId')
      or (i.variant_id<>content->>'defaultVariant' and (not (variant->'eventIds') ? (answer->>'eventId') or (variant->'hiddenEventIds') ? (answer->>'eventId')))
      or jsonb_typeof(answer->'attending') is distinct from 'boolean' then raise exception 'INVALID_ANSWERS'; end if;
    insert into public.rsvp_answers(site_id,invitation_id,guest_id,event_id,attending)
      values(sid,iid,(answer->>'guestId')::uuid,answer->>'eventId',(answer->>'attending')::boolean)
      on conflict(invitation_id,guest_id,event_id) do update set attending=excluded.attending,updated_at=now();
  end loop;
  update public.invitations set rsvp_revision=rsvp_revision+1,note=message where id=iid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'rsvp.updated');
  return i.rsvp_revision+1;
end $$;

-- Service-only functions: server endpoints authorize actors; guests cannot call RPCs directly.
revoke execute on function public.begin_publication(uuid,uuid,integer,jsonb,jsonb,text,text,uuid) from service_role;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid
    where n.nspname='public' and p.proname in ('create_owned_site','publish_content','configure_access','unpublish_content','manage_invitation','consume_access_attempt','save_rsvp') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
