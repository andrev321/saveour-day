-- Invitations RSVP v2: plus-one support, custom guest OTP, and unified email deliveries.

alter table public.invitations
  add column allow_plus_one boolean not null default false,
  add column plus_one jsonb default null;

grant select(allow_plus_one, plus_one) on public.invitations to authenticated;

create or replace function public.manage_invitation_base(
  sid uuid,
  actor uuid,
  operation text,
  iid uuid,
  payload jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  content jsonb;
  old_inv public.invitations;
  next_allow_plus_one boolean;
begin
  select * into s from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then raise exception 'FORBIDDEN'; end if;
  if operation in ('create', 'update') then
    select config into content from public.releases where site_id = sid and id = s.published_release_id;
    if content is null then select config into content from public.drafts where site_id = sid; end if;
    if not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = payload->>'variantId') then
      raise exception 'VARIANT_MISSING';
    end if;
    if s.access_mode = 'email' and jsonb_array_length(payload->'emails') = 0 then
      raise exception 'EMAIL_REQUIRED';
    end if;
    if operation = 'create' then
      insert into public.invitations(id, site_id, label, variant_id, token_hash, emails, guests, allow_plus_one)
      values(
        iid,
        sid,
        payload->>'label',
        payload->>'variantId',
        payload->>'tokenHash',
        array(select jsonb_array_elements_text(payload->'emails')),
        payload->'guests',
        coalesce((payload->>'allowPlusOne')::boolean, false)
      );
    else
      select * into old_inv
      from public.invitations
      where id = iid and site_id = sid and version = (payload->>'version')::integer
      for update;
      if not found then raise exception 'REVISION_CONFLICT'; end if;
      next_allow_plus_one := case
        when payload ? 'allowPlusOne' then coalesce((payload->>'allowPlusOne')::boolean, false)
        else old_inv.allow_plus_one
      end;
      if not next_allow_plus_one and old_inv.plus_one is not null then
        delete from public.rsvp_answers
        where invitation_id = iid and guest_id = (old_inv.plus_one->>'id')::uuid;
        update public.invitations
        set label = payload->>'label',
            variant_id = payload->>'variantId',
            emails = array(select jsonb_array_elements_text(payload->'emails')),
            allow_plus_one = false,
            plus_one = null,
            guest_details = guest_details - (old_inv.plus_one->>'id'),
            rsvp_revision = rsvp_revision + 1,
            version = version + 1
        where id = iid and site_id = sid;
      else
        update public.invitations
        set label = payload->>'label',
            variant_id = payload->>'variantId',
            emails = array(select jsonb_array_elements_text(payload->'emails')),
            allow_plus_one = next_allow_plus_one,
            version = version + 1
        where id = iid and site_id = sid;
      end if;
    end if;
  elsif operation = 'rotate' then
    select config into content from public.releases where site_id = sid and id = s.published_release_id;
    if content is null then select config into content from public.drafts where site_id = sid; end if;
    if not exists(
      select 1 from public.invitations i, jsonb_array_elements(content->'variants') v
      where i.id = iid and i.site_id = sid and v->>'id' = i.variant_id
    ) then
      raise exception 'VARIANT_MISSING';
    end if;
    update public.invitations
    set token_hash = payload->>'tokenHash', version = version + 1, revoked = false
    where id = iid and site_id = sid;
    if not found then raise exception 'NOT_FOUND'; end if;
    if s.access_mode = 'email' and exists(select 1 from public.invitations where id = iid and cardinality(emails) = 0) then
      raise exception 'EMAIL_REQUIRED';
    end if;
  elsif operation = 'revoke' then
    update public.invitations set revoked = true, version = version + 1 where id = iid and site_id = sid;
    if not found then raise exception 'NOT_FOUND'; end if;
  else
    raise exception 'INVALID_OPERATION';
  end if;
  insert into public.audit_events(site_id, actor_id, action) values(sid, actor, 'invitation.' || operation);
  return iid;
end $$;

