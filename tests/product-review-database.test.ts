import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../packages/domain/src/demo.ts";
import {
  setupMediaDatabase,
  owner,
  other,
  sid,
} from "./helpers/media-database.ts";
test("member edits preserve RSVP, question history, transactional imports and reminder idempotency", async () => {
  const db = new PGlite();
  const iid = "30000000-0000-4000-8000-000000000001",
    guest = "40000000-0000-4000-8000-000000000001",
    added = "40000000-0000-4000-8000-000000000002";
  try {
    await setupMediaDatabase((sql) => db.exec(sql));
    const config = createDemo();
    config.id = sid;
    await db.query("select public.create_owned_site($1,'Test','test',$2,$3)", [
      owner,
      sid,
      JSON.stringify(config),
    ]);
    await db.query("select public.publish_content($1,$2,1,$3,'{}')", [
      sid,
      owner,
      JSON.stringify(config),
    ]);
    const payload = {
      label: "Family",
      variantId: config.defaultVariant,
      tokenHash: "token",
      emails: ["family@example.com"],
      guests: [{ id: guest, name: "Maria" }],
    };
    const manage = (data: unknown, actor = owner) =>
      db.query("select public.manage_invitation($1,$2,'update',$3,$4)", [
        sid,
        actor,
        iid,
        JSON.stringify(data),
      ]);
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      owner,
      iid,
      JSON.stringify(payload),
    ]);
    await db.query("select public.configure_questions($1,$2,$3,1)", [
      sid,
      owner,
      JSON.stringify({ diet: true, lodging: true, transport: true }),
    ]);
    const answer = [
      { guestId: guest, eventId: config.events[0].id, attending: true },
    ];
    const details = (rev: number, data: unknown) =>
      db.query(
        "select public.save_rsvp_with_details($1,$2,$3,$4,'note',$5,null,$6)",
        [sid, iid, rev, JSON.stringify(answer), JSON.stringify(data), owner],
      );
    await details(0, { [guest]: { diet: "vegan", lodging: true } });
    await manage({
      ...payload,
      version: 1,
      guests: [{ id: added, name: "Jan" }],
    });
    const row = (
      await db.query<{
        archived_guests: { id: string }[];
        rsvp_revision: number;
        guest_details: unknown;
      }>("select * from public.invitations where id=$1", [iid])
    ).rows[0];
    assert.equal(row.archived_guests[0].id, guest);
    assert.equal(row.rsvp_revision, 2);
    assert.equal(
      (
        await db.query("select * from public.rsvp_answers where guest_id=$1", [
          guest,
        ])
      ).rows.length,
      1,
    );
    await assert.rejects(
      manage({ ...payload, version: 2 }, other),
      /FORBIDDEN/,
    );
    await manage({ ...payload, version: 2 });
    assert.equal(
      (
        await db.query<{ archived_guests: { id: string }[] }>(
          "select archived_guests from public.invitations where id=$1",
          [iid],
        )
      ).rows[0].archived_guests[0].id,
      added,
    );
    await db.query("select public.configure_questions($1,$2,$3,2)", [
      sid,
      owner,
      JSON.stringify({ diet: false, lodging: true, transport: false }),
    ]);
    await details(3, { [guest]: { lodging: false } });
    assert.deepEqual(
      (
        await db.query<{ guest_details: unknown }>(
          "select guest_details from public.invitations where id=$1",
          [iid],
        )
      ).rows[0].guest_details,
      { [guest]: { diet: "vegan", lodging: false } },
    );
    await assert.rejects(
      details(4, { [guest]: { diet: "changed" } }),
      /INVALID_ANSWERS/,
    );
    assert.equal(
      (
        await db.query<{ rsvp_revision: number }>(
          "select rsvp_revision from public.invitations where id=$1",
          [iid],
        )
      ).rows[0].rsvp_revision,
      4,
    );
    const request = "60000000-0000-4000-8000-000000000001",
      imported = "30000000-0000-4000-8000-000000000002";
    const entry = {
      id: imported,
      payload: {
        ...payload,
        tokenHash: "import-token",
        guests: [
          { id: "40000000-0000-4000-8000-000000000003", name: "Imported" },
        ],
      },
    };
    const bulk = (key: string, entries: unknown[]) =>
      db.query<{ result: { created: boolean } }>(
        "select public.import_guests($1,$2,$3,$4) result",
        [sid, owner, key, JSON.stringify(entries)],
      );
    assert.equal((await bulk(request, [entry])).rows[0].result.created, true);
    assert.equal((await bulk(request, [entry])).rows[0].result.created, false);
    await assert.rejects(
      bulk("60000000-0000-4000-8000-000000000002", [
        { ...entry, id: "30000000-0000-4000-8000-000000000003" },
        { ...entry, id: "invalid" },
      ]),
    );
    assert.equal(
      (await db.query("select * from public.invitations")).rows.length,
      2,
    );
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query("select * from public.guest_imports"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
