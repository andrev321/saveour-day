create extension if not exists pg_cron;
create extension if not exists pg_net;

create function private.dispatch_site_purges(endpoint text) returns integer
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare s record; capability text; dispatched integer := 0;
begin
  if endpoint !~ '^https://[a-z0-9]+[.]supabase[.]co/functions/v1/purge-sites$' then raise exception 'INVALID_ENDPOINT'; end if;
  if not pg_try_advisory_xact_lock(78002901) then return 0; end if;
  for s in select id from public.sites where deleted_at < now()-interval '1 month' order by deleted_at for update skip locked loop
    if exists(select 1 from private.site_purge_jobs where site_id=s.id and status in ('queued','running') and expires_at>now()) then continue; end if;
    capability := replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
    insert into private.site_purge_jobs(site_id,token_hash,expires_at,status)
      values(s.id,sha256(convert_to(capability,'UTF8')),now()+interval '6 hours','queued')
    on conflict(site_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,status='queued',
      requested_at=now(),started_at=null,last_error=null,attempts=private.site_purge_jobs.attempts+1;
    perform net.http_post(url:=endpoint, headers:='{"Content-Type":"application/json"}'::jsonb,
      body:=jsonb_build_object('siteId',s.id,'token',capability),timeout_milliseconds:=120000);
    dispatched := dispatched+1;
  end loop;
  return dispatched;
end $$;
revoke all on function private.dispatch_site_purges(text) from public,anon,authenticated,service_role;

-- Configure once after deploying the worker. This stores only a public URL,
-- never a service-role key. Repeat configuration updates the same named job.
create function private.configure_site_purge(project_url text) returns bigint
language plpgsql security definer set search_path = '' as $$
begin
  if project_url !~ '^https://[a-z0-9]+[.]supabase[.]co$' then raise exception 'INVALID_ENDPOINT'; end if;
  return cron.schedule('purge-deleted-sites-monthly','0 3 1 * *',
    format('select private.dispatch_site_purges(%L)',project_url||'/functions/v1/purge-sites'));
end $$;
revoke all on function private.configure_site_purge(text) from public,anon,authenticated,service_role;
