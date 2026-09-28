import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../packages/domain/src/demo.ts";

test("migration defines RLS isolation plus revision, immutable release and publication lock procedures", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
      grant usage on schema auth to authenticated,service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      grant usage on schema storage to authenticated; grant select on storage.objects to authenticated;
    `);
    const sql = await fs.readFile(
      "supabase/migrations/202609200001_platform.sql",
      "utf8",
    );
    await db.exec(sql.replace("create extension if not exists pgcrypto;", ""));
    const a = "10000000-0000-4000-8000-000000000001",
      b = "10000000-0000-4000-8000-000000000002";
    const siteA = "20000000-0000-4000-8000-000000000001",
      siteB = "20000000-0000-4000-8000-000000000002";
    const configA = { ...createDemo(), id: siteA },
      configB = { ...createDemo("demo-botanical"), id: siteB };
    await db.query("insert into auth.users values ($1),($2)", [a, b]);
    await db.query(
      "insert into public.sites(id,name) values ($1,'A'),($2,'B')",
      [siteA, siteB],
    );
    await db.query("insert into public.site_members values ($1,$2),($3,$4)", [
      siteA,
      a,
      siteB,
      b,
    ]);
    await db.query(
      "insert into public.drafts(site_id,config) values ($1,$2),($3,$4)",
      [siteA, JSON.stringify(configA), siteB, JSON.stringify(configB)],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values ('site-media',$1),('site-media',$2)",
      [`${siteA}/image/a.webp`, `${siteB}/image/b.webp`],
    );
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${a}'`);
    const identity = await db.query<{
      current_user: string;
      uid: string | null;
      allowed: boolean;
    }>(
      "select current_user, auth.uid() as uid, public.can_access_site($1) as allowed",
      [siteA],
    );
    assert.deepEqual(identity.rows[0], {
      current_user: "authenticated",
      uid: a,
      allowed: true,
    });
    const impersonation = await db.query<{ allowed: boolean }>(
      "select public.can_access_site($1,$2) as allowed",
      [siteB, b],
    );
    assert.equal(impersonation.rows[0]?.allowed, false);
    const policies = await db.query<{ tablename: string; qual: string }>(
      "select tablename, qual from pg_policies where schemaname = $1",
      ["public"],
    );
    assert.equal(
      policies.rows.filter(
        (p) => p.tablename === "sites" && p.qual.includes("can_access_site"),
      ).length,
      1,
    );
    assert.equal(
      policies.rows.filter(
        (p) => p.tablename === "drafts" && p.qual.includes("can_access_site"),
      ).length,
      1,
    );
    const storagePolicies = await db.query<{ count: number }>(
      "select count(*)::int as count from pg_policies where schemaname='storage' and tablename='objects'",
    );
    assert.equal(storagePolicies.rows[0]!.count, 1);
    await assert.rejects(
      db.query("insert into public.platform_admins values($1)", [a]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.save_site_draft($1,$2,1,$3)", [
        siteA,
        a,
        JSON.stringify(configA),
      ]),
      /permission denied/,
    );
    await db.exec(
      "reset role; set role service_role; set request.jwt.claim.role = 'service_role'",
    );
    await assert.rejects(
      db.query("select public.save_site_draft($1,$2,1,$3)", [
        siteB,
        a,
        JSON.stringify(configB),
      ]),
      /FORBIDDEN/,
    );
    await db.query("select public.save_site_draft($1,$2,1,$3)", [
      siteA,
      a,
      JSON.stringify(configA),
    ]);
    await assert.rejects(
      db.query("select public.save_site_draft($1,$2,1,$3)", [
        siteA,
        a,
        JSON.stringify(configA),
      ]),
      /REVISION_CONFLICT/,
    );
    const args = [
      siteA,
      a,
      2,
      JSON.stringify(configA),
      "{}",
      "a".repeat(40),
      "b".repeat(64),
    ];
    await db.query(
      "select public.begin_publication($1,$2,$3,$4,$5,$6,$7)",
      args,
    );
    await assert.rejects(
      db.query("select public.begin_publication($1,$2,$3,$4,$5,$6,$7)", args),
      /DEPLOYMENT_ACTIVE/,
    );
    const changed = structuredClone(configA);
    changed.identity.displayName = "Changed";
    await db.query("select public.save_site_draft($1,$2,2,$3)", [
      siteA,
      a,
      JSON.stringify(changed),
    ]);
    const release = await db.query<{ config: typeof configA }>(
      "select config from public.releases where site_id=$1",
      [siteA],
    );
    assert.equal(release.rows[0].config.identity.displayName, "Anna & Jan");
    await db.exec(
      `reset role; set role authenticated; set request.jwt.claim.sub = '${b}'`,
    );
    await assert.rejects(
      db.query("select public.save_site_draft($1,$2,1,$3)", [
        siteB,
        b,
        JSON.stringify(configB),
      ]),
      /permission denied/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select * from public.drafts"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
