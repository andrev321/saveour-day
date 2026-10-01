-- One-time conversion to the contextual editor. IDs, asset paths and RSVP stay intact.
create schema if not exists private;
create function private.editor_crop(asset jsonb, device text) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('x',coalesce(asset->(case device when 'mobile' then 'mobileFocalX' when 'tablet' then 'tabletFocalX' else 'focalX' end),'50'::jsonb),'y',coalesce(asset->(case device when 'mobile' then 'mobileFocalY' when 'tablet' then 'tabletFocalY' else 'focalY' end),'50'::jsonb));
$$;
create function private.editor_crops(asset jsonb) returns jsonb language sql immutable set search_path='' as $$ select jsonb_build_object('desktop',private.editor_crop(asset,'desktop'),'tablet',private.editor_crop(asset,'tablet'),'mobile',private.editor_crop(asset,'mobile')); $$;
create function private.convert_editor_v3(content jsonb) returns jsonb language plpgsql set search_path='' as $$
declare result jsonb; item jsonb; sections jsonb:='[]'; variants jsonb:='[]'; photos jsonb:='[]'; crops jsonb; asset jsonb; base jsonb; ordered text[]; eid text; sid text; main boolean; events jsonb; page_sections jsonb; appearance jsonb;
begin
 if content->>'schemaVersion'='3' or content->>'schemaVersion' is null then return content; end if;
 result:=content-'couple';
 if not result ? 'identity' then result:=result||jsonb_build_object('identity',jsonb_build_object('displayName',btrim(content#>>'{couple,firstName}')||' & '||btrim(content#>>'{couple,secondName}'))); end if;
 if result->>'theme'='ivory' then result:=jsonb_set(result,'{theme}','"classic"'); end if;
 if not result ? 'design' then result:=result||jsonb_build_object('design',case result->>'theme' when 'classic' then '{"paper": "#faf7f1", "surface": "#fffdfb", "ink": "#34322d", "accent": "#6c501b"}'::jsonb when 'botanical' then '{"paper": "#f3f5ed", "surface": "#fcfdf9", "ink": "#293a2d", "accent": "#486039"}'::jsonb when 'editorial' then '{"paper": "#f7f7f4", "surface": "#ffffff", "ink": "#222625", "accent": "#2948a6"}'::jsonb when 'evening' then '{"paper": "#191e30", "surface": "#232a40", "ink": "#f7f1e7", "accent": "#dfc18c"}'::jsonb when 'celebration' then '{"paper": "#fff1e8", "surface": "#fffaf5", "ink": "#33304a", "accent": "#3449a0"}'::jsonb end); end if;
 if not result ? 'appearance' then
  appearance:=case result->>'theme' when 'classic' then '{"icons":false,"decorations":"subtle"}'::jsonb when 'editorial' then '{"icons":false,"decorations":"none"}'::jsonb when 'celebration' then '{"icons":true,"decorations":"full"}'::jsonb else '{"icons":true,"decorations":"subtle"}'::jsonb end;
  result:=result||jsonb_build_object('appearance',appearance);
 end if;
 for item in select value from jsonb_array_elements(coalesce(content->'sections','[]')) loop
  base:=jsonb_build_object('id',item->'id','type',item->'type','title',item->'title','body',coalesce(item->'body','""'::jsonb));
  case item->>'type'
   when 'timeline' then base:=base||jsonb_build_object('eventIds',coalesce((select jsonb_agg(e->'id') from jsonb_array_elements(content->'events') e),'[]'::jsonb));
   when 'contact' then base:=base||jsonb_build_object('contactIds',coalesce((select jsonb_agg(c->'id') from jsonb_array_elements(content->'contacts') c),'[]'::jsonb));
   when 'venue' then base:=base||jsonb_build_object('venueId',item->'venueId');
   when 'gallery' then
    crops:='{}';
    for sid in select jsonb_array_elements_text(coalesce(item->'mediaIds','[]')) loop
     select m into asset from jsonb_array_elements(content->'media') m where m->>'id'=sid;
     crops:=crops||jsonb_build_object(sid,private.editor_crops(asset));
    end loop;
    base:=base||jsonb_build_object('mediaIds',coalesce(item->'mediaIds','[]'),'crops',crops);
   else null;
  end case;
  sections:=sections||jsonb_build_array(base);
 end loop;
 for item in select value from jsonb_array_elements(content->'variants') loop
  main:=item->>'id'=content->>'defaultVariant';page_sections:='[]';events:='[]';
  ordered:=case when main then array(select s->>'id' from jsonb_array_elements(content->'sections') s) else array(select jsonb_array_elements_text(coalesce(item->'sectionIds','[]'))) end;
  for sid in select s->>'id' from jsonb_array_elements(content->'sections') s loop if not sid=any(ordered) then ordered:=array_append(ordered,sid); end if;end loop;
  foreach sid in array ordered loop
   select s into base from jsonb_array_elements(content->'sections') s where s->>'id'=sid;
   page_sections:=page_sections||jsonb_build_array(jsonb_build_object('sectionId',sid,'visible',coalesce((base->>'enabled')::boolean,true) and (main or (case when item ? 'hiddenSectionIds' then not (item->'hiddenSectionIds' ? sid) else item->'sectionIds' ? sid end))));
  end loop;
  ordered:=case when main then array(select e->>'id' from jsonb_array_elements(content->'events') e) else array(select jsonb_array_elements_text(coalesce(item->'eventIds','[]'))) end;
  for eid in select e->>'id' from jsonb_array_elements(content->'events') e loop if not eid=any(ordered) then ordered:=array_append(ordered,eid);end if;end loop;
  foreach eid in array ordered loop
   if main or (case when item ? 'hiddenEventIds' then not (item->'hiddenEventIds' ? eid) else item->'eventIds' ? eid end) then events:=events||jsonb_build_array(eid);end if;
  end loop;
  variants:=variants||jsonb_build_array((item-'sectionIds'-'hiddenSectionIds'-'hiddenEventIds')||jsonb_build_object('dateLabel',coalesce(item->'dateLabel','""'::jsonb),'sections',page_sections,'eventIds',events));
 end loop;
 for asset in select value from jsonb_array_elements(coalesce(content->'media','[]')) loop photos:=photos||jsonb_build_array((asset-array['focalX','focalY','tabletFocalX','tabletFocalY','mobileFocalX','mobileFocalY'])||jsonb_build_object('alt',coalesce(asset->'alt','""'::jsonb),'variants',coalesce(asset->'variants','[]'::jsonb))); end loop;
 crops:='{}';
 foreach sid in array array['desktop','tablet','mobile'] loop
  select m into asset from jsonb_array_elements(content->'media') m where m->>'id'=coalesce(content->'hero'->>(case sid when 'mobile' then 'mobileMediaId' when 'tablet' then 'tabletMediaId' else 'mediaId' end),content->'hero'->>'mediaId');
  crops:=crops||jsonb_build_object(sid,private.editor_crop(asset,sid));
 end loop;
 result:=result||jsonb_build_object('metadata',(content->'metadata')||jsonb_build_object('indexing',coalesce(content#>'{metadata,indexing}','false'::jsonb)),
 'events',coalesce((select jsonb_agg(e||jsonb_build_object('dateLabel',coalesce(e->'dateLabel','""'::jsonb),'url',coalesce(e->'url','""'::jsonb))) from jsonb_array_elements(content->'events') e),'[]'::jsonb),
 'venues',coalesce((select jsonb_agg(v||jsonb_build_object('description',coalesce(v->'description','""'::jsonb),'mapUrl',coalesce(v->'mapUrl','""'::jsonb),'navigationUrl',coalesce(v->'navigationUrl','""'::jsonb))) from jsonb_array_elements(content->'venues') v),'[]'::jsonb));
 return result||jsonb_build_object('schemaVersion',3,'sections',sections,'variants',variants,'media',photos,'hero',(content->'hero')||jsonb_build_object('description',coalesce(content#>'{hero,description}','""'::jsonb),'crops',crops));
end $$;
revoke all on function private.editor_crop(jsonb,text),private.editor_crops(jsonb),private.convert_editor_v3(jsonb) from public,anon,authenticated;
update public.drafts set config=private.convert_editor_v3(config),revision=revision+1,updated_at=now() where config->>'schemaVersion' in ('1','2');
update public.releases set config=private.convert_editor_v3(config) where config->>'schemaVersion' in ('1','2');
update public.draft_snapshots set config=private.convert_editor_v3(config) where config->>'schemaVersion' in ('1','2');
update public.media_assets set manifest=manifest-array['focalX','focalY','tabletFocalX','tabletFocalY','mobileFocalX','mobileFocalY'] where manifest is not null;
drop function private.convert_editor_v3(jsonb);
drop function private.editor_crops(jsonb);
drop function private.editor_crop(jsonb,text);

create or replace function public.replace_invitation_draft(sid uuid, actor uuid, expected_revision integer, content jsonb, snapshot_id uuid default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare s public.sites; d public.drafts; dependencies text;
begin
 select * into s from public.sites where id=sid for update;
 if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
 select * into d from public.drafts where site_id=sid for update;
 if d.revision is distinct from expected_revision then raise exception 'REVISION_CONFLICT'; end if;
 if content->>'id' is distinct from sid::text or content->>'schemaVersion' is distinct from '3' then raise exception 'INVALID_CONFIG'; end if;
 if snapshot_id is not null and not exists(select 1 from public.draft_snapshots where id=snapshot_id and site_id=sid and config=content) then raise exception 'INVALID_SNAPSHOT'; end if;
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
  elsif not exists(select 1 from public.releases where id=source_release and site_id=sid and config=content and asset_paths=assets) then
    raise exception 'INVALID_RELEASE';
  end if;
  if content->>'schemaVersion' <> '3' or nullif(btrim(content#>>'{identity,displayName}'),'') is null then raise exception 'INVALID_PUBLICATION'; end if;
  if s.public_variant_id is not null and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=s.public_variant_id) then raise exception 'VARIANT_MISSING'; end if;
  if exists(select 1 from public.invitations i where i.site_id=sid and not i.revoked and not exists(select 1 from jsonb_array_elements(content->'variants') v where v->>'id'=i.variant_id)) then raise exception 'VARIANT_MISSING'; end if;
  if s.access_mode='code' and s.access_code_hash is null then raise exception 'CODE_REQUIRED'; end if;
  if s.access_mode='email' and exists(select 1 from public.invitations where site_id=sid and not revoked and cardinality(emails)=0) then raise exception 'EMAIL_REQUIRED'; end if;
  insert into public.releases(site_id,config,asset_paths,engine_sha,created_by) values(sid,content,assets,'shared-v1',actor) returning id into rid;
  update public.sites set published_release_id=rid, public_variant_id=coalesce(public_variant_id,content->>'defaultVariant') where id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,case when source_release is null then 'content.published' else 'content.restored' end);
  return rid;
end $$;


drop function public.upgrade_config_v2(jsonb);
create or replace function public.save_rsvp(sid uuid, iid uuid, expected_revision integer, answers jsonb, message text, session_hash text default null, actor uuid default null) returns integer
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
      or not (variant->'eventIds') ? (answer->>'eventId')
      or jsonb_typeof(answer->'attending') is distinct from 'boolean' then raise exception 'INVALID_ANSWERS'; end if;
    insert into public.rsvp_answers(site_id,invitation_id,guest_id,event_id,attending)
      values(sid,iid,(answer->>'guestId')::uuid,answer->>'eventId',(answer->>'attending')::boolean)
      on conflict(invitation_id,guest_id,event_id) do update set attending=excluded.attending,updated_at=now();
  end loop;
  update public.invitations set rsvp_revision=rsvp_revision+1,note=message where id=iid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'rsvp.updated');
  return i.rsvp_revision+1;
end $$;
revoke all on function public.save_rsvp(uuid,uuid,integer,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.save_rsvp(uuid,uuid,integer,jsonb,text,text,uuid) to service_role;
