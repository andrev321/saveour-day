import { readFileSync } from "node:fs";
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

test("RSVP questions enforce required checks for guests, clean up removed options, and isolate tenants via RLS", async () => {
  const db = new PGlite();
  const iid = "30000000-0000-4000-8000-000000000001";
  const guestId = "40000000-0000-4000-8000-000000000001";
  const qReqId = "50000000-0000-4000-8000-000000000001";
  const qLimitedId = "50000000-0000-4000-8000-000000000002";

  try {
    await setupMediaDatabase((sql) => db.exec(sql));
    const config = createDemo();
    config.id = sid;
    const limitedVariant = {
      ...config.variants[0]!,
      id: "limited",
      slug: "limited",
    };
    config.variants.push(limitedVariant);

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

    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      owner,
      iid,
      JSON.stringify({
        groupName: null,
        variantId: config.defaultVariant,
        tokenHash: "tok",
        guests: [{ id: guestId, kind: "named", name: "Anna" }],
      }),
    ]);

    await db.query("select public.manage_rsvp_questions($1,$2,$3,1)", [
      sid,
      owner,
      JSON.stringify([
        {
          id: qReqId,
          scope: "guest",
          type: "multi",
          label: "Alergie",
          required: true,
          allowOther: true,
          options: [
            { id: "nuts", label: "Orzechy" },
            { id: "milk", label: "Mleko" },
          ],
          variantIds: [],
        },
        {
          id: qLimitedId,
          scope: "invitation",
          type: "number",
          label: "Miejsca parkingowe",
          required: false,
          allowOther: false,
          options: [],
          variantIds: ["limited"],
        },
      ]),
    ]);

    await db.query(
      "insert into public.guest_sessions(token_hash,site_id,invitation_id,access_version,invitation_version,expires_at) values('sess',$1,$2,2,1,now()+interval '1 hour')",
      [sid, iid],
    );

    const eventId = "__overall__";
    const att = JSON.stringify([{ guestId, eventId, attending: true }]);

    // Missing required question fails for guest.
    await assert.rejects(
      db.query(
        "select public.save_guest_rsvp($1,$2,0,$3,'','{}'::jsonb,'[]'::jsonb,'sess',null)",
        [sid, iid, att],
      ),
      /REQUIRED_QUESTION_MISSING/,
    );

    // Answering a question restricted to another variant fails.
    await assert.rejects(
      db.query(
        "select public.save_guest_rsvp($1,$2,0,$3,'','{}'::jsonb,$4,'sess',null)",
        [
          sid,
          iid,
          att,
          JSON.stringify([
            { questionId: qReqId, guestId, value: { optionIds: ["nuts"] } },
            { questionId: qLimitedId, guestId: null, value: { number: 2 } },
          ]),
        ],
      ),
      /INVALID_ANSWERS/,
    );

    // Valid answer succeeds.
    await db.query(
      "select public.save_guest_rsvp($1,$2,0,$3,'','{}'::jsonb,$4,'sess',null)",
      [
        sid,
        iid,
        att,
        JSON.stringify([
          { questionId: qReqId, guestId, value: { optionIds: ["nuts"] } },
        ]),
      ],
    );

    // Admin edit bypasses required question check.
    await db.query(
      "select public.save_guest_rsvp($1,$2,1,$3,'','{}'::jsonb,$4,null,$5)",
      [
        sid,
        iid,
        att,
        JSON.stringify([{ questionId: qReqId, guestId, value: null }]),
        owner,
      ],
    );

    // Save an answer again, then remove the selected option -> answer row is cleaned up.
    await db.query(
      "select public.save_guest_rsvp($1,$2,2,$3,'','{}'::jsonb,$4,'sess',null)",
      [
        sid,
        iid,
        att,
        JSON.stringify([
          { questionId: qReqId, guestId, value: { optionIds: ["nuts"] } },
        ]),
      ],
    );
    await db.query("select public.manage_rsvp_questions($1,$2,$3,2)", [
      sid,
      owner,
      JSON.stringify([
        {
          id: qReqId,
          scope: "guest",
          type: "multi",
          label: "Alergie",
          required: true,
          allowOther: true,
          options: [{ id: "milk", label: "Mleko" }],
          variantIds: [],
        },
      ]),
    ]);
    assert.equal(
      (
        await db.query(
          "select * from public.rsvp_question_answers where question_id=$1",
          [qReqId],
        )
      ).rows.length,
      0,
    );

    // Atomic self-registration: if required question is missing, no pending_match row is left behind.
    await db.query("select public.configure_rsvp_options($1,$2,true,true,3)", [
      sid,
      owner,
    ]);
    const selfIid = "30000000-0000-4000-8000-000000000099";
    await assert.rejects(
      db.query(
        "select public.create_self_registered_invitation($1,$2,'Gość Testowy','tok-atomic',false,null,$3,'','[]'::jsonb)",
        [
          sid,
          selfIid,
          JSON.stringify([
            {
              guestId: "00000000-0000-4000-8000-000000000001",
              eventId,
              attending: true,
            },
          ]),
        ],
      ),
      /REQUIRED_QUESTION_MISSING/,
    );
    assert.equal(
      (
        await db.query("select id from public.invitations where id=$1", [
          selfIid,
        ])
      ).rows.length,
      0,
    );

    // Admin requireSite select columns must match the migrated sites schema and authenticated grants.
    const adminServerSource = readFileSync(
      new URL("../apps/admin/lib/server.ts", import.meta.url),
      "utf8",
    );
    const siteSelectMatch = adminServerSource.match(
      /\.from\("sites"\)\s*\.select\(\s*"([^"]+)"/,
    );
    assert.ok(siteSelectMatch?.[1], "requireSite select columns not found");
    await db.exec(
      `set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${owner}'`,
    );
    const siteRow = await db.query(
      `select ${siteSelectMatch[1]} from public.sites where id = $1 and deleted_at is null`,
      [sid],
    );
    assert.equal(siteRow.rows.length, 1);

    // RLS isolation: another organizer cannot read questions, answers, or guests.
    await db.exec(
      `set role authenticated; set request.jwt.claim.role='authenticated'; set request.jwt.claim.sub='${other}'`,
    );
    assert.equal(
      (await db.query("select * from public.rsvp_questions")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.rsvp_question_answers")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.invitation_guests")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
