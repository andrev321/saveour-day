import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTemplate,
  templateIds,
  templateCatalog,
} from "../packages/domain/src/templates.ts";
import {
  invitationLocales,
  siteConfigSchema,
  publishedConfigSchema,
} from "../packages/domain/src/index.ts";
import { createDemo } from "../packages/domain/src/demo.ts";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

test("all starting templates are independent, localized and structurally valid", () => {
  for (const locale of invitationLocales)
    for (const template of templateIds) {
      const config = createTemplate(template, "example", locale);
      assert.equal(config.schemaVersion, 3);
      assert.ok(siteConfigSchema.safeParse(config).success);
      assert.equal(
        templateCatalog(locale).find((t) => t.id === template)?.locales.length,
        3,
      );
      assert.equal(
        publishedConfigSchema.safeParse(config).success,
        template !== "blank",
      );
      const next = createTemplate(template, "example", locale);
      for (const event of next.events)
        assert.ok(!config.events.some((e) => e.id === event.id));
      if (template === "blank") {
        assert.equal(config.identity.displayName, "");
        for (const field of [
          "events",
          "sections",
          "venues",
          "contacts",
          "media",
        ] as const)
          assert.equal(config[field].length, 0);
        assert.equal(config.variants.length, 1);
      }
    }
  for (const schemaVersion of [1, 2])
    assert.equal(
      siteConfigSchema.safeParse({ ...createDemo(), schemaVersion }).success,
      false,
    );
});

