-- Product review: household editing, transactional imports, questions and reminder leases.
alter table public.sites add column rsvp_questions jsonb not null default '{"diet":false,"lodging":false,"transport":false}';
alter table public.invitations add column archived_guests jsonb not null default '[]', add column guest_details jsonb not null default '{}';
grant select(rsvp_questions) on public.sites to authenticated;
grant select(archived_guests,guest_details) on public.invitations to authenticated;

create table public.guest_imports (
  site_id uuid not null references public.sites(id) on delete cascade,
  request_id uuid not null, invitation_ids jsonb not null, created_at timestamptz not null default now(),
  primary key(site_id,request_id)
);
create table public.reminder_deliveries (
  site_id uuid not null, invitation_id uuid not null, email text not null, day date not null default current_date,
  id uuid not null default gen_random_uuid(), status text not null default 'pending' check(status in ('pending','sent','failed')),
  payload jsonb not null, lease_until timestamptz, attempts integer not null default 0,
  provider_id text, created_at timestamptz not null default now(),
  primary key(invitation_id,email,day), unique(id),
  foreign key(site_id,invitation_id) references public.invitations(site_id,id) on delete cascade
);
alter table public.guest_imports enable row level security;
alter table public.reminder_deliveries enable row level security;
revoke all on public.guest_imports,public.reminder_deliveries from public,anon,authenticated;
grant all on public.guest_imports,public.reminder_deliveries to service_role;

