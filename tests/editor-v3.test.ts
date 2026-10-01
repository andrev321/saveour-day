import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { createDemo } from "../packages/domain/src/demo.ts";
import {
  siteConfigSchema,
  parseSiteConfig,
  mediaSchema,
} from "../packages/domain/src/index.ts";
import { guestContent } from "../packages/domain/src/guest.ts";
import {
  detachSection,
  moveSection,
  removeEntity,
} from "../packages/domain/src/editor.ts";
import {
  owner,
  sid,
  aid,
  prefix,
  schemaSql,
} from "./helpers/media-database.ts";
test("programme visibility is independent of RSVP permissions and contacts are scoped", () => {
  const c = createDemo();
  c.contacts.push({
    id: "private",
    name: "Private contact",
    phone: "+48123456789",
  });
  const v = c.variants[0];
  v.sections = v.sections.map((p) => ({
    ...p,
    visible: p.sectionId !== "timeline",
  }));
  const g = guestContent(c, v.id);
  assert.deepEqual(g.events, c.events);
  assert.deepEqual(
    g.contacts.map((c) => c.id),
    ["contact"],
  );
  assert.ok(!JSON.stringify(g).includes("Private contact"));
  v.sections[0].visible = true;
  v.eventIds = ["ceremony"];
  const restricted = guestContent(c, v.id);
  assert.deepEqual(
    restricted.events.map((e) => e.id),
    ["ceremony"],
  );
  const s = restricted.sections.find((s) => s.type === "timeline")!;
  assert.deepEqual(s.eventIds, ["ceremony"]);
  const { audience, ...editorShape } = restricted;
  void audience;
  assert.equal(siteConfigSchema.safeParse(editorShape).success, true);
});
test("default and extra variants keep independent order and entity cleanup is atomic", () => {
  const c = createDemo();
  c.variants.push({
    ...structuredClone(c.variants[0]),
    id: "family",
    slug: "family",
  });
  const moved = moveSection(c, "family", 0, 3);
  assert.deepEqual(moved.variants[0], c.variants[0]);
  assert.notDeepEqual(moved.variants[1].sections, c.variants[1].sections);
  assert.ok(
    detachSection(c, "family", "timeline").sections.some(
      (s) => s.id === "timeline",
    ),
  );
  for (const [kind, id] of [
    ["events", "ceremony"],
    ["contacts", "contact"],
    ["venues", "party"],
  ] as const) {
    const next = removeEntity(c, kind, id);
    assert.doesNotThrow(() => parseSiteConfig(next));
    assert.ok(c[kind].some((e) => e.id === id));
    assert.ok(!next[kind].some((e) => e.id === id));
  }
});
test("typed sections and independent image use crops are validated", () => {
  const c = createDemo();
  c.media = [
    mediaSchema.parse({
      id: "photo",
      src: "/media/photo.webp",
      width: 1200,
      height: 800,
    }),
  ];
  c.hero.mediaId = "photo";
  c.hero.crops = { desktop: { x: 20, y: 40 } };
  c.sections.push({
    id: "gallery",
    type: "gallery",
    title: "Gallery",
    body: "",
    mediaIds: ["photo"],
    crops: { photo: { desktop: { x: 80, y: 60 } } },
  });
  c.variants[0].sections.push({ sectionId: "gallery", visible: true });
  assert.doesNotThrow(() => parseSiteConfig(c));
  assert.equal(
    siteConfigSchema.safeParse({
      ...c,
      sections: [{ ...c.sections[0], venueId: "ceremony" }],
    }).success,
    false,
  );
  c.hero.crops.desktop!.x = 101;
  assert.equal(siteConfigSchema.safeParse(c).success, false);
});
test("database conversion preserves media, history and RSVP and removes legacy adapters", async () => {
  const db = new PGlite();
  try {
    await db.exec(schemaSql);
    const files = (await readdir("supabase/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort();
    const migration = files.find((f) =>
      f.endsWith("_contextual_editor_v3.sql"),
    )!;
    for (const file of files.filter((f) => f !== migration))
      await db.exec(
        (await readFile("supabase/migrations/" + file, "utf8")).replace(
          /create extension if not exists \w+;/g,
          "",
        ),
      );
    await db.exec(
      `insert into auth.users values('${owner}',now());set request.jwt.claim.role='service_role'`,
    );
    const demo = createDemo(sid),
      media = {
        id: aid,
        src: `/media/${aid}/640.webp`,
        alt: "Existing",
        width: 1200,
        height: 800,
        variants: [],
        focalX: 20,
        focalY: 40,
        tabletFocalX: 30,
        tabletFocalY: 60,
        mobileFocalX: 70,
        mobileFocalY: 80,
      };
    const old = {
      ...demo,
      schemaVersion: 2,
      theme: "ivory",
      hero: { ...demo.hero, mediaId: aid },
      media: [media],
      sections: demo.sections.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        body: s.body,
        enabled: true,
        mediaIds: [],
        ...(s.type === "venue" ? { venueId: s.venueId } : {}),
      })),
      variants: [
        {
          id: "slub",
          slug: "main",
          label: "Main",
          dateLabel: "",
          eventIds: ["ceremony", "party"],
          sectionIds: demo.sections.map((s) => s.id),
          hiddenEventIds: [],
          hiddenSectionIds: [],
        },
        {
          id: "limited",
          slug: "limited",
          label: "Limited",
          dateLabel: "",
          eventIds: ["party", "ceremony"],
          sectionIds: demo.sections.map((s) => s.id),
          hiddenEventIds: ["party"],
          hiddenSectionIds: ["party"],
        },
      ],
    };
    delete (old.hero as { crops?: unknown }).crops;
    delete (old as { appearance?: unknown }).appearance;
    await db.query(
      "select public.create_owned_site($1,'Example','example',$2,$3)",
      [
        owner,
        sid,
        JSON.stringify({
          ...old,
          media: [],
          hero: { ...old.hero, mediaId: undefined },
        }),
      ],
    );
    await db.query(
      "insert into public.media_assets(id,site_id,status,original_path,manifest) values($1,$2,'ready',$3,$4)",
      [aid, sid, `${prefix}/original`, JSON.stringify(media)],
    );
    await db.query("update public.drafts set config=$1 where site_id=$2", [
      JSON.stringify(old),
      sid,
    ]);
    const release = (
      await db.query<{ id: string }>(
        "select public.publish_content($1,$2,1,$3,'{}') id",
        [sid, owner, JSON.stringify(old)],
      )
    ).rows[0].id;
    await db.query(
      "insert into public.draft_snapshots(site_id,config,revision) values($1,$2,1)",
      [sid, JSON.stringify(old)],
    );
    const iid = "30000000-0000-4000-8000-000000000001",
      gid = "40000000-0000-4000-8000-000000000001";
    await db.query("select public.manage_invitation($1,$2,'create',$3,$4)", [
      sid,
      owner,
      iid,
      JSON.stringify({
        label: "Family",
        variantId: "limited",
        tokenHash: "secret",
        emails: [],
        guests: [{ id: gid, name: "Guest" }],
      }),
    ]);
    await db.query("select public.save_rsvp($1,$2,0,$3,'note',null,$4)", [
      sid,
      iid,
      JSON.stringify([{ guestId: gid, eventId: "ceremony", attending: true }]),
      owner,
    ]);
    await db.exec(await readFile("supabase/migrations/" + migration, "utf8"));
    for (const table of ["drafts", "releases", "draft_snapshots"]) {
      const raw = (
        await db.query<{ config: unknown }>(
          `select config from public.${table} where site_id=$1`,
          [sid],
        )
      ).rows[0].config;
      const c = parseSiteConfig(raw);
      assert.deepEqual(c, raw);
      assert.equal(c.schemaVersion, 3);
      assert.equal(c.theme, "classic");
      assert.equal(c.media[0].src, media.src);
      assert.deepEqual(c.hero.crops.mobile, { x: 70, y: 80 });
      assert.deepEqual(c.variants[1].eventIds, ["ceremony"]);
      assert.equal(
        c.variants[1].sections.find((p) => p.sectionId === "party")!.visible,
        false,
      );
    }
    assert.equal(
      (
        await db.query<{ published_release_id: string }>(
          "select published_release_id from public.sites where id=$1",
          [sid],
        )
      ).rows[0].published_release_id,
      release,
    );
    assert.equal(
      (await db.query("select * from public.rsvp_answers")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("select public.save_rsvp($1,$2,1,$3,'',null,$4)", [
        sid,
        iid,
        JSON.stringify([{ guestId: gid, eventId: "party", attending: true }]),
        owner,
      ]),
      /INVALID_ANSWERS/,
    );
    assert.equal(
      (
        await db.query(
          "select proname from pg_proc where proname in ('upgrade_config_v2','convert_editor_v3')",
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
