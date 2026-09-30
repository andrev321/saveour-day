import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createDemo } from "../packages/domain/src/demo.ts";
import {
  aid,
  authenticate,
  manifest,
  other,
  owner,
  prefix,
  service,
  setupMediaDatabase,
  sid,
} from "./helpers/media-database.ts";

test("Storage permits only scoped active processing writes and media deletion is terminal", async () => {
  const db = new PGlite();
  try {
    await setupMediaDatabase((sql) => db.exec(sql));
    const config = { ...createDemo(), id: sid };
    await db.query(
      "select public.create_owned_site($1,'Test',$2::text,$2::uuid,$3)",
      [owner, sid, JSON.stringify(config)],
    );
    await db.query("select public.reserve_media_upload($1,$2,$3,$4)", [
      sid,
      owner,
      aid,
      `${prefix}/original`,
    ]);
    await db.exec(authenticate(other));
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('site-media',$1)",
        [`${prefix}/640.webp`],
      ),
      /row-level security/,
    );
    await db.exec(authenticate());
    await assert.rejects(
      db.query("select original_path from public.media_assets"),
      /permission denied/,
    );
    for (const path of [
      `${sid}/${aid}/${"b".repeat(64)}/640.webp`,
      `${prefix}/original`,
      `${prefix}/../640.webp`,
    ])
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('site-media',$1)",
          [path],
        ),
        /row-level security/,
      );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('site-media',$1)",
      [`${prefix}/640.webp`],
    );
    assert.deepEqual(
      (await db.query("select name from storage.objects")).rows,
      [],
    );
    assert.deepEqual(
      (
        await db.query(
          "update storage.objects set name='changed' returning name",
        )
      ).rows,
      [],
    );
    await assert.rejects(
      db.query("select public.reserve_media_upload($1,$2,$3,$4)", [
        sid,
        owner,
        aid,
        `${prefix}/original`,
      ]),
      /permission denied/,
    );
    await db.exec(service);
    assert.equal(
      (await db.query("select name from storage.objects")).rows.length,
      1,
      "positive INSERT is required; deny-all policy is insufficient",
    );
    await assert.rejects(
      db.query("select public.begin_media_deletion($1,$2,$3,true)", [
        sid,
        aid,
        owner,
      ]),
      /MEDIA_NOT_READY/,
    );
    await db.query("select public.complete_media_upload($1,$2,$3,$4)", [
      sid,
      aid,
      owner,
      JSON.stringify(manifest),
    ]);
    // A stale cleanup snapshot cannot delete a newly completed upload.
    await assert.rejects(
      db.query("select public.begin_media_deletion($1,$2,$3,true)", [
        sid,
        aid,
        owner,
      ]),
      /MEDIA_NOT_READY/,
    );
    await assert.rejects(
      db.query("select public.finish_media_deletion($1,$2,$3)", [
        sid,
        aid,
        owner,
      ]),
      /MEDIA_UNAVAILABLE/,
    );
    await db.query("select public.begin_media_deletion($1,$2,$3)", [
      sid,
      aid,
      owner,
    ]);
    await assert.rejects(
      db.query("update public.media_assets set status='ready' where id=$1", [
        aid,
      ]),
      /MEDIA_UNAVAILABLE/,
    );
    await db.query("select public.fail_media_upload($1,$2,$3)", [
      sid,
      aid,
      owner,
    ]);
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select status from public.media_assets where id=$1",
          [aid],
        )
      ).rows[0].status,
      "deleting",
    );
    await db.exec(authenticate());
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('site-media',$1)",
        [`${prefix}/1280.webp`],
      ),
      /row-level security/,
    );
    await db.exec(service);
    await assert.rejects(
      db.query("select public.complete_media_upload($1,$2,$3,$4)", [
        sid,
        aid,
        owner,
        JSON.stringify(manifest),
      ]),
      /MEDIA_UNAVAILABLE/,
    );
    await assert.rejects(
      db.query("select public.finish_media_deletion($1,$2,$3)", [
        sid,
        aid,
        owner,
      ]),
      /MEDIA_REMAIN/,
    );
    await db.query("delete from storage.objects where name=$1", [
      `${prefix}/640.webp`,
    ]);
    await db.query("select public.finish_media_deletion($1,$2,$3)", [
      sid,
      aid,
      owner,
    ]);
    await db.query("select public.finish_media_deletion($1,$2,$3)", [
      sid,
      aid,
      owner,
    ]);
    await assert.rejects(
      db.query("select public.complete_media_upload($1,$2,$3,$4)", [
        sid,
        aid,
        owner,
        JSON.stringify(manifest),
      ]),
      /MEDIA_UNAVAILABLE/,
    );
  } finally {
    await db.close();
  }
});

