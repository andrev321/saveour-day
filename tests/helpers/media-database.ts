import { readdir, readFile } from "node:fs/promises";

export const owner = "10000000-0000-4000-8000-000000000001";
export const other = "10000000-0000-4000-8000-000000000002";
export const sid = "20000000-0000-4000-8000-000000000001";
export const aid = "50000000-0000-4000-8000-000000000001";
export const prefix = `${sid}/${aid}/${"a".repeat(64)}`;
export const schemaSql = `
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
  grant usage on schema auth to authenticated,service_role;
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated,service_role;
  grant select,insert,update,delete on storage.objects to authenticated,service_role;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
  create schema cron; create table cron.job(jobid bigint generated always as identity,jobname text unique,schedule text,command text);
  create function cron.schedule(n text,s text,c text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values(n,s,c) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning jobid $$;
  create schema net; create table net.requests(id bigint generated always as identity,url text,headers jsonb,body jsonb);
  create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language sql as $$ insert into net.requests(url,headers,body) values(url,headers,body) returning id $$;
`;
export async function setupMediaDatabase(
  exec: (sql: string) => Promise<unknown>,
) {
  await exec(schemaSql);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await exec(
      (await readFile(`supabase/migrations/${file}`, "utf8")).replace(
        /create extension if not exists \w+;/g,
        "",
      ),
    );
  await exec(
    `insert into auth.users values('${owner}',now()),('${other}',now()); set request.jwt.claim.role='service_role'`,
  );
}
export const authenticate = (user = owner) =>
  `set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${user}'`;
export const service = "reset role; set request.jwt.claim.role='service_role'";
export const manifest = {
  id: aid,
  src: `/media/${aid}/640.webp`,
  width: 640,
  height: 400,
  variants: [{ src: `/media/${aid}/640.webp`, width: 640 }],
};
