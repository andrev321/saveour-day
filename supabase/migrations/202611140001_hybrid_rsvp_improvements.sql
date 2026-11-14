-- Improve normalize_guest_lookup for hyphenated surnames and disambiguator reversed order.

create or replace function public.normalize_guest_lookup(input text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(
    regexp_replace(
      translate(
        lower(trim(coalesce(input, ''))),
        'ąćęłńóśźżäöüß',
        'acelnoszzaous'
      ),
      '[-–—]+',
      ' ',
      'g'
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
      dis_parts := string_to_array(dis_norm, ' ');
      if array_length(dis_parts, 1) = 2 then
        reversed_dis := dis_parts[2] || ' ' || dis_parts[1];
      else
        reversed_dis := null;
      end if;

      select array_agg(i.id) into candidate_ids
      from public.invitations i
      where i.id = any(candidate_ids)
        and (
          public.normalize_guest_lookup(i.label) = dis_norm
          or (reversed_dis is not null and public.normalize_guest_lookup(i.label) = reversed_dis)
          or exists (
            select 1
            from jsonb_array_elements(i.guests) g
            where public.normalize_guest_lookup(g->>'name') = dis_norm
               or (reversed_dis is not null and public.normalize_guest_lookup(g->>'name') = reversed_dis)
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
