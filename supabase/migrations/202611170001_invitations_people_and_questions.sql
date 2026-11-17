-- Simplify invitations to a list of people (named | companion) and add organizer-defined RSVP questions.
-- Destructive migration by design (no backward-compatible data migration required).

truncate public.rsvp_answers, public.guest_imports, public.invitations cascade;
delete from public.guest_sessions where invitation_id is not null;

drop table public.rsvp_answers;

alter table public.invitations
  drop column label,
  drop column emails,
  drop column guests,
  drop column archived_guests,
  drop column guest_details,
  drop column allow_plus_one,
  drop column plus_one,
  add column group_name text check (group_name is null or length(trim(group_name)) between 1 and 200);

alter table public.sites drop column rsvp_questions;

drop function if exists public.configure_questions(uuid, uuid, jsonb, integer);
drop function if exists public.save_rsvp_with_details(uuid, uuid, integer, jsonb, text, jsonb, text, uuid);
drop function if exists public.manage_invitation_base(uuid, uuid, text, uuid, jsonb);
drop function if exists public.save_rsvp(uuid, uuid, integer, jsonb, text, text, uuid);
drop function if exists public.save_guest_rsvp(uuid, uuid, integer, jsonb, text, jsonb, jsonb, text, uuid);
drop function if exists public.create_self_registered_invitation(uuid, uuid, text, text, boolean);
drop function if exists public.merge_pending_invitation(uuid, uuid, uuid, uuid);

-- Update publish_content so it no longer references the dropped invitations.emails column.
create or replace function public.publish_content(
  sid uuid,
  actor uuid,
  expected_revision integer,
  content jsonb,
  assets jsonb,
  source_release uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
  s public.sites;
  d public.drafts;
begin
  select * into s from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;
  if source_release is null then
    select * into d from public.drafts where site_id = sid for update;
    if d.revision is distinct from expected_revision or d.config is distinct from content then
      raise exception 'REVISION_CONFLICT';
    end if;
  elsif not exists(
    select 1 from public.releases
    where id = source_release and site_id = sid and config = content and asset_paths = assets
  ) then
    raise exception 'INVALID_RELEASE';
  end if;
  if content->>'schemaVersion' <> '3' or nullif(btrim(content#>>'{identity,displayName}'), '') is null then
    raise exception 'INVALID_PUBLICATION';
  end if;
  if s.public_variant_id is not null and not exists(
    select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = s.public_variant_id
  ) then
    raise exception 'VARIANT_MISSING';
  end if;
  if exists(
    select 1 from public.invitations i
    where i.site_id = sid and not i.revoked
      and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = i.variant_id)
  ) then
    raise exception 'VARIANT_MISSING';
  end if;
  if s.access_mode = 'code' and s.access_code_hash is null then
    raise exception 'CODE_REQUIRED';
  end if;
  insert into public.releases(site_id, config, asset_paths, engine_sha, created_by)
  values(sid, content, assets, 'shared-v1', actor)
  returning id into rid;
  update public.sites
  set published_release_id = rid,
      public_variant_id = coalesce(public_variant_id, content->>'defaultVariant')
  where id = sid;
  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, case when source_release is null then 'content.published' else 'content.restored' end);
  return rid;
end $$;

create or replace function public.replace_invitation_draft(
  sid uuid,
  actor uuid,
  expected_revision integer,
  content jsonb,
  snapshot_id uuid default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  d public.drafts;
  dependencies text;
begin
  select * into s from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then raise exception 'FORBIDDEN'; end if;
  select * into d from public.drafts where site_id = sid for update;
  if d.revision is distinct from expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  if content->>'id' is distinct from sid::text or content->>'schemaVersion' is distinct from '3' then raise exception 'INVALID_CONFIG'; end if;
  if snapshot_id is not null and not exists(select 1 from public.draft_snapshots where id = snapshot_id and site_id = sid and config = content) then raise exception 'INVALID_SNAPSHOT'; end if;
  select string_agg(
    coalesce(
      i.group_name,
      (select string_agg(ig.name, ', ' order by ig.position) from public.invitation_guests ig where ig.invitation_id = i.id and ig.kind = 'named'),
      i.short_code
    ),
    ', '
  ) into dependencies
  from public.invitations i
  where i.site_id = sid and not i.revoked and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = i.variant_id);
  if dependencies is not null then raise exception using message = 'VARIANT_IN_USE', detail = dependencies; end if;
  if s.public_variant_id is not null and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = s.public_variant_id) then raise exception using message = 'VARIANT_IN_USE', detail = 'Wariant strony ogólnej'; end if;
  insert into public.draft_snapshots(site_id, config, revision, created_by) values(sid, d.config, d.revision, actor);
  update public.drafts set config = content, revision = revision + 1, updated_at = now() where site_id = sid;
  insert into public.audit_events(site_id, actor_id, action) values(sid, actor, case when snapshot_id is null then 'draft.template_reset' else 'draft.snapshot_restored' end);
  return d.revision + 1;
end $$;

-- 1. Relational guests table (1..20 per invitation, named or companion).
create table public.invitation_guests (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null,
  site_id uuid not null,
  position smallint not null check (position >= 0 and position < 20),
  kind text not null check (kind in ('named', 'companion')),
  name text check (name is null or length(trim(name)) between 1 and 200),
  name_normalized text generated always as (public.normalize_guest_lookup(coalesce(name, ''))) stored,
  constraint named_has_name check (kind <> 'named' or name is not null),
  foreign key (site_id, invitation_id) references public.invitations(site_id, id) on delete cascade,
  unique (invitation_id, position) deferrable initially deferred
);