create or replace function public.save_guest_rsvp(
  sid uuid,
  iid uuid,
  expected_revision integer,
  answers jsonb,
  message text,
  details jsonb default null,
  plus_one_input jsonb default null,
  session_hash text default null,
  actor uuid default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  i public.invitations;
  g public.guest_sessions;
  content jsonb;
  variant jsonb;
  answer jsonb;
  is_admin boolean;
  plus_one_uuid uuid;
  questions jsonb;
  item record;
begin
  if plus_one_input is not null and jsonb_typeof(plus_one_input) = 'null' then
    plus_one_input := null;
  end if;
  if details is not null and jsonb_typeof(details) = 'null' then
    details := null;
  end if;

  select * into s from public.sites where id = sid for update;
  select * into i from public.invitations where id = iid and site_id = sid for update;
  if i.id is null then raise exception 'FORBIDDEN'; end if;
  is_admin := actor is not null and public.can_access_site(sid, actor);
  if not is_admin then
    select * into g from public.guest_sessions where token_hash = session_hash and site_id = sid and invitation_id = iid;
    if g.token_hash is null or g.expires_at <= now() or g.access_version <> s.access_version or g.invitation_version <> i.version or i.revoked then
      raise exception 'FORBIDDEN';
    end if;
    if s.access_mode = 'email' and (g.email is null or not g.email = any(i.emails)) then
      raise exception 'FORBIDDEN';
    end if;
    if s.rsvp_deadline is not null and now() > s.rsvp_deadline then
      raise exception 'RSVP_CLOSED';
    end if;
  end if;
  if s.published_release_id is null then raise exception 'UNPUBLISHED'; end if;
  if i.rsvp_revision <> expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  if length(message) > 2000 or jsonb_typeof(answers) <> 'array' or jsonb_array_length(answers) > 1000 then
    raise exception 'INVALID_ANSWERS';
  end if;

  if plus_one_input is not null then
    if not i.allow_plus_one then raise exception 'INVALID_ANSWERS'; end if;
    if jsonb_typeof(plus_one_input) <> 'object'
      or (select count(*) from jsonb_object_keys(plus_one_input)) <> 2
      or jsonb_typeof(plus_one_input->'id') <> 'string'
      or jsonb_typeof(plus_one_input->'name') <> 'string'
      or length(trim(plus_one_input->>'name')) not between 1 and 200 then
      raise exception 'INVALID_ANSWERS';
    end if;
    begin
      plus_one_uuid := (plus_one_input->>'id')::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ANSWERS';
    end;
    if exists(select 1 from jsonb_array_elements(i.guests || i.archived_guests) p where p->>'id' = plus_one_input->>'id')
      or exists(
        select 1 from public.invitations other_i
        where other_i.id <> iid and (
          exists(select 1 from jsonb_array_elements(other_i.guests || other_i.archived_guests) p where p->>'id' = plus_one_input->>'id')
          or (other_i.plus_one is not null and other_i.plus_one->>'id' = plus_one_input->>'id')
        )
      ) then
      raise exception 'INVALID_ANSWERS';
    end if;
  end if;

  select config into content from public.releases where id = s.published_release_id and site_id = sid;
  select v into variant from jsonb_array_elements(content->'variants') v where v->>'id' = i.variant_id;
  if variant is null then raise exception 'VARIANT_MISSING'; end if;
  if (select count(*) from jsonb_array_elements(answers)) <> (select count(distinct (v->>'guestId', v->>'eventId')) from jsonb_array_elements(answers) v) then
    raise exception 'INVALID_ANSWERS';
  end if;

  if i.plus_one is not null and (plus_one_input is null or plus_one_input->>'id' <> i.plus_one->>'id') then
    delete from public.rsvp_answers where invitation_id = iid and guest_id = (i.plus_one->>'id')::uuid;
    update public.invitations set guest_details = guest_details - (i.plus_one->>'id') where id = iid;
  end if;

  for answer in select * from jsonb_array_elements(answers) loop
    if (
        not exists(select 1 from jsonb_array_elements(i.guests) invited_guest where invited_guest->>'id' = answer->>'guestId')
        and not (plus_one_input is not null and answer->>'guestId' = plus_one_input->>'id')
      )
      or not exists(select 1 from jsonb_array_elements(content->'events') e where e->>'id' = answer->>'eventId')
      or not (variant->'eventIds') ? (answer->>'eventId')
      or jsonb_typeof(answer->'attending') is distinct from 'boolean' then
      raise exception 'INVALID_ANSWERS';
    end if;
    insert into public.rsvp_answers(site_id, invitation_id, guest_id, event_id, attending)
    values(sid, iid, (answer->>'guestId')::uuid, answer->>'eventId', (answer->>'attending')::boolean)
    on conflict(invitation_id, guest_id, event_id) do update
      set attending = excluded.attending, updated_at = now();
  end loop;

  update public.invitations
  set rsvp_revision = rsvp_revision + 1,
      note = message,
      plus_one = plus_one_input
  where id = iid;

  if details is not null then
    select rsvp_questions into questions from public.sites where id = sid;
    if jsonb_typeof(details) <> 'object' or (select count(*) from jsonb_object_keys(details)) > 21 then
      raise exception 'INVALID_ANSWERS';
    end if;
    for item in select * from jsonb_each(details) loop
      if (
          not exists(select 1 from jsonb_array_elements(i.guests) p where p->>'id' = item.key)
          and not (plus_one_input is not null and plus_one_input->>'id' = item.key)
        )
        or jsonb_typeof(item.value) <> 'object' then
        raise exception 'INVALID_ANSWERS';
      end if;
      if exists(select 1 from jsonb_object_keys(item.value) k where k not in ('diet', 'lodging', 'transport')) then
        raise exception 'INVALID_ANSWERS';
      end if;
      if item.value ? 'diet' and ((questions->>'diet')::boolean is not true or jsonb_typeof(item.value->'diet') <> 'string' or length(item.value->>'diet') > 300) then
        raise exception 'INVALID_ANSWERS';
      end if;
      if item.value ? 'lodging' and ((questions->>'lodging')::boolean is not true or jsonb_typeof(item.value->'lodging') <> 'boolean') then
        raise exception 'INVALID_ANSWERS';
      end if;
      if item.value ? 'transport' and ((questions->>'transport')::boolean is not true or jsonb_typeof(item.value->'transport') <> 'boolean') then
        raise exception 'INVALID_ANSWERS';
      end if;
    end loop;
    for item in select * from jsonb_each(details) loop
      update public.invitations
      set guest_details = jsonb_set(guest_details, array[item.key], coalesce(guest_details->item.key, '{}'::jsonb) || item.value, true)
      where id = iid;
    end loop;
  end if;

  insert into public.audit_events(site_id, actor_id, action) values(sid, actor, 'rsvp.updated');
  return i.rsvp_revision + 1;
end $$;

-- Custom guest OTP storage and verification.
create table public.guest_otps (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index guest_otps_lookup on public.guest_otps(site_id, email, created_at desc);

alter table public.guest_otps enable row level security;
revoke all on public.guest_otps from public, anon, authenticated;
grant all on public.guest_otps to service_role;

create function public.create_guest_otp(
  sid uuid,
  target_email text,
  code_hash text,
  ttl_seconds integer default 900
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.guest_otps where (site_id = sid and email = target_email) or expires_at <= now();
  insert into public.guest_otps(site_id, email, code_hash, expires_at)
  values(sid, target_email, code_hash, now() + make_interval(secs => ttl_seconds));
end $$;

create function public.verify_guest_otp(
  sid uuid,
  target_email text,
  code_hash text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  otp_row public.guest_otps;
begin
  select * into otp_row
  from public.guest_otps
  where site_id = sid and email = target_email
  order by created_at desc
  limit 1
  for update;

  if otp_row.id is null or otp_row.expires_at <= now() or otp_row.attempts >= 5 then
    return false;
  end if;

  if otp_row.code_hash is distinct from verify_guest_otp.code_hash then
    update public.guest_otps set attempts = attempts + 1 where id = otp_row.id;
    return false;
  end if;

  delete from public.guest_otps where id = otp_row.id;
  return true;
end $$;

-- Unified email delivery ledger replacing reminder_deliveries.
drop function if exists public.claim_reminder(uuid, uuid, uuid, integer, integer, text, jsonb);
drop table if exists public.reminder_deliveries;

create table public.email_deliveries (
  id uuid not null default gen_random_uuid(),
  site_id uuid not null,
  invitation_id uuid not null,
  kind text not null check (kind in ('invitation', 'reminder')),
  email text not null,
  day date not null default current_date,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  payload jsonb not null,
  lease_until timestamptz,
  attempts integer not null default 0,
  provider_id text,
  created_at timestamptz not null default now(),
  primary key (invitation_id, kind, email, day),
  unique (id),
  foreign key (site_id, invitation_id) references public.invitations(site_id, id) on delete cascade
);
create index email_deliveries_site_day on public.email_deliveries(site_id, day, status);

alter table public.email_deliveries enable row level security;
revoke all on public.email_deliveries from public, anon, authenticated;
grant all on public.email_deliveries to service_role;

create function public.claim_email_batch(
  sid uuid,
  actor uuid,
  kind text,
  items jsonb,
  daily_site_limit integer default 50
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  i public.invitations;
  delivery public.email_deliveries;
  item jsonb;
  iid uuid;
  recipient text;
  used_today integer;
  remaining integer;
  claimed jsonb := '[]'::jsonb;
begin
  select * into s from public.sites where id = sid for update;
  if s.id is null or not public.can_access_site(sid, actor) then raise exception 'FORBIDDEN'; end if;
  if kind not in ('invitation', 'reminder') then raise exception 'INVALID_OPERATION'; end if;
  if s.published_release_id is null then raise exception 'UNPUBLISHED'; end if;
  if kind = 'reminder' and s.rsvp_deadline is not null and s.rsvp_deadline <= now() then
    raise exception 'RSVP_CLOSED';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 100 then
    raise exception 'INVALID_ANSWERS';
  end if;

  select count(*) into used_today
  from public.email_deliveries
  where site_id = sid
    and day = current_date
    and (status = 'sent' or (status = 'pending' and lease_until > now()));

  remaining := greatest(0, daily_site_limit - used_today);

  for item in select * from jsonb_array_elements(items) loop
    exit when remaining <= 0;
    iid := (item->>'invitationId')::uuid;
    recipient := item->>'email';
    if iid is null or recipient is null or jsonb_typeof(item->'payload') <> 'object' then
      raise exception 'INVALID_ANSWERS';
    end if;

    select * into i from public.invitations where id = iid and site_id = sid for update;
    if i.id is null or i.revoked or not (recipient = any(i.emails)) then
      continue;
    end if;
    if (item ? 'expectedVersion') and i.version <> (item->>'expectedVersion')::integer then
      continue;
    end if;
    if (item ? 'expectedRsvp') and i.rsvp_revision <> (item->>'expectedRsvp')::integer then
      continue;
    end if;

    insert into public.email_deliveries(site_id, invitation_id, kind, email, payload)
    values(sid, iid, claim_email_batch.kind, recipient, item->'payload')
    on conflict do nothing;

    select * into delivery
    from public.email_deliveries
    where invitation_id = iid
      and public.email_deliveries.kind = claim_email_batch.kind
      and email = recipient
      and day = current_date
    for update;

    if delivery.status = 'sent' or delivery.attempts >= 5 or delivery.lease_until > now() then
      continue;
    end if;

    update public.email_deliveries
    set lease_until = now() + interval '1 minute',
        attempts = attempts + 1,
        status = 'pending'
    where id = delivery.id;

    claimed := claimed || jsonb_build_array(
      jsonb_build_object(
        'id', delivery.id,
        'invitationId', iid,
        'email', recipient,
        'payload', delivery.payload
      )
    );
    remaining := remaining - 1;
  end loop;

  return claimed;
end $$;

create function public.finalize_email_batch(results jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r jsonb;
  delivery_status text;
begin
  if jsonb_typeof(results) <> 'array' then raise exception 'INVALID_ANSWERS'; end if;
  for r in select * from jsonb_array_elements(results) loop
    delivery_status := r->>'status';
    if delivery_status not in ('sent', 'failed') then raise exception 'INVALID_ANSWERS'; end if;
    if delivery_status = 'sent' then
      update public.email_deliveries
      set status = 'sent',
          provider_id = coalesce(r->>'providerId', r->>'provider_id'),
          lease_until = null
      where id = (r->>'id')::uuid;
    else
      update public.email_deliveries
      set status = 'failed'
      where id = (r->>'id')::uuid;
    end if;
  end loop;
end $$;

do $$ declare f record; begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname in (
        'manage_invitation',
        'manage_invitation_base',
        'save_guest_rsvp',
        'create_guest_otp',
        'verify_guest_otp',
        'claim_email_batch',
        'finalize_email_batch'
      )
  loop
    execute format('revoke all on function %s from public,anon,authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
