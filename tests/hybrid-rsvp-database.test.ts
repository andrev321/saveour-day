import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../packages/domain/src/demo.ts";
import { schemaSql } from "./helpers/media-database.ts";

test("hybrid RSVP migration supports short_code, Polish lookup, companion rules, convert-companion and pending_match merge", async () => {
  const db = new PGlite();
  const actor = "10000000-0000-4000-8000-000000000001";
  const sid = "20000000-0000-4000-8000-000000000001";
  const iid1 = "30000000-0000-4000-8000-000000000001";
  const iid2 = "30000000-0000-4000-8000-000000000002";
  const iid3 = "30000000-0000-4000-8000-000000000003";
  const pendingIid = "30000000-0000-4000-8000-000000000004";
  const guest1 = "40000000-0000-4000-8000-000000000001";
  const guest1Comp = "40000000-0000-4000-8000-000000000011";
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

    await db.query(
      "select public.create_owned_site($1,'Wedding','wedding',$2,$3)",
      [actor, sid, JSON.stringify(config)],
    );
    await db.query("select public.publish_content($1,$2,1,$3,'{}')", [
      sid,
      actor,
      JSON.stringify(config),
    ]);

    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      actor,
      iid1,
      JSON.stringify({
        groupName: null,
        variantId: defaultVariant,
        tokenHash: "tok1",
        guests: [
          { id: guest1, kind: "named", name: "Anna Kowalska" },
          { id: guest1Comp, kind: "companion", name: null },
        ],
      }),
    ]);
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      actor,
      iid2,
      JSON.stringify({
        groupName: "Kowalscy",
        variantId: defaultVariant,
        tokenHash: "tok2",
        guests: [
          { id: guest2, kind: "named", name: "Anna Kowalska" },
          { id: guest2b, kind: "named", name: "Marek Kowalski" },
        ],
      }),
    ]);
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      actor,
      iid3,
      JSON.stringify({
        groupName: null,
        variantId: defaultVariant,
        tokenHash: "tok3",
        guests: [{ id: guest3, kind: "named", name: "Łukasz Żółć" }],
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
        res: {
          status: string;
          invitationId?: string;
          shortCodeMatched?: boolean;
        };
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

    // Companion cannot attend an event unless a named guest attends that event,
    // and companion's name cannot be used in lookup until converted to named.
    await db.query(
      "insert into public.guest_sessions(token_hash,site_id,invitation_id,access_version,invitation_version,expires_at) values('sess1-inv',$1,$2,1,1,now()+interval '1 hour')",
      [sid, iid1],
    );
    await assert.rejects(
      db.query(
        "select public.save_guest_rsvp($1,$2,0,$3,'','{}'::jsonb,'[]'::jsonb,'sess1-inv',null)",
        [
          sid,
          iid1,
          JSON.stringify([
            { guestId: guest1, eventId, attending: false },
            { guestId: guest1Comp, eventId, attending: true },
          ]),
        ],
      ),
      /INVALID_ANSWERS/,
    );
    await db.query(
      "select public.save_guest_rsvp($1,$2,0,$3,'', $4, '[]'::jsonb,'sess1-inv',null)",
      [
        sid,
        iid1,
        JSON.stringify([
          { guestId: guest1, eventId, attending: true },
          { guestId: guest1Comp, eventId, attending: true },
        ]),
        JSON.stringify({ [guest1Comp]: "Tomek Towarzysz" }),
      ],
    );
    assert.equal((await lookup("Tomek Towarzysz")).status, "not_found");

    // Converting companion to named guest preserves answers and enables lookup.
    await db.query(
      "select public.manage_invitation($1,$2,'convert-companion',$3,$4)",
      [
        sid,
        actor,
        iid1,
        JSON.stringify({
          version: 1,
          guestId: guest1Comp,
          name: "Tomek Towarzysz",
        }),
      ],
    );
    const convertedLookup = await lookup("Tomek Towarzysz");
    assert.equal(convertedLookup.status, "locked");
    assert.equal(convertedLookup.invitationId, iid1);

    // Overwrite protection on iid3.
    await db.query(
      "insert into public.guest_sessions(token_hash,site_id,invitation_id,access_version,invitation_version,expires_at) values('sess1',$1,$2,1,1,now()+interval '1 hour')",
      [sid, iid3],
    );
    await db.query(
      "select public.save_guest_rsvp($1,$2,0,$3,'Cześć!','{}'::jsonb,'[]'::jsonb,'sess1',null)",
      [
        sid,
        iid3,
        JSON.stringify([{ guestId: guest3, eventId, attending: true }]),
      ],
    );
    assert.equal((await lookup("Łukasz Żółć", null, null)).status, "locked");
    assert.equal(
      (await lookup("Łukasz Żółć", null, "sess1")).status,
      "matched",
    );
    const code3 = codes.rows.find((r) => r.id === iid3)!.short_code;
    const unlockByCode = await lookup(code3, null, null);
    assert.equal(unlockByCode.status, "matched");
    assert.equal(unlockByCode.invitationId, iid3);

    // Self-registration is disabled by default.
    await assert.rejects(
      db.query(
        "select public.create_self_registered_invitation($1,$2,'Nowy Gość','tok-self',false,null)",
        [sid, pendingIid],
      ),
      /FORBIDDEN/,
    );

    // Enable self-registration, submit with 1 companion, and merge into iid1 targeting guest1.
    await db.query("select public.configure_rsvp_options($1,$2,true,true,1)", [
      sid,
      actor,
    ]);
    await db.query(
      "select public.create_self_registered_invitation($1,$2,'Anna Kowalska','tok-self',true,'Janek Plus',$3,'Będę!','[]'::jsonb)",
      [
        sid,
        pendingIid,
        JSON.stringify([
          {
            guestId: "00000000-0000-4000-8000-000000000001",
            eventId,
            attending: true,
          },
          {
            guestId: "00000000-0000-4000-8000-000000000002",
            eventId,
            attending: true,
          },
        ]),
      ],
    );
    const pendingGuests = await db.query<{ id: string; kind: string }>(
      "select id, kind from public.invitation_guests where invitation_id=$1 order by position",
      [pendingIid],
    );
    assert.equal(pendingGuests.rows.length, 2);

    await db.query("select public.merge_pending_invitation($1,$2,$3,$4,$5)", [
      sid,
      actor,
      pendingIid,
      iid1,
      guest1,
    ]);
    assert.equal(
      (
        await db.query("select id from public.invitations where id=$1", [
          pendingIid,
        ])
      ).rows.length,
      0,
    );
    const mergedGuests = await db.query<{ id: string; kind: string }>(
      "select id, kind from public.invitation_guests where invitation_id=$1 order by position",
      [iid1],
    );
    assert.equal(mergedGuests.rows.length, 3);
    const mergedAnswers = await db.query<{ attending: boolean }>(
      "select attending from public.attendances where invitation_id=$1 and guest_id=$2 and event_id=$3",
      [iid1, guest1, eventId],
    );
    assert.equal(mergedAnswers.rows[0]!.attending, true);

    // Info-only mode disables lookup and guest RSVP writes.
    await db.query(
      "select public.configure_rsvp_options($1,$2,false,false,2)",
      [sid, actor],
    );
    assert.equal(
      (await lookup("Łukasz Żółć", null, "sess1")).status,
      "not_found",
    );
    await assert.rejects(
      db.query(
        "select public.save_guest_rsvp($1,$2,1,$3,'Próba','{}'::jsonb,'[]'::jsonb,'sess1',null)",
        [
          sid,
          iid3,
          JSON.stringify([{ guestId: guest3, eventId, attending: false }]),
        ],
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
