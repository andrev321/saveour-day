-- Allow organizers to choose RSVP attendance granularity: whole event as one ('overall') or selected schedule events ('events').

alter table public.sites
  add column rsvp_attendance_mode text not null default 'overall'
    check (rsvp_attendance_mode in ('overall', 'events')),
  add column rsvp_event_ids text[] not null default '{}'::text[];

grant select(rsvp_attendance_mode, rsvp_event_ids) on public.sites to authenticated;

-- Preserve existing event-level responses on sites that already have attendances.
update public.sites s
set rsvp_attendance_mode = 'events',
    rsvp_event_ids = coalesce(
      (
        select array_agg(distinct a.event_id order by a.event_id)
        from public.attendances a
        where a.site_id = s.id and a.event_id <> '__overall__'
      ),
      '{}'::text[]
    )
where exists (
  select 1 from public.attendances a
  where a.site_id = s.id and a.event_id <> '__overall__'
);

create or replace function private.resolve_rsvp_event_ids(
  s public.sites,
  content jsonb,
  variant jsonb
) returns text[]
language plpgsql immutable set search_path = '' as $$
declare
  matched text[];
begin
  if s.rsvp_attendance_mode = 'overall' then
    return array['__overall__']::text[];
  end if;

  select coalesce(array_agg(eid order by ord), '{}'::text[])
  into matched
  from jsonb_array_elements_text(variant->'eventIds') with ordinality as ve(eid, ord)
  where eid = any(s.rsvp_event_ids)
    and exists(
      select 1 from jsonb_array_elements(content->'events') e where e->>'id' = eid
    );

  if cardinality(matched) = 0 then
    return array['__overall__']::text[];
  end if;

  return matched;
end $$;

drop function if exists public.configure_rsvp_options(uuid, uuid, boolean, boolean, integer);

create or replace function public.configure_rsvp_options(
  sid uuid,
  actor uuid,
  rsvp_on boolean,
  self_reg boolean,
  expected_version integer,
  attendance_mode text default null,
  event_ids text[] default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.sites;
  next_mode text;
  next_event_ids text[];
  clean_event_ids text[];
begin
  select * into s from public.sites where id = sid for update;
  if s.id is null or not public.can_access_site(sid, actor) then
    raise exception 'FORBIDDEN';
  end if;
  if s.access_version <> expected_version then
    raise exception 'REVISION_CONFLICT';
  end if;

  next_mode := coalesce(attendance_mode, s.rsvp_attendance_mode);
  if next_mode not in ('overall', 'events') then
    raise exception 'INVALID_ANSWERS';
  end if;

  if event_ids is not null then
    select coalesce(array_agg(eid order by min_ord), '{}'::text[])
    into clean_event_ids
    from (
      select eid, min(ord) as min_ord
      from unnest(event_ids) with ordinality as t(eid, ord)
      where eid ~ '^[a-z0-9][a-z0-9-]{0,63}$'
      group by eid
    ) sub;
    if cardinality(clean_event_ids) <> coalesce(cardinality(event_ids), 0) then
      raise exception 'INVALID_ANSWERS';
    end if;
    next_event_ids := clean_event_ids;
  else
    next_event_ids := s.rsvp_event_ids;
  end if;

  if next_mode = 'events' and (cardinality(next_event_ids) = 0 or cardinality(next_event_ids) > 50) then
    raise exception 'INVALID_ANSWERS';
  end if;

  update public.sites
  set rsvp_enabled = rsvp_on,
      allow_self_registration = case when rsvp_on then self_reg else false end,
      rsvp_attendance_mode = next_mode,
      rsvp_event_ids = next_event_ids,
      access_version = access_version + 1
  where id = sid;

  insert into public.audit_events(site_id, actor_id, action)
  values(sid, actor, 'rsvp_options.updated');
end $$;

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
  allowed_event_ids text[];
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

  allowed_event_ids := private.resolve_rsvp_event_ids(s, content, variant);

  for answer in select * from jsonb_array_elements(answers) loop
    begin
      qa_gid := (answer->>'guestId')::uuid;
    exception when invalid_text_representation then
      raise exception 'INVALID_ANSWERS';
    end;
    if not exists(select 1 from public.invitation_guests ig where ig.id = qa_gid and ig.invitation_id = iid)
      or not ((answer->>'eventId') = any(allowed_event_ids))
      or jsonb_typeof(answer->'attending') is distinct from 'boolean' then
      raise exception 'INVALID_ANSWERS';
    end if;

    insert into public.attendances(site_id, invitation_id, guest_id, event_id, attending)
    values(sid, iid, qa_gid, answer->>'eventId', (answer->>'attending')::boolean)
    on conflict (guest_id, event_id) do update
      set attending = excluded.attending, updated_at = now();
  end loop;

  foreach ev_id in array allowed_event_ids loop
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
    and a.event_id = any(allowed_event_ids);

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

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where (n.nspname = 'public' and p.proname = 'configure_rsvp_options')
       or (n.nspname = 'private' and p.proname in ('resolve_rsvp_event_ids', 'apply_rsvp'))
  loop
    execute format('revoke all on function %s from public,anon,authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;