create index invitation_guests_by_invitation on public.invitation_guests (invitation_id, position);
create index invitation_guests_lookup on public.invitation_guests (site_id, name_normalized) where kind = 'named';

-- 2. Attendances table (replaces rsvp_answers).
create table public.attendances (
  site_id uuid not null,
  invitation_id uuid not null,
  guest_id uuid not null references public.invitation_guests(id) on delete cascade,
  event_id text not null,
  attending boolean not null,
  updated_at timestamptz not null default now(),
  primary key (guest_id, event_id),
  foreign key (site_id, invitation_id) references public.invitations(site_id, id) on delete cascade
);

create index attendances_by_site on public.attendances (site_id);
create index attendances_by_invitation on public.attendances (invitation_id);

-- 3. Organizer-defined RSVP questions and answers (outside Drafts/Releases).
create table public.rsvp_questions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  position smallint not null check (position >= 0 and position < 20),
  scope text not null check (scope in ('guest', 'invitation')),
  type text not null check (type in ('text', 'single', 'multi', 'number')),
  label text not null check (length(trim(label)) between 1 and 200),
  help text check (help is null or length(help) <= 500),
  required boolean not null default false,
  allow_other boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  variant_ids text[] not null default '{}'::text[],
  preset_key text check (preset_key is null or preset_key in ('diet', 'allergies', 'lodging', 'parking')),
  constraint options_only_for_choice check (
    (type in ('single', 'multi') and jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 1 and 20)
    or (type in ('text', 'number') and options = '[]'::jsonb and not allow_other)
  ),
  unique (site_id, position) deferrable initially deferred
);

create index rsvp_questions_by_site on public.rsvp_questions (site_id, position);

create table public.rsvp_question_answers (
  site_id uuid not null references public.sites(id) on delete cascade,
  question_id uuid not null references public.rsvp_questions(id) on delete cascade,
  invitation_id uuid not null,
  guest_id uuid references public.invitation_guests(id) on delete cascade,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  foreign key (site_id, invitation_id) references public.invitations(site_id, id) on delete cascade
);

create unique index rsvp_question_answers_guest_uq on public.rsvp_question_answers (question_id, guest_id) where guest_id is not null;
create unique index rsvp_question_answers_inv_uq on public.rsvp_question_answers (question_id, invitation_id) where guest_id is null;
create index rsvp_question_answers_by_site on public.rsvp_question_answers (site_id);
create index rsvp_question_answers_by_invitation on public.rsvp_question_answers (invitation_id);

-- 4. RLS & Grants.
alter table public.invitation_guests enable row level security;
alter table public.attendances enable row level security;
alter table public.rsvp_questions enable row level security;
alter table public.rsvp_question_answers enable row level security;

revoke all on public.invitation_guests, public.attendances, public.rsvp_questions, public.rsvp_question_answers from public, anon, authenticated;

create policy read_invitation_guests on public.invitation_guests for select to authenticated using (public.can_access_site(site_id));
create policy read_attendances on public.attendances for select to authenticated using (public.can_access_site(site_id));
create policy read_rsvp_questions on public.rsvp_questions for select to authenticated using (public.can_access_site(site_id));
create policy read_rsvp_question_answers on public.rsvp_question_answers for select to authenticated using (public.can_access_site(site_id));

revoke select on public.invitations from authenticated;
grant select(id, site_id, group_name, variant_id, revoked, version, rsvp_revision, note, short_code, origin, review_status, created_at) on public.invitations to authenticated;
grant select on public.invitation_guests, public.attendances, public.rsvp_questions, public.rsvp_question_answers to authenticated;
grant all on public.invitation_guests, public.attendances, public.rsvp_questions, public.rsvp_question_answers to service_role;

-- 5. Private validator for question answers.
create or replace function private.validate_question_answer(
  q public.rsvp_questions,
  val jsonb
) returns void
language plpgsql immutable set search_path = '' as $$
declare
  key_count integer;
  num_val numeric;
  opt_id text;
  seen_ids text[] := '{}'::text[];
  has_other boolean := false;
begin
  if val is null or jsonb_typeof(val) <> 'object' then
    raise exception 'INVALID_ANSWERS';
  end if;

  select count(*) into key_count from jsonb_object_keys(val);

  if q.type = 'text' then
    if key_count <> 1 or jsonb_typeof(val->'text') <> 'string' or length(trim(val->>'text')) not between 1 and 500 then
      raise exception 'INVALID_ANSWERS';
    end if;
  elsif q.type = 'number' then
    if key_count <> 1 or jsonb_typeof(val->'number') <> 'number' then
      raise exception 'INVALID_ANSWERS';
    end if;
    num_val := (val->>'number')::numeric;
    if num_val <> floor(num_val) or num_val < 0 or num_val > 99 then
      raise exception 'INVALID_ANSWERS';
    end if;
  elsif q.type in ('single', 'multi') then
    if exists(select 1 from jsonb_object_keys(val) k where k not in ('optionIds', 'other')) then
      raise exception 'INVALID_ANSWERS';
    end if;
    if jsonb_typeof(val->'optionIds') <> 'array' then
      raise exception 'INVALID_ANSWERS';
    end if;
    if val ? 'other' then
      if not q.allow_other or jsonb_typeof(val->'other') <> 'string' or length(trim(val->>'other')) not between 1 and 200 then
        raise exception 'INVALID_ANSWERS';
      end if;
      has_other := true;
    end if;

    for opt_id in select jsonb_array_elements_text(val->'optionIds') loop
      if opt_id = any(seen_ids) then
        raise exception 'INVALID_ANSWERS';
      end if;
      if not exists(select 1 from jsonb_array_elements(q.options) o where o->>'id' = opt_id) then
        raise exception 'INVALID_ANSWERS';
      end if;
      seen_ids := array_append(seen_ids, opt_id);
    end loop;

    if q.type = 'single' then
      if not (
        (cardinality(seen_ids) = 1 and not has_other)
        or (cardinality(seen_ids) = 0 and has_other)
      ) then
        raise exception 'INVALID_ANSWERS';
      end if;
    else
      if cardinality(seen_ids) = 0 and not has_other then
        raise exception 'INVALID_ANSWERS';
      end if;
    end if;
  end if;
