import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../packages/domain/src/demo.ts";

test("soft delete hides all tenant data, disables writes, and purges only expired projects after Storage cleanup", async () => {
  const db = new PGlite();
  const owner = "10000000-0000-4000-8000-000000000001",
    other = "10000000-0000-4000-8000-000000000002";
  const expired = "20000000-0000-4000-8000-000000000001",
    recent = "20000000-0000-4000-8000-000000000002",
    active = "20000000-0000-4000-8000-000000000003",
    boundary = "20000000-0000-4000-8000-000000000004";
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
      grant usage on schema auth to authenticated,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant usage on schema storage to authenticated; grant select on storage.objects to authenticated;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      create schema cron; create table cron.job(jobid bigint generated always as identity,jobname text unique,schedule text,command text);
      create function cron.schedule(n text,s text,c text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values(n,s,c) on conflict(jobname) do update set schedule=excluded.schedule,command=excluded.command returning jobid $$;
      create schema net; create table net.requests(id bigint generated always as identity,url text,headers jsonb,body jsonb);
      create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language sql as $$ insert into net.requests(url,headers,body) values(url,headers,body) returning id $$;
    `);
    for (const file of [
      "202609200001_platform.sql",
      "202609210001_guest_platform.sql",
      "202609230001_invitation_templates.sql",
      "20260929060915_site_soft_delete.sql",
      "20260929060918_monthly_site_purge.sql",
      "20260929063114_isolate_purge_extension.sql",
    ]) {
      await db.exec(
        (await readFile(`supabase/migrations/${file}`, "utf8")).replace(
          /create extension if not exists \w+;/g,
          "",
        ),
      );
    }
    await db.exec(
      `insert into auth.users values('${owner}',now()),('${other}',now()); set request.jwt.claim.role='service_role'`,
    );
    const config = createDemo();
    for (const id of [expired, recent, active, boundary])
      await db.query("select public.create_owned_site($1,'Test',$2,$3,$4)", [
        owner,
        id,
        id,
        JSON.stringify({ ...config, id }),
      ]);
    await db.query(
      "insert into public.site_members(site_id,user_id) values($1,$2)",
      [recent, other],
    );
    await assert.rejects(
      db.query("select public.soft_delete_site($1,$2)", [recent, other]),
      /FORBIDDEN/,
    );
    const { rows: release } = await db.query<{ publish_content: string }>(
      "select public.publish_content($1,$2,1,$3,'{}')",
      [recent, owner, JSON.stringify({ ...config, id: recent })],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('site-media',$1),('site-media',$2)",
      [`${recent}/photo.png`, `${expired}/orphan.png`],
    );
    const { rows: removed } = await db.query<{ soft_delete_site: string }>(
      "select public.soft_delete_site($1,$2)",
      [recent, owner],
    );
    assert.deepEqual(
      (
        await db.query<{ soft_delete_site: string }>(
          "select public.soft_delete_site($1,$2)",
          [recent, owner],
        )
      ).rows[0].soft_delete_site,
      removed[0].soft_delete_site,
    );
    const saved = await db.query<{
      deleted_at: string;
      published_release_id: null;
      access_version: number;
    }>(
      "select deleted_at,published_release_id,access_version from public.sites where id=$1",
      [recent],
    );
    assert.ok(saved.rows[0].deleted_at);
    assert.equal(saved.rows[0].published_release_id, null);
    assert.equal(saved.rows[0].access_version, 2);
    assert.equal(
      (
        await db.query("select id from public.releases where id=$1", [
          release[0].publish_content,
        ])
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "update public.drafts set revision=revision+1 where site_id=$1",
        [recent],
      ),
      /SITE_DELETED/,
    );
    await assert.rejects(
      db.query("select public.publish_content($1,$2,1,$3,'{}')", [
        recent,
        owner,
        JSON.stringify(config),
      ]),
      /FORBIDDEN/,
    );
    await db.exec(
      `set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${owner}'`,
    );
    assert.equal(
      (await db.query("select id from public.sites where id=$1", [recent])).rows
        .length,
      0,
    );
    for (const table of [
      "drafts",
      "releases",
      "media_assets",
      "invitations",
      "rsvp_answers",
      "draft_snapshots",
    ])
      assert.equal(
        (
          await db.query(
            `select site_id from public.${table} where site_id=$1`,
            [recent],
          )
        ).rows.length,
        0,
      );
    assert.equal(
      (
        await db.query("select name from storage.objects where name=$1", [
          `${recent}/photo.png`,
        ])
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.claim_site_purge($1,'fake')", [recent]),
      /permission denied/,
    );
    await db.exec("reset role; set request.jwt.claim.role='service_role'");
    await db.query("select public.publish_content($1,$2,1,$3,'{}')", [
      expired,
      owner,
      JSON.stringify({ ...config, id: expired }),
    ]);
    await db.query(
      `insert into public.invitations(id,site_id,label,variant_id,token_hash,guests) values($1,$1,'Family','default','purge-test','[]');
      `,
      [expired],
    );
    await db.query(
      "insert into public.rsvp_answers(site_id,invitation_id,guest_id,event_id,attending) values($1,$1,$2,'event',true)",
      [expired, owner],
    );
    await db.query(
      "insert into public.guest_sessions(token_hash,site_id,invitation_id,access_version,expires_at) values('purge-session',$1,$1,1,now()+interval '1 day')",
      [expired],
    );
    await db.query(
      "insert into public.media_assets(site_id,original_path) values($1,$2)",
      [expired, `${expired}/orphan.png`],
    );
    await db.query(
      "insert into public.deployments(site_id,release_id,status) select id,published_release_id,'ready' from public.sites where id=$1",
      [expired],
    );
    await db.exec(
      `begin; update public.sites set deleted_at=now()-interval '2 months',published_release_id=null where id='${expired}'; update public.sites set deleted_at=now()-interval '1 month' where id='${boundary}'; select private.dispatch_site_purges('https://test.supabase.co/functions/v1/purge-sites'); commit;`,
    );
    const requests = await db.query<{
      body: { siteId: string; token: string };
    }>("select body from net.requests");
    assert.equal(requests.rows.length, 1);
    assert.equal(requests.rows[0].body.siteId, expired);
    const token = requests.rows[0].body.token;
    assert.equal(
      (
        await db.query<{ claim_site_purge: boolean }>(
          "select public.claim_site_purge($1,$2)",
          [active, token],
        )
      ).rows[0].claim_site_purge,
      false,
    );
    assert.equal(
      (
        await db.query<{ claim_site_purge: boolean }>(
          "select public.claim_site_purge($1,'bad')",
          [expired],
        )
      ).rows[0].claim_site_purge,
      false,
    );
    assert.equal(
      (
        await db.query<{ claim_site_purge: boolean }>(
          "select public.claim_site_purge($1,$2)",
          [expired, token],
        )
      ).rows[0].claim_site_purge,
      true,
    );
    assert.equal(
      (
        await db.query<{ claim_site_purge: boolean }>(
          "select public.claim_site_purge($1,$2)",
          [expired, token],
        )
      ).rows[0].claim_site_purge,
      false,
    );
    assert.deepEqual(
      (
        await db.query("select * from public.site_purge_paths($1,$2)", [
          expired,
          token,
        ])
      ).rows,
      [{ path: `${expired}/orphan.png` }],
    );
    await assert.rejects(
      db.query("select public.finish_site_purge($1,$2)", [expired, token]),
      /MEDIA_REMAIN/,
    );
    // Test double for successful Storage API removal, not application SQL.
    await db.query("delete from storage.objects where name=$1", [
      `${expired}/orphan.png`,
    ]);
    await db.query("select public.finish_site_purge($1,$2)", [expired, token]);
    for (const table of [
      "sites",
      "drafts",
      "site_members",
      "audit_events",
      "releases",
      "deployments",
      "invitations",
      "rsvp_answers",
      "guest_sessions",
      "media_assets",
    ])
      assert.equal(
        (
          await db.query(
            `select 1 from public.${table} where ${table === "sites" ? "id" : "site_id"}=$1`,
            [expired],
          )
        ).rows.length,
        0,
      );
    assert.equal(
      (
        await db.query("select id from public.sites where id in ($1,$2)", [
          active,
          recent,
        ])
      ).rows.length,
      2,
    );
    await db.exec(
      "select private.configure_site_purge('https://test.supabase.co'); select private.configure_site_purge('https://test.supabase.co')",
    );
    assert.deepEqual(
      (await db.query("select jobname,schedule from cron.job")).rows,
      [{ jobname: "purge-deleted-sites-monthly", schedule: "0 3 1 * *" }],
    );
  } finally {
    await db.close();
  }
});
