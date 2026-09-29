alter table public.media_assets drop constraint media_assets_status_check;
alter table public.media_assets add constraint media_assets_status_check
  check (status in ('pending','ready','error','deleting'));

-- Serialize reference writes and deletion reservations on the parent project.
create function private.guard_available_media() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=new.site_id and deleted_at is null for share;
  if not found then raise exception 'SITE_DELETED'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(new.config->'media','[]'::jsonb)) item
    where not exists(select 1 from public.media_assets m
      where m.site_id=new.site_id and m.id::text=item->>'id' and m.status='ready')
  ) then raise exception 'MEDIA_UNAVAILABLE'; end if;
  return new;
end $$;
revoke all on function private.guard_available_media() from public,anon,authenticated;
do $$ declare t text; begin
  foreach t in array array['drafts','releases','draft_snapshots'] loop
    execute format('create trigger require_available_media before insert or update of config on public.%I for each row execute function private.guard_available_media()',t);
  end loop;
end $$;

create function public.begin_media_deletion(sid uuid, aid uuid, actor uuid) returns table(path text)
language plpgsql security definer set search_path = '' as $$
declare asset public.media_assets;
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select * into asset from public.media_assets where id=aid and site_id=sid for update;
  if asset.id is null then return; end if;
  if asset.status not in ('ready','deleting') then raise exception 'MEDIA_NOT_READY'; end if;
  if exists(select 1 from public.drafts where site_id=sid and config->'media' @> jsonb_build_array(jsonb_build_object('id',aid::text))) then raise exception 'MEDIA_IN_DRAFT'; end if;
  if exists(select 1 from public.releases where site_id=sid and config->'media' @> jsonb_build_array(jsonb_build_object('id',aid::text))) then raise exception 'MEDIA_IN_RELEASE'; end if;
  if exists(select 1 from public.draft_snapshots where site_id=sid and config->'media' @> jsonb_build_array(jsonb_build_object('id',aid::text))) then raise exception 'MEDIA_IN_SNAPSHOT'; end if;
  update public.media_assets set status='deleting' where id=aid;
  return query select name from storage.objects where bucket_id='site-media' and name like sid::text||'/'||aid::text||'/%';
end $$;
create function public.finish_media_deletion(sid uuid, aid uuid, actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  if exists(select 1 from storage.objects where bucket_id='site-media' and name like sid::text||'/'||aid::text||'/%') then raise exception 'MEDIA_REMAIN'; end if;
  delete from public.media_assets where id=aid and site_id=sid and status='deleting';
  if found then
    insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'media.deleted');
  end if;
end $$;
revoke all on function public.begin_media_deletion(uuid,uuid,uuid),public.finish_media_deletion(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.begin_media_deletion(uuid,uuid,uuid),public.finish_media_deletion(uuid,uuid,uuid) to service_role;