end $$;

-- 6. Invitation management (create, update, rotate, revoke, convert-companion).
create or replace function public.manage_invitation(
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
  next_short_code text;
  clean_group_name text;
  guest_arr jsonb;
  guest_item jsonb;
  guest_count integer;
  named_count integer := 0;
  idx integer := 0;
  gid uuid;
  gkind text;
  gname text;
  keep_ids uuid[] := '{}'::uuid[];
  target_gid uuid;
begin
  select * into s from public.sites where id = sid for update;
  if s.id is null or not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;

  if operation in ('create', 'update') then
    select config into content from public.releases where site_id = sid and id = s.published_release_id;
    if content is null then
      select config into content from public.drafts where site_id = sid;
    end if;
    if not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id' = payload->>'variantId') then
      raise exception 'VARIANT_MISSING';
    end if;

    clean_group_name := nullif(trim(coalesce(payload->>'groupName', '')), '');
    if clean_group_name is not null and length(clean_group_name) > 200 then
      raise exception 'INVALID_ANSWERS';
    end if;

    guest_arr := payload->'guests';
    if jsonb_typeof(guest_arr) <> 'array' then
      raise exception 'INVALID_ANSWERS';
    end if;
    guest_count := jsonb_array_length(guest_arr);
    if guest_count not between 1 and 20 then
      raise exception 'INVALID_ANSWERS';
    end if;

    for guest_item in select * from jsonb_array_elements(guest_arr) loop
      if jsonb_typeof(guest_item) <> 'object' then
        raise exception 'INVALID_ANSWERS';
      end if;
      gkind := guest_item->>'kind';
      if gkind not in ('named', 'companion') then
        raise exception 'INVALID_ANSWERS';
      end if;
      if guest_item ? 'name' and guest_item->'name' <> 'null'::jsonb then
        if jsonb_typeof(guest_item->'name') <> 'string' then
          raise exception 'INVALID_ANSWERS';
        end if;
        gname := nullif(trim(guest_item->>'name'), '');
      else
        gname := null;
      end if;
      if gkind = 'named' and (gname is null or length(gname) not between 1 and 200) then
        raise exception 'INVALID_ANSWERS';
      end if;
      if gname is not null and length(gname) > 200 then
        raise exception 'INVALID_ANSWERS';
      end if;
      if gkind = 'named' then
        named_count := named_count + 1;
      end if;
      if guest_item ? 'id' and guest_item->'id' <> 'null'::jsonb and coalesce(guest_item->>'id', '') <> '' then
        begin
          gid := (guest_item->>'id')::uuid;
        exception when invalid_text_representation then
          raise exception 'INVALID_ANSWERS';
        end;
        if gid = any(keep_ids) then
          raise exception 'INVALID_ANSWERS';
        end if;
        if exists(select 1 from public.invitation_guests ig where ig.id = gid and ig.invitation_id <> iid) then
          raise exception 'INVALID_ANSWERS';
        end if;
        keep_ids := array_append(keep_ids, gid);
      end if;
    end loop;

    if named_count < 1 then
      raise exception 'INVALID_ANSWERS';
    end if;

    if operation = 'create' then
      next_short_code := coalesce(
        nullif(upper(trim(coalesce(payload->>'shortCode', ''))), ''),
        public.next_unique_short_code(sid)
      );
      insert into public.invitations(id, site_id, group_name, variant_id, token_hash, short_code)
      values(iid, sid, clean_group_name, payload->>'variantId', payload->>'tokenHash', next_short_code);
    else
      select * into old_inv
      from public.invitations
      where id = iid and site_id = sid and version = (payload->>'version')::integer
      for update;
      if not found then
        raise exception 'REVISION_CONFLICT';
      end if;

      update public.invitations
      set group_name = clean_group_name,
          variant_id = payload->>'variantId',
          rsvp_revision = rsvp_revision + 1,
          version = version + 1
      where id = iid and site_id = sid;

      delete from public.invitation_guests
      where invitation_id = iid and not (id = any(keep_ids));
    end if;

    idx := 0;
    for guest_item in select * from jsonb_array_elements(guest_arr) loop
      gkind := guest_item->>'kind';
      gname := case
        when guest_item ? 'name' and guest_item->'name' <> 'null'::jsonb then nullif(trim(guest_item->>'name'), '')
        else null
      end;
      if guest_item ? 'id' and guest_item->'id' <> 'null'::jsonb and coalesce(guest_item->>'id', '') <> '' then
        gid := (guest_item->>'id')::uuid;
      else
        gid := gen_random_uuid();
      end if;

      insert into public.invitation_guests(id, invitation_id, site_id, position, kind, name)
      values(gid, iid, sid, idx, gkind, gname)
      on conflict (id) do update
        set position = excluded.position,
            kind = excluded.kind,
            name = excluded.name;
      idx := idx + 1;
    end loop;

  elsif operation = 'convert-companion' then
    select * into old_inv
    from public.invitations
    where id = iid and site_id = sid and version = (payload->>'version')::integer
    for update;
    if not found then
      raise exception 'REVISION_CONFLICT';
    end if;
    begin
      target_gid := (payload->>'guestId')::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ANSWERS';
    end;
    gname := trim(coalesce(payload->>'name', ''));
    if length(gname) not between 1 and 200 then
      raise exception 'INVALID_ANSWERS';
    end if;
    update public.invitation_guests
    set kind = 'named', name = gname
    where id = target_gid and invitation_id = iid and site_id = sid and kind = 'companion';
    if not found then
      raise exception 'NOT_FOUND';
    end if;
    update public.invitations
    set version = version + 1
    where id = iid and site_id = sid;

  elsif operation = 'rotate' then
    select config into content from public.releases where site_id = sid and id = s.published_release_id;
    if content is null then
      select config into content from public.drafts where site_id = sid;
    end if;
    if not exists(
      select 1 from public.invitations i, jsonb_array_elements(content->'variants') v
      where i.id = iid and i.site_id = sid and v->>'id' = i.variant_id
    ) then
      raise exception 'VARIANT_MISSING';
    end if;
    update public.invitations
    set token_hash = payload->>'tokenHash', version = version + 1, revoked = false
    where id = iid and site_id = sid;
    if not found then
      raise exception 'NOT_FOUND';
    end if;

  elsif operation = 'revoke' then
    update public.invitations
    set revoked = true, version = version + 1
    where id = iid and site_id = sid;
    if not found then
      raise exception 'NOT_FOUND';
    end if;

  else
    raise exception 'INVALID_OPERATION';
  end if;

  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, 'invitation.' || operation);
  return iid;
