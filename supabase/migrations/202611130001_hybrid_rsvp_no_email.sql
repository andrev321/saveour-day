-- Hybrid RSVP without invitation mailing or guest email OTP.
-- Keeps organizer Supabase Auth account emails untouched.

-- 1. Remove guest OTP and invitation email delivery infrastructure.
drop function if exists public.claim_email_batch(uuid, uuid, text, jsonb, integer);
drop function if exists public.finalize_email_batch(jsonb);
drop function if exists public.create_guest_otp(uuid, text, text, integer);
drop function if exists public.verify_guest_otp(uuid, text, text);
drop table if exists public.email_deliveries;
drop table if exists public.guest_otps;

-- 2. Migrate any existing sites from 'email' access mode to 'code' or 'public'.
update public.sites
set access_mode = case when access_code_hash is not null then 'code' else 'public' end,
    access_version = access_version + 1
where access_mode = 'email';

alter table public.sites drop constraint if exists sites_access_mode_check;
alter table public.sites
  add constraint sites_access_mode_check check (access_mode in ('public', 'code'));

-- 3. Add site-level RSVP toggles.
alter table public.sites
  add column rsvp_enabled boolean not null default true,
  add column allow_self_registration boolean not null default false;

grant select(rsvp_enabled, allow_self_registration) on public.sites to authenticated;

-- 4. Short code & self-registration metadata on invitations.
create or replace function public.generate_short_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  result text := '';
  idx integer;
  n integer;
begin
  for n in 1..6 loop
    idx := 1 + floor(random() * length(alphabet))::integer;
    result := result || substr(alphabet, idx, 1);
  end loop;
  return result;
end $$;

create or replace function public.next_unique_short_code(sid uuid) returns text
language plpgsql volatile set search_path = '' as $$
declare
  candidate text;
begin
  loop
    candidate := public.generate_short_code();
    exit when not exists (
      select 1 from public.invitations where site_id = sid and short_code = candidate
    );
  end loop;
  return candidate;
end $$;

alter table public.invitations
  add column short_code text,
  add column origin text not null default 'organizer' check (origin in ('organizer', 'self_registered')),
  add column review_status text not null default 'approved' check (review_status in ('approved', 'pending_match'));

do $$
declare
  inv record;
begin
  for inv in select id, site_id from public.invitations where short_code is null order by created_at, id loop
    update public.invitations
    set short_code = public.next_unique_short_code(inv.site_id)
    where id = inv.id;
  end loop;
end $$;

alter table public.invitations
  alter column short_code set not null;

create unique index invitations_site_short_code_key on public.invitations(site_id, short_code);
grant select(short_code, origin, review_status) on public.invitations to authenticated;

