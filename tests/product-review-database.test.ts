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

test("member edits cascade answers, RSVP questions enforce immutability and validation, and imports are idempotent", async () => {
  const db = new PGlite();
  const iid = "30000000-0000-4000-8000-000000000001",
    guest = "40000000-0000-4000-8000-000000000001",
    added = "40000000-0000-4000-8000-000000000002",
    qDietId = "50000000-0000-4000-8000-000000000001",
    qLodgingId = "50000000-0000-4000-8000-000000000002";
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
      groupName: "Family",
      variantId: config.defaultVariant,
      tokenHash: "token",
      guests: [{ id: guest, kind: "named", name: "Maria" }],
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

    await db.query("select public.manage_rsvp_questions($1,$2,$3,1)", [
      sid,
      owner,
      JSON.stringify([
        {
          id: qDietId,
          scope: "guest",
          type: "single",
          label: "Dieta",
          required: false,
          allowOther: true,
          options: [
            { id: "std", label: "Standard" },
            { id: "veg", label: "Wege" },
          ],
          variantIds: [],
          presetKey: "diet",
        },
        {
          id: qLodgingId,
          scope: "invitation",
          type: "single",
          label: "Nocleg",
          required: false,
          allowOther: false,
          options: [
            { id: "yes", label: "Tak" },
            { id: "no", label: "Nie" },
          ],
          variantIds: [],
          presetKey: "lodging",
        },
      ]),
    ]);

    const answer = [
      { guestId: guest, eventId: config.events[0].id, attending: true },
    ];
    await db.query(
      "select public.save_guest_rsvp($1,$2,0,$3,'note','{}'::jsonb,$4,null,$5)",
      [
        sid,
        iid,
        JSON.stringify(answer),
        JSON.stringify([
          {
            questionId: qDietId,
            guestId: guest,
            value: { optionIds: ["veg"] },
          },
          {
            questionId: qLodgingId,
            guestId: null,
            value: { optionIds: ["yes"] },
          },
        ]),
        owner,
      ],
    );

    // Changing question type when answers exist must fail with QUESTION_IMMUTABLE.
    await assert.rejects(
      db.query("select public.manage_rsvp_questions($1,$2,$3,2)", [
        sid,
        owner,
        JSON.stringify([
          {
            id: qDietId,
            scope: "guest",
            type: "text",
            label: "Dieta",
            required: false,
            allowOther: false,
            options: [],
            variantIds: [],
          },
        ]),
      ]),
      /QUESTION_IMMUTABLE/,
    );

    // Removing guest cascades their attendances and guest-scoped question answers.
    await manage({
      ...payload,
      version: 1,
      guests: [{ id: added, kind: "named", name: "Jan" }],
    });

    assert.equal(
      (
        await db.query("select * from public.attendances where guest_id=$1", [
          guest,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.rsvp_question_answers where guest_id=$1",
          [guest],
        )
      ).rows.length,
      0,
    );

    await assert.rejects(
      manage({ ...payload, version: 2 }, other),
      /FORBIDDEN/,
    );

    const request = "60000000-0000-4000-8000-000000000001",
      imported = "30000000-0000-4000-8000-000000000002";
    const entry = {
      id: imported,
      payload: {
        ...payload,
        tokenHash: "import-token",
        guests: [
          {
            id: "40000000-0000-4000-8000-000000000003",
            kind: "named",
            name: "Imported",
          },
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