end $$;

create or replace function public.import_guests(
  sid uuid,
  actor uuid,
  request_id uuid,
  entries jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  existing jsonb;
  ids jsonb := '[]'::jsonb;
  entry jsonb;
  iid uuid;
begin
  perform 1 from public.sites where id = sid for update;
  if not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;
  select invitation_ids into existing
  from public.guest_imports g
  where g.site_id = sid and g.request_id = import_guests.request_id;
  if existing is not null then
    return jsonb_build_object('created', false, 'ids', existing);
  end if;
  if jsonb_typeof(entries) <> 'array' or jsonb_array_length(entries) not between 1 and 200 then
    raise exception 'INVALID_ANSWERS';
  end if;
  for entry in select * from jsonb_array_elements(entries) loop
    iid := (entry->>'id')::uuid;
    perform public.manage_invitation(sid, actor, 'create', iid, entry->'payload');
    ids := ids || jsonb_build_array(iid);
  end loop;
  insert into public.guest_imports values(sid, request_id, ids, now());
  return jsonb_build_object('created', true, 'ids', ids);
end $$;

-- 7. Organizer-defined RSVP questions management.
create or replace function public.manage_rsvp_questions(
  sid uuid,
  actor uuid,
  questions jsonb,
  expected_version integer
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  q_item jsonb;
  q_id uuid;
  q_existing public.rsvp_questions;
  q_scope text;
  q_type text;
  q_label text;
  q_help text;
  q_required boolean;
  q_allow_other boolean;
  q_options jsonb;
  q_variant_ids text[];
  q_preset text;
  opt jsonb;
  opt_ids text[];
  keep_ids uuid[] := '{}'::uuid[];
  idx integer := 0;
  ans_row record;
  filtered_opts jsonb;
  has_other_val boolean;
begin
  select * into s from public.sites where id = sid for update;
  if s.id is null or not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;
  if s.access_version <> expected_version then
    raise exception 'REVISION_CONFLICT';
  end if;
  if jsonb_typeof(questions) <> 'array' or jsonb_array_length(questions) > 20 then
    raise exception 'INVALID_ANSWERS';
  end if;

  for q_item in select * from jsonb_array_elements(questions) loop
    if jsonb_typeof(q_item) <> 'object' then
      raise exception 'INVALID_ANSWERS';
    end if;
    q_scope := q_item->>'scope';
    q_type := q_item->>'type';
    q_label := trim(coalesce(q_item->>'label', ''));
    q_help := nullif(trim(coalesce(q_item->>'help', '')), '');
    q_required := coalesce((q_item->>'required')::boolean, false);
    q_allow_other := coalesce((q_item->>'allowOther')::boolean, false);
    q_options := coalesce(q_item->'options', '[]'::jsonb);
    q_preset := nullif(trim(coalesce(q_item->>'presetKey', '')), '');
    q_variant_ids := coalesce(
      array(select jsonb_array_elements_text(coalesce(q_item->'variantIds', '[]'::jsonb))),
      '{}'::text[]
    );

    if q_scope not in ('guest', 'invitation')
      or q_type not in ('text', 'single', 'multi', 'number')
      or length(q_label) not between 1 and 200
      or (q_help is not null and length(q_help) > 500)
      or (q_preset is not null and q_preset not in ('diet', 'allergies', 'lodging', 'parking')) then
      raise exception 'INVALID_ANSWERS';
    end if;

    if q_type in ('text', 'number') then
      if q_allow_other or jsonb_typeof(q_options) <> 'array' or jsonb_array_length(q_options) <> 0 then
        raise exception 'INVALID_ANSWERS';
      end if;
    else
      if jsonb_typeof(q_options) <> 'array' or jsonb_array_length(q_options) not between 1 and 20 then
        raise exception 'INVALID_ANSWERS';
      end if;
      opt_ids := '{}'::text[];
      for opt in select * from jsonb_array_elements(q_options) loop
        if jsonb_typeof(opt) <> 'object'
          or length(trim(coalesce(opt->>'id', ''))) not between 1 and 64
          or length(trim(coalesce(opt->>'label', ''))) not between 1 and 100
          or (opt->>'id') = any(opt_ids) then
          raise exception 'INVALID_ANSWERS';
        end if;
        opt_ids := array_append(opt_ids, opt->>'id');
      end loop;
    end if;

    if q_item ? 'id' and q_item->'id' <> 'null'::jsonb and coalesce(q_item->>'id', '') <> '' then
      begin
        q_id := (q_item->>'id')::uuid;
      exception when invalid_text_representation then
        raise exception 'INVALID_ANSWERS';
      end;
      if q_id = any(keep_ids) then
        raise exception 'INVALID_ANSWERS';
      end if;
      select * into q_existing from public.rsvp_questions where id = q_id and site_id = sid;
      if found then
        if (q_existing.type <> q_type or q_existing.scope <> q_scope)
          and exists(select 1 from public.rsvp_question_answers a where a.question_id = q_id) then
          raise exception 'QUESTION_IMMUTABLE';
        end if;
      end if;
      keep_ids := array_append(keep_ids, q_id);
    end if;
  end loop;

  delete from public.rsvp_questions
  where site_id = sid and not (id = any(keep_ids));

  idx := 0;
  for q_item in select * from jsonb_array_elements(questions) loop
    q_scope := q_item->>'scope';
    q_type := q_item->>'type';
    q_label := trim(q_item->>'label');
    q_help := nullif(trim(coalesce(q_item->>'help', '')), '');
    q_required := coalesce((q_item->>'required')::boolean, false);
    q_allow_other := coalesce((q_item->>'allowOther')::boolean, false);
    q_options := case
      when q_type in ('single', 'multi') then (
        select jsonb_agg(jsonb_build_object('id', trim(o->>'id'), 'label', trim(o->>'label')))
        from jsonb_array_elements(q_item->'options') o
      )
      else '[]'::jsonb
    end;
    q_variant_ids := coalesce(
      array(select jsonb_array_elements_text(coalesce(q_item->'variantIds', '[]'::jsonb))),
      '{}'::text[]
    );
    q_preset := nullif(trim(coalesce(q_item->>'presetKey', '')), '');

    if q_item ? 'id' and q_item->'id' <> 'null'::jsonb and coalesce(q_item->>'id', '') <> '' then
      q_id := (q_item->>'id')::uuid;
    else
      q_id := gen_random_uuid();
    end if;

    insert into public.rsvp_questions(id, site_id, position, scope, type, label, help, required, allow_other, options, variant_ids, preset_key)
    values(q_id, sid, idx, q_scope, q_type, q_label, q_help, q_required, q_allow_other, q_options, q_variant_ids, q_preset)
    on conflict (id) do update
      set position = excluded.position,
          scope = excluded.scope,
          type = excluded.type,
          label = excluded.label,
          help = excluded.help,
          required = excluded.required,
          allow_other = excluded.allow_other,
          options = excluded.options,
          variant_ids = excluded.variant_ids,
          preset_key = excluded.preset_key;

    if q_type in ('single', 'multi') then
      select array_agg(o->>'id') into opt_ids from jsonb_array_elements(q_options) o;
      for ans_row in
        select ctid, value from public.rsvp_question_answers where question_id = q_id
      loop
        select coalesce(jsonb_agg(e), '[]'::jsonb)
        into filtered_opts
        from jsonb_array_elements_text(coalesce(ans_row.value->'optionIds', '[]'::jsonb)) e
        where e = any(opt_ids);

        has_other_val := q_allow_other
          and ans_row.value ? 'other'
          and length(trim(coalesce(ans_row.value->>'other', ''))) > 0;

        if jsonb_array_length(filtered_opts) = 0 and not has_other_val then
          delete from public.rsvp_question_answers where ctid = ans_row.ctid;
        else
          update public.rsvp_question_answers
          set value = case
            when has_other_val then jsonb_build_object('optionIds', filtered_opts, 'other', ans_row.value->>'other')
            else jsonb_build_object('optionIds', filtered_opts)
          end
          where ctid = ans_row.ctid;
        end if;
      end loop;
    end if;

    idx := idx + 1;
  end loop;

  update public.sites set access_version = access_version + 1 where id = sid;
  insert into public.audit_events(site_id, actor_id, action) values(sid, actor, 'questions.updated');
end $$;

-- 8. Guest lookup (Named Guests + group_name only, never Companion names).
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
  reversed_dis text;
  dis_parts text[];
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
    and exists (
      select 1
      from public.invitation_guests ig
      where ig.invitation_id = i.id
        and ig.kind = 'named'
        and (
          ig.name_normalized = q
          or (reversed_q is not null and ig.name_normalized = reversed_q)
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
      dis_parts := string_to_array(dis_norm, ' ');
      if array_length(dis_parts, 1) = 2 then
        reversed_dis := dis_parts[2] || ' ' || dis_parts[1];
      else
        reversed_dis := null;
      end if;

      select array_agg(i.id) into candidate_ids
      from public.invitations i
      where i.id = any(candidate_ids)
        and exists (
          select 1
          from public.invitation_guests ig
          where ig.invitation_id = i.id
            and ig.kind = 'named'
            and (
              ig.name_normalized = dis_norm
              or (reversed_dis is not null and ig.name_normalized = reversed_dis)
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

-- 9. Shared private RSVP applier + atomic self-registration.
create or replace function private.apply_rsvp(
  s public.sites,
  i public.invitations,
  expected_revision integer,
  answers jsonb,
  message text,
  companion_names jsonb,
  question_answers jsonb,
  is_admin boolean,
  actor uuid
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := s.id;
  iid uuid := i.id;
  content jsonb;
  variant jsonb;
  answer jsonb;
  comp_item record;
  comp_gid uuid;
  comp_name text;
  qa_item jsonb;
  q_row public.rsvp_questions;
  qa_gid uuid;
  attending_gids uuid[];
  req_q public.rsvp_questions;
  att_gid uuid;
  ev_id text;
begin
  if s.published_release_id is null then
    raise exception 'UNPUBLISHED';
  end if;
  if i.rsvp_revision <> expected_revision then
    raise exception 'REVISION_CONFLICT';
  end if;
  if length(coalesce(message, '')) > 2000
    or jsonb_typeof(answers) <> 'array'
    or jsonb_array_length(answers) > 1000
    or jsonb_typeof(companion_names) <> 'object'
    or jsonb_typeof(question_answers) <> 'array'
    or jsonb_array_length(question_answers) > 500 then
    raise exception 'INVALID_ANSWERS';
  end if;

  select config into content from public.releases where id = s.published_release_id and site_id = sid;
  select v into variant from jsonb_array_elements(content->'variants') v where v->>'id' = i.variant_id;
  if variant is null then
    raise exception 'VARIANT_MISSING';
  end if;
  if (select count(*) from jsonb_array_elements(answers)) <> (select count(distinct (v->>'guestId', v->>'eventId')) from jsonb_array_elements(answers) v) then
    raise exception 'INVALID_ANSWERS';
  end if;

  for answer in select * from jsonb_array_elements(answers) loop
    begin
      qa_gid := (answer->>'guestId')::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ANSWERS';
    end;
    if not exists(select 1 from public.invitation_guests ig where ig.id = qa_gid and ig.invitation_id = iid)
      or not exists(select 1 from jsonb_array_elements(content->'events') e where e->>'id' = answer->>'eventId')
      or not (variant->'eventIds') ? (answer->>'eventId')
      or jsonb_typeof(answer->'attending') is distinct from 'boolean' then
      raise exception 'INVALID_ANSWERS';
    end if;

    insert into public.attendances(site_id, invitation_id, guest_id, event_id, attending)
    values(sid, iid, qa_gid, answer->>'eventId', (answer->>'attending')::boolean)
    on conflict (guest_id, event_id) do update
      set attending = excluded.attending, updated_at = now();
  end loop;

  for ev_id in select jsonb_array_elements_text(variant->'eventIds') loop
    if not exists(
      select 1
      from public.attendances a
      join public.invitation_guests ig on ig.id = a.guest_id
      where a.invitation_id = iid
        and a.event_id = ev_id
        and ig.kind = 'named'
        and a.attending = true
    ) then
      if exists(
        select 1 from jsonb_array_elements(answers) ans
        join public.invitation_guests ig on ig.id = (ans->>'guestId')::uuid
        where ig.kind = 'companion'
          and ans->>'eventId' = ev_id
          and (ans->>'attending')::boolean = true
      ) then
        raise exception 'INVALID_ANSWERS';
      end if;
      update public.attendances a
      set attending = false, updated_at = now()
      from public.invitation_guests ig
      where a.guest_id = ig.id
        and a.invitation_id = iid
        and a.event_id = ev_id
        and ig.kind = 'companion'
        and a.attending = true;
    end if;
  end loop;

  for comp_item in select * from jsonb_each(companion_names) loop
    begin
      comp_gid := comp_item.key::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ANSWERS';
    end;
    if not exists(
      select 1 from public.invitation_guests ig
      where ig.id = comp_gid and ig.invitation_id = iid and ig.kind = 'companion'
    ) then
      raise exception 'INVALID_ANSWERS';
    end if;
    if comp_item.value = 'null'::jsonb then
      comp_name := null;
    elsif jsonb_typeof(comp_item.value) = 'string' then
      comp_name := nullif(trim(comp_item.value #>> '{}'), '');
      if comp_name is not null and length(comp_name) > 200 then
        raise exception 'INVALID_ANSWERS';
      end if;
    else
      raise exception 'INVALID_ANSWERS';
    end if;
    update public.invitation_guests set name = comp_name where id = comp_gid;
  end loop;

  select coalesce(array_agg(distinct a.guest_id), '{}'::uuid[])
  into attending_gids
  from public.attendances a
  where a.invitation_id = iid
    and a.attending = true
    and (variant->'eventIds') ? a.event_id;

  for qa_item in select * from jsonb_array_elements(question_answers) loop
    if jsonb_typeof(qa_item) <> 'object' then
      raise exception 'INVALID_ANSWERS';
    end if;
    begin
      select * into q_row
      from public.rsvp_questions
      where id = (qa_item->>'questionId')::uuid and site_id = sid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ANSWERS';
    end;
    if not found then
      raise exception 'INVALID_ANSWERS';
    end if;
    if cardinality(q_row.variant_ids) > 0 and not (i.variant_id = any(q_row.variant_ids)) then
      raise exception 'INVALID_ANSWERS';
    end if;

    if q_row.scope = 'guest' then
      begin
        qa_gid := (qa_item->>'guestId')::uuid;
      exception when invalid_text_representation then
        raise exception 'INVALID_ANSWERS';
      end;
      if qa_gid is null or not (qa_gid = any(attending_gids)) then
        continue;
      end if;
    else
      if qa_item ? 'guestId' and qa_item->'guestId' <> 'null'::jsonb and coalesce(qa_item->>'guestId', '') <> '' then
        raise exception 'INVALID_ANSWERS';
      end if;
      qa_gid := null;
      if cardinality(attending_gids) = 0 then
        continue;
      end if;
    end if;

    if not (qa_item ? 'value') or qa_item->'value' = 'null'::jsonb then
      if qa_gid is not null then
        delete from public.rsvp_question_answers where question_id = q_row.id and guest_id = qa_gid;
      else
        delete from public.rsvp_question_answers where question_id = q_row.id and invitation_id = iid and guest_id is null;
      end if;
    else
      perform private.validate_question_answer(q_row, qa_item->'value');
      if qa_gid is not null then
        insert into public.rsvp_question_answers(site_id, question_id, invitation_id, guest_id, value)
        values(sid, q_row.id, iid, qa_gid, qa_item->'value')
        on conflict (question_id, guest_id) where guest_id is not null do update
          set value = excluded.value, updated_at = now();
      else
        insert into public.rsvp_question_answers(site_id, question_id, invitation_id, guest_id, value)
        values(sid, q_row.id, iid, null, qa_item->'value')
        on conflict (question_id, invitation_id) where guest_id is null do update
          set value = excluded.value, updated_at = now();
      end if;
    end if;
  end loop;

  if not is_admin then
    for req_q in
      select * from public.rsvp_questions
      where site_id = sid
        and required = true
        and (cardinality(variant_ids) = 0 or i.variant_id = any(variant_ids))
    loop
      if req_q.scope = 'guest' then
        foreach att_gid in array attending_gids loop
          if not exists(
            select 1 from public.rsvp_question_answers
            where question_id = req_q.id and guest_id = att_gid
          ) then
            raise exception 'REQUIRED_QUESTION_MISSING';
          end if;
        end loop;
      elsif cardinality(attending_gids) > 0 then
        if not exists(
          select 1 from public.rsvp_question_answers
          where question_id = req_q.id and invitation_id = iid and guest_id is null
        ) then
          raise exception 'REQUIRED_QUESTION_MISSING';
        end if;
      end if;
    end loop;
  end if;

  update public.invitations
  set rsvp_revision = rsvp_revision + 1,
      note = coalesce(message, '')
  where id = iid;

  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, 'rsvp.updated');
  return i.rsvp_revision + 1;
end $$;

create or replace function public.create_self_registered_invitation(
  sid uuid,
  iid uuid,
  guest_name text,
  token_hash text,
  with_companion boolean default false,
  companion_name text default null,
  answers jsonb default '[]'::jsonb,
  message text default '',
  question_answers jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  new_inv public.invitations;
  content jsonb;
  target_variant text;
  clean_name text;
  clean_comp text;
  named_gid uuid;
  comp_gid uuid;
  mapped_answers jsonb;
  mapped_qanswers jsonb;
begin
  clean_name := trim(coalesce(guest_name, ''));
  if length(clean_name) not between 1 and 200 then
    raise exception 'INVALID_ANSWERS';
  end if;
  clean_comp := nullif(trim(coalesce(companion_name, '')), '');
  if clean_comp is not null and length(clean_comp) > 200 then
    raise exception 'INVALID_ANSWERS';
  end if;
  if answers is null or jsonb_typeof(answers) = 'null' then
    answers := '[]'::jsonb;
  end if;
  if question_answers is null or jsonb_typeof(question_answers) = 'null' then
    question_answers := '[]'::jsonb;
  end if;
  if jsonb_typeof(answers) <> 'array' or jsonb_typeof(question_answers) <> 'array' then
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
  if s.rsvp_deadline is not null and now() > s.rsvp_deadline then
    raise exception 'RSVP_CLOSED';
  end if;

  select config into content from public.releases where id = s.published_release_id and site_id = sid;
  target_variant := coalesce(s.public_variant_id, content->>'defaultVariant');
  if target_variant is null then
    raise exception 'VARIANT_MISSING';
  end if;

  insert into public.invitations(
    id, site_id, group_name, variant_id, token_hash, short_code, origin, review_status
  )
  values (
    iid, sid, null, target_variant, token_hash, public.next_unique_short_code(sid), 'self_registered', 'pending_match'
  )
  returning * into new_inv;

  insert into public.invitation_guests(invitation_id, site_id, position, kind, name)
  values (iid, sid, 0, 'named', clean_name)
  returning id into named_gid;

  if with_companion then
    insert into public.invitation_guests(invitation_id, site_id, position, kind, name)
    values (iid, sid, 1, 'companion', clean_comp)
    returning id into comp_gid;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_set(
        a,
        '{guestId}',
        to_jsonb(
          case
            when comp_gid is not null and a->>'guestId' = '00000000-0000-4000-8000-000000000002' then comp_gid::text
            else named_gid::text
          end
        )
      )
    ),
    '[]'::jsonb
  )
  into mapped_answers
  from jsonb_array_elements(answers) a;

  select coalesce(
    jsonb_agg(
      case
        when qa ? 'guestId' and qa->'guestId' <> 'null'::jsonb and coalesce(qa->>'guestId', '') <> '' then
          jsonb_set(
            qa,
            '{guestId}',
            to_jsonb(
              case
                when comp_gid is not null and qa->>'guestId' = '00000000-0000-4000-8000-000000000002' then comp_gid::text
                else named_gid::text
              end
            )
          )
        else qa
      end
    ),
    '[]'::jsonb
  )
  into mapped_qanswers
  from jsonb_array_elements(question_answers) qa;

  perform private.apply_rsvp(
    s,
    new_inv,
    0,
    mapped_answers,
    coalesce(message, ''),
    '{}'::jsonb,
    mapped_qanswers,
    false,
    null
  );

  insert into public.audit_events(site_id, actor_id, action)
  values(sid, null, 'invitation.self_registered');
  return iid;
end $$;

create or replace function public.merge_pending_invitation(
  sid uuid,
  actor uuid,
  pending_iid uuid,
  target_iid uuid,
  target_guest_id uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  pending_inv public.invitations;
  target_inv public.invitations;
  pending_named public.invitation_guests;
  pending_comp public.invitation_guests;
  resolved_target_gid uuid;
  target_count integer;
  next_pos smallint;
  next_note text;
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

  select * into pending_named from public.invitation_guests where invitation_id = pending_iid and kind = 'named' order by position limit 1;
  select * into pending_comp from public.invitation_guests where invitation_id = pending_iid and kind = 'companion' order by position limit 1;

  select count(*), coalesce(max(position), -1) + 1 into target_count, next_pos
  from public.invitation_guests where invitation_id = target_iid;

  if target_guest_id is not null then
    select id into resolved_target_gid
    from public.invitation_guests
    where id = target_guest_id and invitation_id = target_iid and kind = 'named';
    if resolved_target_gid is null then
      raise exception 'NOT_FOUND';
    end if;
  end if;

  if resolved_target_gid is not null then
    insert into public.attendances(site_id, invitation_id, guest_id, event_id, attending)
    select sid, target_iid, resolved_target_gid, event_id, attending
    from public.attendances where guest_id = pending_named.id
    on conflict (guest_id, event_id) do update
      set attending = excluded.attending, updated_at = now();

    insert into public.rsvp_question_answers(site_id, question_id, invitation_id, guest_id, value)
    select sid, question_id, target_iid, resolved_target_gid, value
    from public.rsvp_question_answers where guest_id = pending_named.id
    on conflict (question_id, guest_id) where guest_id is not null do update
      set value = excluded.value, updated_at = now();
  else
    if target_count >= 20 then
      raise exception 'INVALID_ANSWERS';
    end if;
    update public.invitation_guests
    set invitation_id = target_iid, position = next_pos
    where id = pending_named.id;
    update public.attendances set invitation_id = target_iid where guest_id = pending_named.id;
    update public.rsvp_question_answers set invitation_id = target_iid where guest_id = pending_named.id;
    target_count := target_count + 1;
    next_pos := next_pos + 1;
  end if;

  if pending_comp.id is not null then
    if target_count >= 20 then
      raise exception 'INVALID_ANSWERS';
    end if;
    update public.invitation_guests
    set invitation_id = target_iid, position = next_pos
    where id = pending_comp.id;
    update public.attendances set invitation_id = target_iid where guest_id = pending_comp.id;
    update public.rsvp_question_answers set invitation_id = target_iid where guest_id = pending_comp.id;
  end if;

  insert into public.rsvp_question_answers(site_id, question_id, invitation_id, guest_id, value)
  select sid, question_id, target_iid, null, value
  from public.rsvp_question_answers
  where invitation_id = pending_iid and guest_id is null
  on conflict (question_id, invitation_id) where guest_id is null do nothing;

  next_note := case
    when coalesce(trim(pending_inv.note), '') = '' then target_inv.note
    when coalesce(trim(target_inv.note), '') = '' then pending_inv.note
    else target_inv.note || E'\n' || pending_inv.note
  end;

  update public.invitations
  set note = next_note,
      rsvp_revision = rsvp_revision + 1,
      version = version + 1
  where id = target_iid and site_id = sid;

  delete from public.guest_sessions where invitation_id = pending_iid and site_id = sid;
  delete from public.invitations where id = pending_iid and site_id = sid;

  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, 'invitation.merged');
end $$;

-- 10. Save RSVP (attendances + companion names + question answers).
create or replace function public.save_guest_rsvp(
  sid uuid,
  iid uuid,
  expected_revision integer,
  answers jsonb,
  message text,
  companion_names jsonb default '{}'::jsonb,
  question_answers jsonb default '[]'::jsonb,
  session_hash text default null,
  actor uuid default null
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  i public.invitations;
  g public.guest_sessions;
  is_admin boolean;
begin
  if companion_names is null or jsonb_typeof(companion_names) = 'null' then
    companion_names := '{}'::jsonb;
  end if;
  if question_answers is null or jsonb_typeof(question_answers) = 'null' then
    question_answers := '[]'::jsonb;
  end if;

  select * into s from public.sites where id = sid for update;
  select * into i from public.invitations where id = iid and site_id = sid for update;
  if i.id is null then
    raise exception 'FORBIDDEN';
  end if;

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

  return private.apply_rsvp(
    s,
    i,
    expected_revision,
    answers,
    message,
    companion_names,
    question_answers,
    is_admin,
    actor
  );
end $$;

-- 11. Lock down new/updated functions to service_role only.
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on p.pronamespace = n.oid
    where (n.nspname = 'public' and p.proname in (
        'manage_invitation',
        'import_guests',
        'manage_rsvp_questions',
        'lookup_guest_invitation',
        'create_self_registered_invitation',
        'merge_pending_invitation',
        'save_guest_rsvp'
      ))
      or (n.nspname = 'private' and p.proname in ('validate_question_answer', 'apply_rsvp'))
  loop
    execute format('revoke all on function %s from public,anon,authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
