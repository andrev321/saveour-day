-- Only immutable, public illustrations shipped with the app may bypass Storage.
-- Keep these manifests and files available for historical releases.
create or replace function private.is_sample_media(item jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(item - 'alt' in ('{"id":"example-garden-v1","src":"/media/examples/garden-v1-1536.webp","width":1536,"height":1024,"variants":[{"src":"/media/examples/garden-v1-640.webp","width":640},{"src":"/media/examples/garden-v1-1280.webp","width":1280},{"src":"/media/examples/garden-v1-1536.webp","width":1536}]}'::jsonb,
    '{"id":"example-gathering-v1","src":"/media/examples/gathering-v1-1536.webp","width":1536,"height":1024,"variants":[{"src":"/media/examples/gathering-v1-640.webp","width":640},{"src":"/media/examples/gathering-v1-1280.webp","width":1280},{"src":"/media/examples/gathering-v1-1536.webp","width":1536}]}'::jsonb,
    '{"id":"example-evening-v1","src":"/media/examples/evening-v1-1536.webp","width":1536,"height":1024,"variants":[{"src":"/media/examples/evening-v1-640.webp","width":640},{"src":"/media/examples/evening-v1-1280.webp","width":1280},{"src":"/media/examples/evening-v1-1536.webp","width":1536}]}'::jsonb), false)
$$;
revoke all on function private.is_sample_media(jsonb) from public, anon, authenticated;

create or replace function private.guard_available_media() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.sites where id=new.site_id and deleted_at is null for share;
  if not found then raise exception 'SITE_DELETED'; end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(new.config->'media','[]'::jsonb)) item
    where not private.is_sample_media(item)
      and not exists(select 1 from public.media_assets m
        where m.site_id=new.site_id and m.id::text=item->>'id' and m.status='ready')
  ) then raise exception 'MEDIA_UNAVAILABLE'; end if;
  return new;
end $$;
revoke all on function private.guard_available_media() from public, anon, authenticated;
