import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../packages/domain/src/demo.ts";
import { schemaSql } from "./helpers/media-database.ts";

test("publication, RLS, guest sessions and RSVP enforce tenant and invitation boundaries", async () => {
  const db = new PGlite();
  const actor = "10000000-0000-4000-8000-000000000001",
    other = "10000000-0000-4000-8000-000000000002";
  const sid = "20000000-0000-4000-8000-000000000001",
    second = "20000000-0000-4000-8000-000000000002";
  const iid = "30000000-0000-4000-8000-000000000001",
    guest = "40000000-0000-4000-8000-000000000001";
  try {
    await db.exec(schemaSql);
    await db.exec(
      "alter default privileges in schema public grant all on tables to anon,authenticated",
    );
    for (const file of (await fs.readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      await db.exec(
        (await fs.readFile(`supabase/migrations/${file}`, "utf8")).replace(
          /create extension if not exists \w+;/g,
          "",
        ),
      );
    }
    await db.query("insert into auth.users values($1,now()),($2,now())", [
      actor,
      other,
    ]);
    await db.exec("set request.jwt.claim.role = 'service_role'");
    const config = createDemo();
    config.id = sid;
    const variant = { ...config.variants[0], id: "limited", slug: "limited" };
    config.variants.push(variant);
    variant.eventIds = config.events.slice(0, 1).map((e) => e.id);
    await db.query<Record<string, unknown>>(
      "select public.create_owned_site($1,'First','first',$2,$3)",
      [actor, sid, JSON.stringify(config)],
    );
    await db.query<Record<string, unknown>>(
      "select public.create_owned_site($1,'Second','second',$2,$3)",
      [other, second, JSON.stringify({ ...config, id: second })],
    );
    await assert.rejects(
      db.query<Record<string, unknown>>(
        "select public.publish_content($1,$2,1,$3,'{}')",
        [sid, other, JSON.stringify(config)],
      ),
      /FORBIDDEN/,
    );
    await assert.rejects(
      db.query<Record<string, unknown>>(
        "select public.publish_content($1,$2,2,$3,'{}')",
        [sid, actor, JSON.stringify(config)],
      ),
      /REVISION_CONFLICT/,
    );
    const publication = await db.query<{ id: string }>(
      "select public.publish_content($1,$2,1,$3,'{}') id",
      [sid, actor, JSON.stringify(config)],
    );
    const release = publication.rows[0].id;
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select published_release_id from public.sites where id=$1",
          [sid],
        )
      ).rows[0].published_release_id,
      release,
    );
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select * from public.deployments",
        )
      ).rows.length,
      0,
    );
    await db.query<Record<string, unknown>>(
      "select public.manage_invitation($1,$2,'create',$3,$4)",
      [
        sid,
        actor,
        iid,
        JSON.stringify({
          groupName: "Family",
          variantId: variant.id,
          tokenHash: "token1",
          guests: [{ id: guest, kind: "named", name: "Guest" }],
        }),
      ],
    );
    await db.query(
      "insert into public.guest_sessions values('session',$1,$2,1,1,null,now()+interval '1 day')",
      [sid, iid],
    );
    const answer = [
      { guestId: guest, eventId: config.events[0].id, attending: true },
    ];
    const save = (
      revision: number,
      values: unknown = answer,
      token = "session",
      admin: string | null = null,
    ) =>
      db.query<Record<string, unknown>>(
        "select public.save_guest_rsvp($1,$2,$3,$4,'note','{}'::jsonb,'[]'::jsonb,$5,$6) revision",
        [sid, iid, revision, JSON.stringify(values), token, admin],
      );
    assert.equal((await save(0)).rows[0].revision, 1);
    await assert.rejects(save(0), /REVISION_CONFLICT/);
    await assert.rejects(
      save(1, [{ ...answer[0], guestId: other }]),
      /INVALID_ANSWERS/,
    );
    await assert.rejects(
      save(1, [{ ...answer[0], eventId: config.events[1].id }]),
      /INVALID_ANSWERS/,
    );
    await assert.rejects(save(1, [answer[0], answer[0]]), /INVALID_ANSWERS/);
    await assert.rejects(save(1, answer, "missing"), /FORBIDDEN/);
    await assert.rejects(save(1, answer, "missing", other), /FORBIDDEN/);
    await db.query<Record<string, unknown>>(
      "select public.configure_access($1,$2,'code','salt:hash',$3,null,1)",
      [sid, actor, config.defaultVariant],
    );
    await assert.rejects(save(1), /FORBIDDEN/);
    await db.query(
      "update public.guest_sessions set access_version=2 where token_hash='session'",
    );
    assert.equal((await save(1)).rows[0].revision, 2);
    await assert.rejects(
      db.query<Record<string, unknown>>(
        "select public.configure_access($1,$2,'email',null,$3,now()-interval '1 minute',2)",
        [sid, actor, config.defaultVariant],
      ),
      /INVALID_MODE/,
    );
    await db.query<Record<string, unknown>>(
      "select public.configure_access($1,$2,'code','hash1',$3,now()-interval '1 minute',2)",
      [sid, actor, config.defaultVariant],
    );
    await db.query(
      "update public.guest_sessions set access_version=3 where token_hash='session'",
    );
    await assert.rejects(save(2), /RSVP_CLOSED/);
    assert.equal((await save(2, answer, "missing", actor)).rows[0].revision, 3);
    await db.query<Record<string, unknown>>(
      "select public.manage_invitation($1,$2,'revoke',$3,'{}')",
      [sid, actor, iid],
    );
    await assert.rejects(save(3), /FORBIDDEN/);
    await db.query<Record<string, unknown>>(
      "select public.manage_invitation($1,$2,'rotate',$3,'{\"tokenHash\":\"token2\"}')",
      [sid, actor, iid],
    );
    await db.query("select public.manage_invitation($1,$2,'update',$3,$4)", [
      sid,
      actor,
      iid,
      JSON.stringify({
        groupName: "Updated family",
        variantId: variant.id,
        guests: [{ id: guest, kind: "named", name: "Guest" }],
        version: 3,
      }),
    ]);
    await assert.rejects(
      db.query("select public.manage_invitation($1,$2,'update',$3,$4)", [
        sid,
        actor,
        iid,
        JSON.stringify({
          groupName: "Stale",
          variantId: variant.id,
          guests: [{ id: guest, kind: "named", name: "Guest" }],
          version: 3,
        }),
      ]),
      /REVISION_CONFLICT/,
    );
    await db.query<Record<string, unknown>>(
      "select public.unpublish_content($1,$2)",
      [sid, actor],
    );
    await assert.rejects(save(4, answer, "missing", actor), /UNPUBLISHED/);
    await db.query<Record<string, unknown>>(
      "select public.publish_content($1,$2,0,$3,'{}',$4)",
      [sid, actor, JSON.stringify(config), release],
    );
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select count(*)::int n from public.attendances",
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select rsvp_revision from public.invitations where id=$1",
          [iid],
        )
      ).rows[0].rsvp_revision,
      4,
    );
    await db.query(
      "update public.sites set vercel_project_id='legacy' where id=$1",
      [sid],
    );
    await assert.rejects(
      db.query(
        "select public.configure_access($1,$2,'code','hash',$3,null,4)",
        [sid, actor, config.defaultVariant],
      ),
      /LEGACY_PUBLICATION_ACTIVE/,
    );
    await db.query(
      "update public.sites set vercel_project_id=null where id=$1",
      [sid],
    );
    await db.query("select public.manage_invitation($1,$2,'revoke',$3,'{}')", [
      sid,
      actor,
      iid,
    ]);
    const withoutVariant = { ...config, variants: [config.variants[0]] };
    await db.query(
      "update public.drafts set config=$2, revision=revision+1 where site_id=$1",
      [sid, JSON.stringify(withoutVariant)],
    );
    await db.query("select public.publish_content($1,$2,2,$3,'{}')", [
      sid,
      actor,
      JSON.stringify(withoutVariant),
    ]);
    await assert.rejects(
      db.query(
        "select public.manage_invitation($1,$2,'rotate',$3,'{\"tokenHash\":\"token3\"}')",
        [sid, actor, iid],
      ),
      /VARIANT_MISSING/,
    );
    assert.equal(
      (
        await db.query<{ revoked: boolean }>(
          "select revoked from public.invitations where id=$1",
          [iid],
        )
      ).rows[0].revoked,
      true,
    );
    await db.exec(
      `set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${actor}'`,
    );
    assert.equal(
      (await db.query<Record<string, unknown>>("select id from public.sites"))
        .rows.length,
      1,
    );
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select id from public.invitations",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query<Record<string, unknown>>(
        "select access_code_hash from public.sites",
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query<Record<string, unknown>>(
        "select token_hash from public.invitations",
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query<Record<string, unknown>>("select * from public.guest_sessions"),
      /permission denied/,
    );
    await assert.rejects(
      db.query<Record<string, unknown>>(
        "select public.unpublish_content($1,$2)",
        [sid, actor],
      ),
      /permission denied/,
    );
    await db.exec(`set request.jwt.claim.sub='${other}'`);
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select id from public.invitations",
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role; set request.jwt.claim.role='service_role'");
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select public.consume_access_attempt('test',1,600) allowed",
        )
      ).rows[0].allowed,
      true,
    );
    assert.equal(
      (
        await db.query<Record<string, unknown>>(
          "select public.consume_access_attempt('test',1,600) allowed",
        )
      ).rows[0].allowed,
      false,
    );
  } finally {
    await db.close();
  }
});