-- 5. Normalization & lookup helpers.
create or replace function public.normalize_guest_lookup(input text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(
    translate(
      lower(trim(coalesce(input, ''))),
      'ąćęłńóśźżäöüß',
      'acelnoszzaous'
    ),
    '\s+',
    ' ',
    'g'
  );
$$;

create or replace function public.lookup_guest_invitation(
  sid uuid,
  query_text text,
  disambiguator text default null,
  session_hash text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  q text;
  reversed_q text;
  parts text[];
  dis_norm text;
  dis_code text;
  code_match public.invitations;
  matched_inv public.invitations;
  match_count integer;
  candidate_ids uuid[];
  has_session boolean := false;
begin
  select * into s from public.sites where id = sid;
  if s.id is null or s.published_release_id is null or not s.rsvp_enabled then
    return jsonb_build_object('status', 'not_found');
  end if;

  q := public.normalize_guest_lookup(query_text);
  if q = '' then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Direct short_code lookup (also unlocks editing from another device).
  select * into code_match
  from public.invitations
  where site_id = sid
    and not revoked
    and review_status = 'approved'
    and short_code = upper(trim(coalesce(query_text, '')));

  if code_match.id is not null then
    return jsonb_build_object(
      'status', 'matched',
      'invitationId', code_match.id,
      'shortCodeMatched', true
    );
  end if;

  parts := string_to_array(q, ' ');
  if array_length(parts, 1) = 2 then
    reversed_q := parts[2] || ' ' || parts[1];
  else
    reversed_q := null;
  end if;

  select array_agg(i.id) into candidate_ids
  from public.invitations i
  where i.site_id = sid
    and not i.revoked
    and i.review_status = 'approved'
    and (
      public.normalize_guest_lookup(i.label) = q
      or (reversed_q is not null and public.normalize_guest_lookup(i.label) = reversed_q)
      or exists (
        select 1
        from jsonb_array_elements(i.guests) g
        where public.normalize_guest_lookup(g->>'name') = q
           or (reversed_q is not null and public.normalize_guest_lookup(g->>'name') = reversed_q)
      )
    );

  match_count := coalesce(array_length(candidate_ids, 1), 0);
  if match_count = 0 then
    return jsonb_build_object('status', 'not_found');
  end if;

  if match_count > 1 then
    dis_code := upper(trim(coalesce(disambiguator, '')));
    dis_norm := public.normalize_guest_lookup(disambiguator);

    if dis_code <> '' then
      select * into code_match
      from public.invitations
      where id = any(candidate_ids) and short_code = dis_code;

      if code_match.id is not null then
        return jsonb_build_object(
          'status', 'matched',
          'invitationId', code_match.id,
          'shortCodeMatched', true
        );
      end if;
    end if;

    if dis_norm <> '' then
      select array_agg(i.id) into candidate_ids
      from public.invitations i
      where i.id = any(candidate_ids)
        and (
          public.normalize_guest_lookup(i.label) = dis_norm
          or exists (
            select 1
            from jsonb_array_elements(i.guests) g
            where public.normalize_guest_lookup(g->>'name') = dis_norm
          )
        );
      match_count := coalesce(array_length(candidate_ids, 1), 0);
      if match_count <> 1 then
        return jsonb_build_object('status', 'ambiguous');
      end if;
    else
      return jsonb_build_object('status', 'ambiguous');
    end if;
  end if;

  select * into matched_inv from public.invitations where id = candidate_ids[1];

  if matched_inv.rsvp_revision > 0 then
    if session_hash is not null then
      select exists (
        select 1
        from public.guest_sessions gs
        where gs.token_hash = session_hash
          and gs.site_id = sid
          and gs.invitation_id = matched_inv.id
          and gs.expires_at > now()
          and gs.access_version = s.access_version
          and gs.invitation_version = matched_inv.version
      ) into has_session;
    end if;

    if not has_session then
      return jsonb_build_object(
        'status', 'locked',
        'invitationId', matched_inv.id
      );
    end if;
  end if;

  return jsonb_build_object(
    'status', 'matched',
    'invitationId', matched_inv.id,
    'shortCodeMatched', false
  );
end $$;

-- 6. Self-registration and pending_match admin actions.
create or replace function public.create_self_registered_invitation(
  sid uuid,
  iid uuid,
  guest_name text,
  token_hash text,
  allow_plus_one boolean default false
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  content jsonb;
  target_variant text;
  clean_name text;
  gid uuid := gen_random_uuid();
begin
  clean_name := trim(coalesce(guest_name, ''));
  if length(clean_name) not between 1 and 200 then
    raise exception 'INVALID_ANSWERS';
  end if;

  select * into s from public.sites where id = sid for update;
  if s.id is null or s.published_release_id is null then
    raise exception 'UNPUBLISHED';
  end if;
  if not s.rsvp_enabled then
    raise exception 'RSVP_DISABLED';
  end if;
  if not s.allow_self_registration then
    raise exception 'FORBIDDEN';
  end if;

  select config into content from public.releases where id = s.published_release_id and site_id = sid;
  target_variant := coalesce(s.public_variant_id, content->>'defaultVariant');
  if target_variant is null then
    raise exception 'VARIANT_MISSING';
  end if;

  insert into public.invitations(
    id,
    site_id,
    label,
    variant_id,
    token_hash,
    emails,
    guests,
    allow_plus_one,
    short_code,
    origin,
    review_status
  )
  values (
    iid,
    sid,
    clean_name,
    target_variant,
    token_hash,
    '{}'::text[],
    jsonb_build_array(jsonb_build_object('id', gid, 'name', clean_name)),
    allow_plus_one,
    public.next_unique_short_code(sid),
    'self_registered',
    'pending_match'
  );

  insert into public.audit_events(site_id, actor_id, action)
  values(sid, null, 'invitation.self_registered');
  return iid;
end $$;

create or replace function public.approve_pending_invitation(
  sid uuid,
  actor uuid,
  iid uuid
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;
  update public.invitations
  set review_status = 'approved',
      version = version + 1
  where id = iid and site_id = sid and review_status = 'pending_match';
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, 'invitation.approved');
end $$;

create or replace function public.merge_pending_invitation(
  sid uuid,
  actor uuid,
  pending_iid uuid,
  target_iid uuid
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pending_inv public.invitations;
  target_inv public.invitations;
  pending_guest jsonb;
  target_guest_id uuid;
  ans record;
  next_note text;
  next_plus_one jsonb;
  next_details jsonb;
  pending_guest_id_text text;
begin
  if pending_iid = target_iid then
    raise exception 'INVALID_OPERATION';
  end if;
  perform 1 from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;

  select * into pending_inv from public.invitations where id = pending_iid and site_id = sid and review_status = 'pending_match' for update;
  select * into target_inv from public.invitations where id = target_iid and site_id = sid and review_status = 'approved' for update;
  if pending_inv.id is null or target_inv.id is null then
    raise exception 'NOT_FOUND';
  end if;

  pending_guest := pending_inv.guests->0;
  pending_guest_id_text := pending_guest->>'id';

  select (g->>'id')::uuid into target_guest_id
  from jsonb_array_elements(target_inv.guests) g
  where public.normalize_guest_lookup(g->>'name') = public.normalize_guest_lookup(pending_guest->>'name')
  limit 1;

  if target_guest_id is null then
    target_guest_id := (target_inv.guests->0->>'id')::uuid;
  end if;

  for ans in
    select event_id, attending
    from public.rsvp_answers
    where invitation_id = pending_iid and site_id = sid
  loop
    insert into public.rsvp_answers(site_id, invitation_id, guest_id, event_id, attending)
    values(sid, target_iid, target_guest_id, ans.event_id, ans.attending)
    on conflict(invitation_id, guest_id, event_id) do update
      set attending = excluded.attending, updated_at = now();
  end loop;

  next_note := case
    when coalesce(trim(pending_inv.note), '') = '' then target_inv.note
    when coalesce(trim(target_inv.note), '') = '' then pending_inv.note
    else target_inv.note || E'\n' || pending_inv.note
  end;

  next_plus_one := case
    when target_inv.allow_plus_one and target_inv.plus_one is null and pending_inv.plus_one is not null
      then pending_inv.plus_one
    else target_inv.plus_one
  end;

  next_details := target_inv.guest_details;
  if pending_guest_id_text is not null and pending_inv.guest_details ? pending_guest_id_text then
    next_details := jsonb_set(
      next_details,
      array[target_guest_id::text],
      coalesce(next_details->(target_guest_id::text), '{}'::jsonb) || (pending_inv.guest_details->pending_guest_id_text),
      true
    );
  end if;

  update public.invitations
  set note = next_note,
      plus_one = next_plus_one,
      guest_details = next_details,
      rsvp_revision = rsvp_revision + 1,
      version = version + 1
  where id = target_iid and site_id = sid;

  delete from public.rsvp_answers where invitation_id = pending_iid and site_id = sid;
  delete from public.guest_sessions where invitation_id = pending_iid and site_id = sid;
  delete from public.invitations where id = pending_iid and site_id = sid;

  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, 'invitation.merged');
end $$;

-- 7. Update existing RPCs to remove email mode and honor rsvp_enabled.
create or replace function public.configure_rsvp_options(
  sid uuid,
  actor uuid,
  rsvp_on boolean,
  self_reg boolean,
  expected_version integer
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
begin
  select * into s from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;
  if s.access_version <> expected_version then
    raise exception 'REVISION_CONFLICT';
  end if;
  update public.sites
  set rsvp_enabled = rsvp_on,
      allow_self_registration = case when rsvp_on then self_reg else false end,
      access_version = access_version + 1
  where id = sid;
  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, 'rsvp_options.updated');
end $$;

create or replace function public.configure_access(
  sid uuid,
  actor uuid,
  mode text,
  code_hash text,
  variant text,
  deadline timestamptz,
  expected_version integer
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  content jsonb;
begin
  select * into s from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then raise exception 'FORBIDDEN'; end if;
  if s.access_version <> expected_version then raise exception 'REVISION_CONFLICT'; end if;
  if mode not in ('public', 'code') then raise exception 'INVALID_MODE'; end if;
  if mode <> 'public' and s.vercel_project_id is not null then raise exception 'LEGACY_PUBLICATION_ACTIVE'; end if;
  if mode = 'code' and coalesce(code_hash, s.access_code_hash) is null then raise exception 'CODE_REQUIRED'; end if;
  select config into content from public.releases where id = s.published_release_id and site_id = sid;
  if content is null then select config into content from public.drafts where site_id = sid; end if;
  if not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = variant) then raise exception 'VARIANT_MISSING'; end if;
  update public.sites
  set access_mode = mode,
      access_code_hash = coalesce(code_hash, access_code_hash),
      public_variant_id = variant,
      rsvp_deadline = deadline,
      access_version = access_version + 1
  where id = sid;
  insert into public.audit_events(site_id, actor_id, action) values(sid, actor, 'access.updated');
end $$;

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
  next_short_code text;
begin
  select * into s from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then raise exception 'FORBIDDEN'; end if;
  if operation in ('create', 'update') then
    select config into content from public.releases where site_id = sid and id = s.published_release_id;
    if content is null then select config into content from public.drafts where site_id = sid; end if;
    if not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = payload->>'variantId') then
      raise exception 'VARIANT_MISSING';
    end if;
    if operation = 'create' then
      next_short_code := coalesce(
        nullif(upper(trim(coalesce(payload->>'shortCode', ''))), ''),
        public.next_unique_short_code(sid)
      );
      insert into public.invitations(id, site_id, label, variant_id, token_hash, emails, guests, allow_plus_one, short_code)
      values(
        iid,
        sid,
        payload->>'label',
        payload->>'variantId',
        payload->>'tokenHash',
        coalesce(array(select jsonb_array_elements_text(coalesce(payload->'emails', '[]'::jsonb))), '{}'::text[]),
        payload->'guests',
        coalesce((payload->>'allowPlusOne')::boolean, false),
        next_short_code
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
            emails = coalesce(array(select jsonb_array_elements_text(coalesce(payload->'emails', '[]'::jsonb))), old_inv.emails),
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
            emails = coalesce(array(select jsonb_array_elements_text(coalesce(payload->'emails', '[]'::jsonb))), old_inv.emails),
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
    if not s.rsvp_enabled then
      raise exception 'RSVP_DISABLED';
    end if;
    select * into g from public.guest_sessions where token_hash = session_hash and site_id = sid and invitation_id = iid;
    if g.token_hash is null or g.expires_at <= now() or g.access_version <> s.access_version or g.invitation_version <> i.version or i.revoked then
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

-- 8. Lock down new functions to service_role only.
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.proname in (
        'generate_short_code',
        'next_unique_short_code',
        'lookup_guest_invitation',
        'create_self_registered_invitation',
        'approve_pending_invitation',
        'merge_pending_invitation',
        'configure_rsvp_options'
      )
  loop
    execute format('revoke all on function %s from public,anon,authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
