create or replace function private.migrate_venue_maps(content jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select case
    when jsonb_typeof(content->'venues') = 'array' then
      jsonb_set(
        content,
        '{venues}',
        coalesce(
          (
            select jsonb_agg(
              (v - array['mapUrl', 'navigationUrl']) ||
              jsonb_build_object(
                'showMap',
                coalesce(v->'showMap', 'true'::jsonb)
              )
            )
            from jsonb_array_elements(content->'venues') v
          ),
          '[]'::jsonb
        )
      )
    else content
  end;
$$;
revoke all on function private.migrate_venue_maps(jsonb) from public, anon, authenticated;

alter table public.drafts disable trigger require_active_site;
alter table public.releases disable trigger require_active_site;
alter table public.draft_snapshots disable trigger require_active_site;
alter table public.drafts disable trigger require_available_media;
alter table public.releases disable trigger require_available_media;
alter table public.draft_snapshots disable trigger require_available_media;

update public.drafts
set config = private.migrate_venue_maps(config),
    revision = revision + 1,
    updated_at = now()
where jsonb_typeof(config->'venues') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(config->'venues') v
    where v ? 'mapUrl' or v ? 'navigationUrl' or not (v ? 'showMap')
  );

update public.releases
set config = private.migrate_venue_maps(config)
where jsonb_typeof(config->'venues') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(config->'venues') v
    where v ? 'mapUrl' or v ? 'navigationUrl' or not (v ? 'showMap')
  );

update public.draft_snapshots
set config = private.migrate_venue_maps(config)
where jsonb_typeof(config->'venues') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(config->'venues') v
    where v ? 'mapUrl' or v ? 'navigationUrl' or not (v ? 'showMap')
  );

alter table public.drafts enable trigger require_active_site;
alter table public.releases enable trigger require_active_site;
alter table public.draft_snapshots enable trigger require_active_site;
alter table public.drafts enable trigger require_available_media;
alter table public.releases enable trigger require_available_media;
alter table public.draft_snapshots enable trigger require_available_media;

drop function private.migrate_venue_maps(jsonb);
