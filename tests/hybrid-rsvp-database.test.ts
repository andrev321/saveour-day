import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../packages/domain/src/demo.ts";
import { schemaSql } from "./helpers/media-database.ts";

test("hybrid RSVP migration supports short_code, Polish lookup, collision disambiguation, overwrite lock, rsvp_enabled and pending_match merge", async () => {
  const db = new PGlite();
  const actor = "10000000-0000-4000-8000-000000000001";
  const sid = "20000000-0000-4000-8000-000000000001";
  const iid1 = "30000000-0000-4000-8000-000000000001";
  const iid2 = "30000000-0000-4000-8000-000000000002";
  const iid3 = "30000000-0000-4000-8000-000000000003";
  const pendingIid = "30000000-0000-4000-8000-000000000004";
  const guest1 = "40000000-0000-4000-8000-000000000001";
  const guest2 = "40000000-0000-4000-8000-000000000002";
  const guest2b = "40000000-0000-4000-8000-000000000003";
  const guest3 = "40000000-0000-4000-8000-000000000004";

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

    await db.query("insert into auth.users values($1,now())", [actor]);
    await db.exec("set request.jwt.claim.role = 'service_role'");

    const config = createDemo();
    config.id = sid;
    const defaultVariant = config.defaultVariant;
    const eventId = config.events[0]!.id;

    await db.query("select public.create_owned_site($1,'Wedding','wedding',$2,$3)", [
      actor,
      sid,
      JSON.stringify(config),
    ]);
    await db.query("select public.publish_content($1,$2,1,$3,'{}')", [
      sid,
      actor,
      JSON.stringify(config),
    ]);

    // Create two invitations with colliding guest name "Anna Kowalska" and one unique Polish name "Łukasz Żółć".
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      actor,
      iid1,
      JSON.stringify({
        label: "Anna Kowalska (koleżanka)",
        variantId: defaultVariant,
        tokenHash: "tok1",
        emails: [],
        guests: [{ id: guest1, name: "Anna Kowalska" }],
      }),
    ]);
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      actor,
      iid2,
      JSON.stringify({
        label: "Kowalscy",
        variantId: defaultVariant,
        tokenHash: "tok2",
        emails: [],
        guests: [
          { id: guest2, name: "Anna Kowalska" },
          { id: guest2b, name: "Marek Kowalski" },
        ],
      }),
    ]);
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      actor,
      iid3,
      JSON.stringify({
        label: "Łukasz Żółć",
        variantId: defaultVariant,
        tokenHash: "tok3",
        emails: [],
        guests: [{ id: guest3, name: "Łukasz Żółć" }],
      }),
    ]);

    const codes = await db.query<{ id: string; short_code: string }>(
      "select id, short_code from public.invitations where site_id=$1 order by id",
      [sid],
    );
    assert.equal(codes.rows.length, 3);
    for (const row of codes.rows) {
      assert.match(row.short_code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    }
    const code1 = codes.rows.find((r) => r.id === iid1)!.short_code;

    const lookup = async (
      query: string,
      disambiguator: string | null = null,
      sessionHash: string | null = null,
    ) => {
      const res = await db.query<{
        res: { status: string; invitationId?: string; shortCodeMatched?: boolean };
      }>("select public.lookup_guest_invitation($1,$2,$3,$4) res", [
        sid,
        query,
        disambiguator,
        sessionHash,
      ]);
      return res.rows[0]!.res;
    };

    // Polish diacritics & reversed word order match.
    const polishMatch = await lookup("zolc lukasz");
    assert.equal(polishMatch.status, "matched");
    assert.equal(polishMatch.invitationId, iid3);

    // Collision returns ambiguous, disambiguating by 2nd person or short_code resolves it.
    assert.equal((await lookup("Anna Kowalska")).status, "ambiguous");
    const disambByPartner = await lookup("Anna Kowalska", "Marek Kowalski");
    assert.equal(disambByPartner.status, "matched");
    assert.equal(disambByPartner.invitationId, iid2);

    const disambByCode = await lookup("Anna Kowalska", code1.toLowerCase());
    assert.equal(disambByCode.status, "matched");
    assert.equal(disambByCode.invitationId, iid1);
    assert.equal(disambByCode.shortCodeMatched, true);

    // Overwrite protection: once rsvp_revision > 0, lookup without matching session returns locked,
    // while same-device session or direct short_code unlocks it.
    await db.query(
      "insert into public.guest_sessions(token_hash,site_id,invitation_id,access_version,invitation_version,expires_at) values('sess1',$1,$2,1,1,now()+interval '1 hour')",
      [sid, iid3],
    );
    await db.query(
      "select public.save_guest_rsvp($1,$2,0,$3,'Cześć!',null,null,'sess1',null)",
      [sid, iid3, JSON.stringify([{ guestId: guest3, eventId, attending: true }])],
    );
    assert.equal((await lookup("Łukasz Żółć", null, null)).status, "locked");
    assert.equal((await lookup("Łukasz Żółć", null, "sess1")).status, "matched");
    const code3 = codes.rows.find((r) => r.id === iid3)!.short_code;
    const unlockByCode = await lookup(code3, null, null);
    assert.equal(unlockByCode.status, "matched");
    assert.equal(unlockByCode.invitationId, iid3);

    // Self-registration is disabled by default.
    await assert.rejects(
      db.query(
        "select public.create_self_registered_invitation($1,$2,'Nowy Gość','tok-self',false)",
        [sid, pendingIid],
      ),
      /FORBIDDEN/,
    );

    // Enable self-registration, submit, and merge into iid1.
    await db.query("select public.configure_rsvp_options($1,$2,true,true,1)", [
      sid,
      actor,
    ]);
    await db.query(
      "select public.create_self_registered_invitation($1,$2,'Anna Kowalska','tok-self',false)",
      [sid, pendingIid],
    );
    const pendingRow = await db.query<{
      guests: Array<{ id: string }>;
      origin: string;
      review_status: string;
    }>(
      "select guests, origin, review_status from public.invitations where id=$1",
      [pendingIid],
    );
    assert.equal(pendingRow.rows[0]!.origin, "self_registered");
    assert.equal(pendingRow.rows[0]!.review_status, "pending_match");

    const pendingGuestId = pendingRow.rows[0]!.guests[0]!.id;
    await db.query(
      "insert into public.guest_sessions(token_hash,site_id,invitation_id,access_version,invitation_version,expires_at) values('sess-self',$1,$2,2,1,now()+interval '1 hour')",
      [sid, pendingIid],
    );
    await db.query(
      "select public.save_guest_rsvp($1,$2,0,$3,'Będę!',null,null,'sess-self',null)",
      [
        sid,
        pendingIid,
        JSON.stringify([{ guestId: pendingGuestId, eventId, attending: true }]),
      ],
    );

    await db.query("select public.merge_pending_invitation($1,$2,$3,$4)", [
      sid,
      actor,
      pendingIid,
      iid1,
    ]);
    assert.equal(
      (
        await db.query("select id from public.invitations where id=$1", [
          pendingIid,
        ])
      ).rows.length,
      0,
    );
    const mergedAnswers = await db.query<{ attending: boolean }>(
      "select attending from public.rsvp_answers where invitation_id=$1 and guest_id=$2 and event_id=$3",
      [iid1, guest1, eventId],
    );
    assert.equal(mergedAnswers.rows[0]!.attending, true);

    // Info-only mode (rsvp_enabled = false) disables lookup and guest RSVP writes.
    await db.query("select public.configure_rsvp_options($1,$2,false,false,2)", [
      sid,
      actor,
    ]);
    assert.equal((await lookup("Łukasz Żółć", null, "sess1")).status, "not_found");
    await assert.rejects(
      db.query(
        "select public.save_guest_rsvp($1,$2,1,$3,'Próba',null,null,'sess1',null)",
        [sid, iid3, JSON.stringify([{ guestId: guest3, eventId, attending: false }])],
      ),
      /RSVP_DISABLED/,
    );

    // Re-enable RSVP and verify hyphenated surname & reversed disambiguator.
    await db.query("select public.configure_rsvp_options($1,$2,true,false,3)", [
      sid,
      actor,
    ]);
    assert.equal(
      (await lookup("Anna Kowalska", "Kowalski Marek")).invitationId,
      iid2,
    );
    const hyphenNorm = await db.query<{ norm: string }>(
      "select public.normalize_guest_lookup('Anna Nowak-Kowalska') as norm",
    );
    assert.equal(hyphenNorm.rows[0]!.norm, "anna nowak kowalska");
  } finally {
    await db.close();
  }
});