alter function public.manage_invitation(uuid,uuid,text,uuid,jsonb) rename to manage_invitation_base;
create function public.manage_invitation(sid uuid, actor uuid, operation text, iid uuid, payload jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i public.invitations; person jsonb; old_person jsonb; keep_ids text[];
begin
  if operation <> 'update' or not (payload ? 'guests') then
    return public.manage_invitation_base(sid,actor,operation,iid,payload);
  end if;
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select * into i from public.invitations where id=iid and site_id=sid for update;
  if i.id is null or i.version <> (payload->>'version')::integer then raise exception 'REVISION_CONFLICT'; end if;
  if jsonb_typeof(payload->'guests') <> 'array' or jsonb_array_length(payload->'guests') not between 1 and 20 then raise exception 'INVALID_ANSWERS'; end if;
  if (select count(distinct p->>'id') from jsonb_array_elements(payload->'guests') p) <> jsonb_array_length(payload->'guests') then raise exception 'INVALID_ANSWERS'; end if;
  for person in select * from jsonb_array_elements(payload->'guests') loop
    if jsonb_typeof(person->'name') is distinct from 'string' or length(trim(person->>'name')) not between 1 and 200 or person->>'id' is null then raise exception 'INVALID_ANSWERS'; end if;
    perform (person->>'id')::uuid;
    if exists(select 1 from public.invitations other_i, jsonb_array_elements(other_i.guests || other_i.archived_guests) p where other_i.id <> iid and p->>'id'=person->>'id') then raise exception 'INVALID_ANSWERS'; end if;
  end loop;
  -- Base function validates access, variant, email settings and optimistic version.
  perform public.manage_invitation_base(sid,actor,operation,iid,payload);
  select array_agg(p->>'id') into keep_ids from jsonb_array_elements(payload->'guests') p;
  for old_person in select * from jsonb_array_elements(i.guests) loop
    if not (old_person->>'id'=any(keep_ids)) and not exists(select 1 from jsonb_array_elements(i.archived_guests) p where p->>'id'=old_person->>'id') then
      i.archived_guests := i.archived_guests || jsonb_build_array(old_person);
    end if;
  end loop;
  update public.invitations set guests=payload->'guests', archived_guests=coalesce((select jsonb_agg(p) from jsonb_array_elements(i.archived_guests) p where not (p->>'id'=any(keep_ids))),'[]'), rsvp_revision=rsvp_revision+1 where id=iid;
  return iid;
end $$;

create function public.import_guests(sid uuid, actor uuid, request_id uuid, entries jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare existing jsonb; ids jsonb := '[]'; entry jsonb; iid uuid;
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select invitation_ids into existing from public.guest_imports g where g.site_id=sid and g.request_id=import_guests.request_id;
  if existing is not null then return jsonb_build_object('created',false,'ids',existing); end if;
  if jsonb_typeof(entries)<>'array' or jsonb_array_length(entries) not between 1 and 200 then raise exception 'INVALID_ANSWERS'; end if;
  for entry in select * from jsonb_array_elements(entries) loop
    iid := (entry->>'id')::uuid;
    perform public.manage_invitation(sid,actor,'create',iid,entry->'payload');
    ids := ids || jsonb_build_array(iid);
  end loop;
  insert into public.guest_imports values(sid,request_id,ids,now());
  return jsonb_build_object('created',true,'ids',ids);
end $$;

create function public.configure_questions(sid uuid, actor uuid, questions jsonb, expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.sites where id=sid and access_version=expected_version) then raise exception 'REVISION_CONFLICT'; end if;
  if jsonb_typeof(questions) <> 'object' or (select count(*) from jsonb_object_keys(questions)) <> 3 or jsonb_typeof(questions->'diet') is distinct from 'boolean' or jsonb_typeof(questions->'lodging') is distinct from 'boolean' or jsonb_typeof(questions->'transport') is distinct from 'boolean' then raise exception 'INVALID_ANSWERS'; end if;
  update public.sites set rsvp_questions=questions, access_version=access_version+1 where id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'questions.updated');
end $$;

create function public.save_rsvp_with_details(sid uuid, iid uuid, expected_revision integer, answers jsonb, message text, details jsonb, session_hash text default null, actor uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare revision integer; i public.invitations; questions jsonb; item record;
begin
  -- Existing procedure performs all access, deadline, tenant and revision checks under locks.
  revision := public.save_rsvp(sid,iid,expected_revision,answers,message,session_hash,actor);
  select * into i from public.invitations where id=iid and site_id=sid;
  select rsvp_questions into questions from public.sites where id=sid;
  if jsonb_typeof(details) <> 'object' or (select count(*) from jsonb_object_keys(details)) > 20 then raise exception 'INVALID_ANSWERS'; end if;
  for item in select * from jsonb_each(details) loop
    if not exists(select 1 from jsonb_array_elements(i.guests) p where p->>'id'=item.key) or jsonb_typeof(item.value)<>'object' then raise exception 'INVALID_ANSWERS'; end if;
    if exists(select 1 from jsonb_object_keys(item.value) k where k not in ('diet','lodging','transport')) then raise exception 'INVALID_ANSWERS'; end if;
    if item.value ? 'diet' and ((questions->>'diet')::boolean is not true or jsonb_typeof(item.value->'diet')<>'string' or length(item.value->>'diet')>300) then raise exception 'INVALID_ANSWERS'; end if;
    if item.value ? 'lodging' and ((questions->>'lodging')::boolean is not true or jsonb_typeof(item.value->'lodging')<>'boolean') then raise exception 'INVALID_ANSWERS'; end if;
    if item.value ? 'transport' and ((questions->>'transport')::boolean is not true or jsonb_typeof(item.value->'transport')<>'boolean') then raise exception 'INVALID_ANSWERS'; end if;
  end loop;
  -- Preserve answers to disabled questions and archived members for the organizer.
  for item in select * from jsonb_each(details) loop
    update public.invitations set guest_details=jsonb_set(guest_details, array[item.key], coalesce(guest_details->item.key, '{}'::jsonb) || item.value, true) where id=iid;
  end loop;
  return revision;
end $$;

create function public.claim_reminder(sid uuid, actor uuid, iid uuid, expected_version integer, expected_rsvp integer, recipient text, message_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.sites; i public.invitations; delivery public.reminder_deliveries;
begin
  select * into s from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select * into i from public.invitations where id=iid and site_id=sid for update;
  if s.access_mode<>'email' or s.published_release_id is null or i.id is null or i.revoked or not (recipient=any(i.emails)) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.releases r, jsonb_array_elements(r.config->'variants') v, jsonb_array_elements(i.guests) person, jsonb_array_elements_text(v->'eventIds') event_id where r.id=s.published_release_id and r.site_id=sid and v->>'id'=i.variant_id and not exists(select 1 from public.rsvp_answers a where a.invitation_id=iid and a.guest_id=(person->>'id')::uuid and a.event_id=event_id)) then return null; end if;
  if i.version<>expected_version or i.rsvp_revision<>expected_rsvp then raise exception 'REVISION_CONFLICT'; end if;
  if s.rsvp_deadline is not null and s.rsvp_deadline<=now() then raise exception 'RSVP_CLOSED'; end if;
  insert into public.reminder_deliveries(site_id,invitation_id,email,payload) values(sid,iid,recipient,message_payload) on conflict do nothing;
  select * into delivery from public.reminder_deliveries where invitation_id=iid and email=recipient and day=current_date for update;
  if delivery.status='sent' or delivery.attempts>=5 or delivery.lease_until>now() then return null; end if;
  update public.reminder_deliveries set lease_until=now()+interval '1 minute',attempts=attempts+1,status='pending' where id=delivery.id;
  return jsonb_build_object('id',delivery.id,'payload',delivery.payload);
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname in ('manage_invitation','manage_invitation_base','import_guests','configure_questions','save_rsvp_with_details','claim_reminder') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
