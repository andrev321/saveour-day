import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createTemplate,
  templateIds,
} from "../packages/domain/src/templates.ts";
import {
  samplePhotos,
  isSampleMedia,
  mediaSchema,
  invitationLocales,
  samplePhotoGroups,
  samplePhotoOptions,
  selectSamplePhoto,
  parseSiteConfig,
} from "../packages/domain/src/index.ts";
import { Invitation } from "../packages/renderer/src/index.tsx";
import {
  setupMediaDatabase,
  owner,
  other,
  sid,
} from "./helpers/media-database.ts";

test("curated scenes switch the hero without duplicating photos or replacing independent device photos", () => {
  for (const locale of invitationLocales) {
    for (const group of Object.keys(
      samplePhotoGroups,
    ) as (keyof typeof samplePhotoGroups)[]) {
      const options = samplePhotoOptions(group, locale);
      assert.equal(options.length, 3);
      assert.equal(new Set(options.map((item) => item.id)).size, 3);
      for (const photo of options) assert.ok(isSampleMedia(photo));
    }
    const start = createTemplate("baby-shower", "choices", locale);
    start.hero.crops = { desktop: { x: 5, y: 10 }, mobile: { x: 20, y: 30 } };
    const changed = selectSamplePhoto(start, "baby-shower-girl");
    assert.equal(changed.hero.mediaId, "example-baby-shower-girl-v1");
    assert.equal(changed.hero.crops.desktop, undefined);
    assert.equal(changed.hero.crops.mobile, undefined);
    assert.equal(start.media.length, 1);
    const back = selectSamplePhoto(changed, "baby-shower-neutral");
    assert.equal(back.media.length, 2);
    assert.deepEqual(parseSiteConfig(back).identity, start.identity);
    back.hero.mobileMediaId = start.media[0].id;
    back.hero.crops.mobile = { x: 15, y: 20 };
    const next = selectSamplePhoto(back, "baby-shower");
    assert.equal(next.hero.mobileMediaId, start.media[0].id);
    assert.deepEqual(next.hero.crops.mobile, { x: 15, y: 20 });
    assert.equal(selectSamplePhoto(next, "baby-shower"), next);
    const full = {
      ...start,
      media: Array.from({ length: 30 }, (_, i) => ({
        ...start.media[0],
        id: `upload-${i}`,
      })),
    };
    assert.equal(selectSamplePhoto(full, "baby-shower-girl"), full);
  }
});

test("all non-blank starters have a localized, independently removable sample photo", () => {
  for (const locale of invitationLocales)
    for (const template of templateIds) {
      const config = createTemplate(template, "test", locale);
      if (template === "blank") {
        assert.equal(config.media.length, 0);
        assert.equal(config.hero.mediaId, undefined);
      } else {
        assert.equal(config.media.length, 1);
        assert.equal(config.hero.mediaId, config.media[0].id);
        assert.ok(isSampleMedia(config.media[0]));
        assert.match(
          config.media[0].alt,
          /Przykładowe zdjęcie|Example photo|Beispielfoto/,
        );
        config.media[0].alt = "My description";
        config.media[0].variants.pop();
        const next = createTemplate(template, "other", locale);
        assert.notEqual(next.media[0].alt, "My description");
        assert.equal(next.media[0].variants.length, 3);
      }
    }
});

test("public samples are byte-identical in both apps and match the versioned manifest", async () => {
  for (const photo of Object.values(samplePhotos))
    for (const variant of photo.variants) {
      const admin = await readFile(`apps/admin/public${variant.src}`);
      const site = await readFile(`apps/site/public${variant.src}`);
      assert.deepEqual(admin, site);
      const metadata = await sharp(site).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, variant.width);
      if (variant.src === photo.src)
        assert.equal(metadata.height, photo.height);
    }
});

test("starters choose occasion-specific photos and retain historical media", () => {
  const expected = {
    wedding: "wedding",
    reception: "reception",
    "wedding-reception": "wedding",
    birthday: "birthday",
    corporate: "corporate",
    anniversary: "anniversary",
    "family-ceremony": "baptism",
    "baby-shower": "baby-shower-neutral",
    housewarming: "housewarming",
    workshop: "workshop",
  } as const;
  for (const locale of invitationLocales)
    for (const [template, photo] of Object.entries(expected)) {
      const config = createTemplate(
        template as keyof typeof expected,
        "test",
        locale,
      );
      assert.equal(config.media[0].id, `example-${photo}-v1`);
    }
  for (const key of ["garden", "gathering", "evening"] as const)
    assert.ok(isSampleMedia(samplePhotos[key]));
});

test("only exact sample manifests bypass private media resolution", () => {
  const config = createTemplate("birthday", "test");
  const photo = config.media[0];
  assert.ok(
    mediaSchema.safeParse({ ...photo, alt: "Changed description" }).success,
  );
  for (const patch of [
    { id: "another" },
    { src: "/media/private/640.webp" },
    { width: 12 },
    { variants: [] },
    { variants: [{ src: "/media/private/640.webp", width: 640 }] },
  ])
    assert.equal(mediaSchema.safeParse({ ...photo, ...patch }).success, false);
  const html = renderToStaticMarkup(
    createElement(Invitation, {
      config,
      resolveMedia: () => {
        throw new Error("Sample must not use private endpoint");
      },
    }),
  );
  assert.ok(html.includes(photo.src));
});

test("database permits samples for creation, saving and publication but rejects forged or foreign assets", async () => {
  const db = new PGlite();
  try {
    await setupMediaDatabase((sql) => db.exec(sql));
    const config = createTemplate("birthday", sid);
    await db.query(
      "select public.create_owned_site($1,'Examples','examples',$2,$3)",
      [owner, sid, JSON.stringify(config)],
    );
    for (const sample of Object.values(samplePhotos)) {
      assert.equal(
        (
          await db.query<{ ok: boolean }>(
            "select private.is_sample_media($1) ok",
            [JSON.stringify(sample)],
          )
        ).rows[0].ok,
        true,
      );
    }
    const save = (value: unknown, actor = owner) =>
      db.query("select public.save_site_draft($1,$2,1,$3)", [
        sid,
        actor,
        JSON.stringify(value),
      ]);
    await assert.rejects(save(config, other), /FORBIDDEN/);
    for (const patch of [
      { src: "/media/foreign/640.webp" },
      { id: "foreign" },
      { width: 1 },
      { variants: [] },
      { extra: true },
    ]) {
      await assert.rejects(
        save({ ...config, media: [{ ...config.media[0], ...patch }] }),
        /MEDIA_UNAVAILABLE/,
      );
    }
    config.media[0].alt = "Custom caption";
    await save(config);
    const release = await db.query(
      "select public.publish_content($1,$2,2,$3,'{}',null)",
      [sid, owner, JSON.stringify(config)],
    );
    assert.equal(release.rows.length, 1);
    const removed = structuredClone(config);
    removed.media = [];
    delete removed.hero.mediaId;
    await db.query("select public.save_site_draft($1,$2,2,$3)", [
      sid,
      owner,
      JSON.stringify(removed),
    ]);
    const published = await db.query<{ config: typeof config }>(
      "select config from public.releases where site_id=$1",
      [sid],
    );
    assert.equal(published.rows[0].config.media.length, 1);
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from public.media_assets",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.close();
  }
});