test("expired and failed uploads are cleaned by full prefix; leases, quotas and soft delete gate writes", async () => {
  const db = new PGlite();
  try {
    await setupMediaDatabase((sql) => db.exec(sql));
    await db.query(
      "select public.create_owned_site($1,'Test',$2::text,$2::uuid,$3)",
      [owner, sid, JSON.stringify({ ...createDemo(), id: sid })],
    );
    await db.query("select public.reserve_media_upload($1,$2,$3,$4)", [
      sid,
      owner,
      aid,
      `${prefix}/original`,
    ]);
    await db.query(
      "update public.media_assets set upload_expires_at=clock_timestamp()-interval '1 second' where id=$1",
      [aid],
    );
    await db.exec(authenticate());
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('site-media',$1)",
        [`${prefix}/640.webp`],
      ),
      /row-level security/,
    );
    await db.exec(service);
    await assert.rejects(
      db.query("select public.complete_media_upload($1,$2,$3,$4)", [
        sid,
        aid,
        owner,
        JSON.stringify(manifest),
      ]),
      /MEDIA_UNAVAILABLE/,
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('site-media',$1),('site-media',$2)",
      [`${prefix}/640.webp`, `${prefix}/1280.webp`],
    );
    assert.deepEqual(
      (
        await db.query("select * from public.media_cleanup_candidates($1,$2)", [
          sid,
          owner,
        ])
      ).rows,
      [{ id: aid }],
    );
    assert.equal(
      (
        await db.query(
          "select * from public.begin_media_deletion($1,$2,$3,true)",
          [sid, aid, owner],
        )
      ).rows.length,
      2,
    );
    // Reserve capacity includes errors and deletion reservations, not only ready images.
    for (let n = 2; n <= 100; n++)
      await db.query(
        "insert into public.media_assets(site_id,status,original_path) values($1,'error',$2)",
        [sid, `error-${n}`],
      );
    const second = "50000000-0000-4000-8000-000000000002";
    await assert.rejects(
      db.query("select public.reserve_media_upload($1,$2,$3,$4)", [
        sid,
        owner,
        second,
        `${sid}/${second}/${"b".repeat(64)}/original`,
      ]),
      /MEDIA_LIBRARY_FULL/,
    );
    await db.query("delete from public.media_assets where status='error'");
    for (let n = 2; n <= 6; n++) {
      const id = `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
      await db.query("select public.reserve_media_upload($1,$2,$3,$4)", [
        sid,
        owner,
        id,
        `${sid}/${id}/${"b".repeat(64)}/original`,
      ]);
    }
    const extra = "50000000-0000-4000-8000-000000000007";
    await assert.rejects(
      db.query("select public.reserve_media_upload($1,$2,$3,$4)", [
        sid,
        owner,
        extra,
        `${sid}/${extra}/${"b".repeat(64)}/original`,
      ]),
      /MEDIA_UPLOAD_LIMIT/,
    );
    await db.query("select public.soft_delete_site($1,$2)", [sid, owner]);
    await db.exec(authenticate());
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('site-media',$1)",
        [`${sid}/${second}/${"b".repeat(64)}/640.webp`],
      ),
      /row-level security/,
    );
    assert.deepEqual(
      (await db.query("select id from public.media_assets")).rows,
      [],
    );
  } finally {
    await db.close();
  }
});
