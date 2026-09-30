-- Clients receive virtual media URLs only. Storage paths are secret upload capabilities.
drop policy read_own_media on storage.objects;
revoke select on public.media_assets from authenticated;
grant select(id,site_id,status,manifest,created_at) on public.media_assets to authenticated;
alter table public.media_assets add column upload_expires_at timestamptz;
alter table public.media_assets drop constraint media_assets_status_check;
alter table public.media_assets add constraint media_assets_status_check
  check(status in ('pending','processing','ready','error','deleting'));
alter table public.media_assets add constraint processing_upload_expires
  check(status<>'processing' or upload_expires_at is not null);

create function public.reserve_media_upload(sid uuid, actor uuid, aid uuid, original text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  if original !~ ('^'||sid::text||'/'||aid::text||'/[a-f0-9]{64}/original$') then raise exception 'INVALID_MEDIA_PATH'; end if;
  if (select count(*) from public.media_assets where site_id=sid)>=100 then raise exception 'MEDIA_LIBRARY_FULL'; end if;
  if (select count(*) from public.media_assets where site_id=sid and status in ('pending','processing'))>=5 then raise exception 'MEDIA_UPLOAD_LIMIT'; end if;
  insert into public.media_assets(id,site_id,status,original_path,upload_expires_at)
    values(aid,sid,'processing',original,clock_timestamp()+interval '10 minutes');
end $$;

-- INSERT is evaluated by Storage with the user's JWT, never the service-role key.
-- Lock parent before asset: deletion cannot race an authorized object insertion.
create function public.can_upload_media(object_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare parts text[]; sid uuid; aid uuid;
begin
  if object_name !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9]{64}/[1-9][0-9]{0,3}[.]webp$' then return false; end if;
  parts := string_to_array(object_name,'/');
  begin sid := parts[1]::uuid; aid := parts[2]::uuid;
  exception when invalid_text_representation then return false; end;
  if parts[4]::text ~ '^0' or split_part(parts[4],'.',1)::integer>1920 then return false; end if;
  perform 1 from public.sites where id=sid and deleted_at is null for share;
  if not found or not public.can_access_site(sid) then return false; end if;
  perform 1 from public.media_assets where id=aid and site_id=sid and status='processing'
    and upload_expires_at>clock_timestamp()
    and original_path=parts[1]||'/'||parts[2]||'/'||parts[3]||'/original' for share;
  return found;
end $$;
revoke all on function public.can_upload_media(text) from public,anon,authenticated;
grant execute on function public.can_upload_media(text) to authenticated;
grant insert on storage.objects to authenticated;
create policy insert_processing_media on storage.objects for insert to authenticated
  with check(bucket_id='site-media' and public.can_upload_media(name));

create function public.complete_media_upload(sid uuid, aid uuid, actor uuid, content jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare asset public.media_assets; source text; prefix text;
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select * into asset from public.media_assets where id=aid and site_id=sid for update;
  if asset.id is null or asset.status<>'processing' or asset.upload_expires_at<=clock_timestamp() then raise exception 'MEDIA_UNAVAILABLE'; end if;
  if content->>'id' is distinct from aid::text or jsonb_array_length(content->'variants')=0 then raise exception 'INVALID_MEDIA_MANIFEST'; end if;
  prefix := left(asset.original_path,length(asset.original_path)-length('original'));
  for source in select content->>'src' union select v->>'src' from jsonb_array_elements(content->'variants') v loop
    if source !~ ('^/media/'||aid::text||'/[1-9][0-9]{0,3}[.]webp$') or not exists(
      select 1 from storage.objects where bucket_id='site-media' and name=prefix||split_part(source,'/',4)
    ) then raise exception 'MEDIA_UNAVAILABLE'; end if;
  end loop;
  update public.media_assets set status='ready',manifest=content,upload_expires_at=null where id=aid;
end $$;
create function public.fail_media_upload(sid uuid, aid uuid, actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then return; end if;
  update public.media_assets set status='error',upload_expires_at=null where id=aid and site_id=sid and status='processing';
end $$;

-- Terminal deletion must never be undone by a stale worker.
create function private.guard_media_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status='deleting' and new.status<>'deleting' then raise exception 'MEDIA_UNAVAILABLE'; end if;
  if new.status='ready' and old.status<>'ready' and (old.status<>'processing' or old.upload_expires_at<=clock_timestamp()) then raise exception 'MEDIA_UNAVAILABLE'; end if;
  if old.status='ready' and new.status not in ('ready','deleting') then raise exception 'MEDIA_UNAVAILABLE'; end if;
  return new;
end $$;
revoke all on function private.guard_media_transition() from public,anon,authenticated;
create trigger guard_media_transition before update on public.media_assets for each row execute function private.guard_media_transition();

drop function public.begin_media_deletion(uuid,uuid,uuid);
create function public.begin_media_deletion(sid uuid, aid uuid, actor uuid, cleanup_only boolean default false) returns table(path text)
language plpgsql security definer set search_path = '' as $$
declare asset public.media_assets; expired boolean;
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select * into asset from public.media_assets where id=aid and site_id=sid for update;
  if asset.id is null then return; end if;
  expired := (asset.status='pending' and asset.created_at<clock_timestamp()-interval '30 minutes')
    or (asset.status='processing' and asset.upload_expires_at<=clock_timestamp());
  if asset.status not in ('ready','error','deleting') and not expired then raise exception 'MEDIA_NOT_READY'; end if;
  if cleanup_only and asset.status='ready' then raise exception 'MEDIA_NOT_READY'; end if;
  if exists(select 1 from public.drafts where site_id=sid and config->'media' @> jsonb_build_array(jsonb_build_object('id',aid::text))) then raise exception 'MEDIA_IN_DRAFT'; end if;
  if exists(select 1 from public.releases where site_id=sid and config->'media' @> jsonb_build_array(jsonb_build_object('id',aid::text))) then raise exception 'MEDIA_IN_RELEASE'; end if;
  if exists(select 1 from public.draft_snapshots where site_id=sid and config->'media' @> jsonb_build_array(jsonb_build_object('id',aid::text))) then raise exception 'MEDIA_IN_SNAPSHOT'; end if;
  update public.media_assets set status='deleting',upload_expires_at=null where id=aid;
  return query select name from storage.objects where bucket_id='site-media' and name like sid::text||'/'||aid::text||'/%';
end $$;
create or replace function public.finish_media_deletion(sid uuid, aid uuid, actor uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare asset public.media_assets;
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select * into asset from public.media_assets where id=aid and site_id=sid for update;
  if asset.id is null then return; end if;
  if asset.status<>'deleting' then raise exception 'MEDIA_UNAVAILABLE'; end if;
  if exists(select 1 from storage.objects where bucket_id='site-media' and name like sid::text||'/'||aid::text||'/%') then raise exception 'MEDIA_REMAIN'; end if;
  delete from public.media_assets where id=aid and site_id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'media.deleted');
end $$;
create function public.media_cleanup_candidates(sid uuid, actor uuid) returns table(id uuid)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  return query select m.id from public.media_assets m where site_id=sid and (
    status in ('error','deleting') or (status='pending' and created_at<clock_timestamp()-interval '30 minutes')
    or (status='processing' and upload_expires_at<=clock_timestamp())
  ) order by created_at limit 100;
end $$;

-- All application writes acquire the parent before any child record.
create or replace function public.save_site_draft(sid uuid, actor uuid, expected_revision integer, content jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_revision integer;
begin
  perform 1 from public.sites where id=sid for update;
  if not public.can_access_site(sid,actor) then raise exception 'FORBIDDEN'; end if;
  select revision into current_revision from public.drafts where site_id=sid for update;
  if current_revision is null or current_revision<>expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  update public.drafts set config=content,revision=revision+1,updated_at=now() where site_id=sid;
  insert into public.audit_events(site_id,actor_id,action) values(sid,actor,'draft.saved');
  return current_revision+1;
end $$;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid
    where n.nspname='public' and p.proname in ('reserve_media_upload','complete_media_upload','fail_media_upload','begin_media_deletion','finish_media_deletion','media_cleanup_candidates','save_site_draft') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