test("schema migration and template reset preserve releases, RSVP and tenant boundaries", async () => {
  const db = new PGlite();
  const actor = "10000000-0000-4000-8000-000000000001",
    other = "10000000-0000-4000-8000-000000000002",
    sid = "20000000-0000-4000-8000-000000000001",
    iid = "30000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 alter default privileges in schema public grant all on tables to anon,authenticated;
 create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;
 grant usage on schema auth to authenticated,service_role;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;`);
    for (const file of [
      "202609200001_platform.sql",
      "202609210001_guest_platform.sql",
    ])
      await db.exec(
        (await readFile("supabase/migrations/" + file, "utf8")).replace(
          "create extension if not exists pgcrypto;",
          "",
        ),
      );
    await db.exec("set request.jwt.claim.role='service_role'");
    await db.query("insert into auth.users values($1,now()),($2,now())", [
      actor,
      other,
    ]);
    const old = { ...createDemo(sid), schemaVersion: 2 };
    const { identity, ...rest } = old;
    void identity;
    const legacy = {
      ...rest,
      schemaVersion: 1,
      couple: { firstName: "Anna", secondName: "Jan" },
    };
    await db.query(
      "select public.create_owned_site($1,'Example','example',$2,$3)",
      [actor, sid, JSON.stringify(legacy)],
    );
    const release = (
      await db.query<{ id: string }>(
        "select public.publish_content($1,$2,1,$3,'{}') id",
        [sid, actor, JSON.stringify(legacy)],
      )
    ).rows[0].id;
    await db.exec(
      await readFile(
        "supabase/migrations/202609230001_invitation_templates.sql",
        "utf8",
      ),
    );
    assert.deepEqual(
      (
        await db.query<{ config: unknown }>(
          "select config from public.drafts where site_id=$1",
          [sid],
        )
      ).rows[0].config,
      old,
    );
    assert.deepEqual(
      (
        await db.query<{ config: unknown }>(
          "select config from public.releases where id=$1",
          [release],
        )
      ).rows[0].config,
      legacy,
    );
    await db.exec(
      await readFile(
        "supabase/migrations/" +
          (await readdir("supabase/migrations")).find((f) =>
            f.endsWith("_contextual_editor_v3.sql"),
          ),
        "utf8",
      ),
    );
    Object.assign(
      old,
      (
        await db.query<{ config: unknown }>(
          "select config from public.drafts where site_id=$1",
          [sid],
        )
      ).rows[0].config,
    );
    await db.query("select public.publish_content($1,$2,0,$3,'{}',$4)", [
      sid,
      actor,
      JSON.stringify(old),
      release,
    ]);
    await assert.rejects(
      db.query("select public.publish_content($1,$2,0,$3,'{}',$4)", [
        sid,
        actor,
        JSON.stringify({ ...old, identity: { displayName: "Forged" } }),
        release,
      ]),
      /INVALID_RELEASE/,
    );
    const guest = "40000000-0000-4000-8000-000000000001";
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      actor,
      iid,
      JSON.stringify({
        label: "Family",
        variantId: old.defaultVariant,
        tokenHash: "secret",
        emails: [],
        guests: [{ id: guest, name: "Guest" }],
      }),
    ]);
    await db.query("select public.save_rsvp($1,$2,0,$3,'note',null,$4)", [
      sid,
      iid,
      JSON.stringify([
        { guestId: guest, eventId: old.events[0].id, attending: true },
      ]),
      actor,
    ]);
    const currentRelease = (
      await db.query<{ id: string }>(
        "select published_release_id id from public.sites where id=$1",
        [sid],
      )
    ).rows[0].id;
    const fresh = createTemplate(
      "birthday",
      sid,
      "pl-PL",
      undefined,
      old.defaultVariant,
    );
    const reset = (
      revision: number,
      config: unknown = fresh,
      user = actor,
      snapshot: string | null = null,
    ) =>
      db.query<{ revision: number }>(
        "select public.replace_invitation_draft($1,$2,$3,$4,$5) revision",
        [sid, user, revision, JSON.stringify(config), snapshot],
      );
    await assert.rejects(reset(3, fresh, other), /FORBIDDEN/);
    assert.equal((await reset(3)).rows[0].revision, 4);
    await assert.rejects(reset(2), /REVISION_CONFLICT/);
    assert.equal(
      (
        await db.query<{ id: string }>(
          "select published_release_id id from public.sites where id=$1",
          [sid],
        )
      ).rows[0].id,
      currentRelease,
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.rsvp_answers",
        )
      ).rows[0].n,
      1,
    );
    const snapshot = (
      await db.query<{ id: string }>(
        "select id from public.draft_snapshots where site_id=$1 and revision=3",
        [sid],
      )
    ).rows[0].id;
    assert.equal((await reset(4, old, actor, snapshot)).rows[0].revision, 5);
    await assert.rejects(reset(5, fresh, actor, snapshot), /INVALID_SNAPSHOT/);
    const missing = {
      ...fresh,
      variants: fresh.variants.map((v) => ({ ...v, id: "new-main" })),
      defaultVariant: "new-main",
    };
    await assert.rejects(reset(5, missing), /VARIANT_IN_USE/);
    const blank = createTemplate(
      "blank",
      sid,
      "pl-PL",
      undefined,
      old.defaultVariant,
    );
    await reset(5, blank);
    await assert.rejects(
      db.query("select public.publish_content($1,$2,6,$3,'{}')", [
        sid,
        actor,
        JSON.stringify(blank),
      ]),
      /INVALID_PUBLICATION/,
    );
    await reset(6, fresh);
    await db.query("select public.publish_content($1,$2,7,$3,'{}')", [
      sid,
      actor,
      JSON.stringify(fresh),
    ]);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.rsvp_answers where event_id=$1",
          [old.events[0].id],
        )
      ).rows[0].n,
      1,
    );
    await db.exec(
      `set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${other}'`,
    );
    assert.equal(
      (await db.query("select * from public.draft_snapshots")).rows.length,
      0,
    );
    await assert.rejects(reset(6), /permission denied/);
    await db.exec(`set request.jwt.claim.sub='${actor}'`);
    assert.ok(
      (await db.query("select * from public.draft_snapshots")).rows.length > 0,
    );
  } finally {
    await db.close();
  }
});
