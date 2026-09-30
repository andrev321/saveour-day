import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "pg";
import { createDemo } from "../packages/domain/src/demo.ts";
import {
  authenticate,
  owner,
  setupMediaDatabase,
  service,
} from "./helpers/media-database.ts";

// CI runs this against PostgreSQL, because PGlite cannot model independent sessions.
test(
  "PostgreSQL serializes Storage insertion, deletion, finalization and draft publication",
  { skip: !process.env.TEST_DATABASE_URL, timeout: 30000 },
  async () => {
    const clients = Array.from(
      { length: 4 },
      () => new Client({ connectionString: process.env.TEST_DATABASE_URL }),
    );
    const [observer, writer, deletion, finalizer] = clients;
    await Promise.all(clients.map((c) => c.connect()));
    async function waitForLock(client: Client) {
      const pid = (await client.query("select pg_backend_pid() as pid")).rows[0]
        .pid;
      return pid;
    }
    async function locked(pid: number) {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const { rows } = await observer.query(
          "select wait_event_type from pg_stat_activity where pid=$1",
          [pid],
        );
        if (rows[0]?.wait_event_type === "Lock") return;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.fail("operation did not wait on the parent lock");
    }
    async function create(n: number) {
      const sid = `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
      const aid = `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
      const prefix = `${sid}/${aid}/${"a".repeat(64)}`;
      const config = JSON.stringify({ ...createDemo(), id: sid });
      await observer.query(
        "select public.create_owned_site($1,'Test',$2::text,$2::uuid,$3)",
        [owner, sid, config],
      );
      await observer.query("select public.reserve_media_upload($1,$2,$3,$4)", [
        sid,
        owner,
        aid,
        `${prefix}/original`,
      ]);
      return { sid, aid, prefix, config };
    }
    const outstanding: Promise<unknown>[] = [];
    try {
      await setupMediaDatabase((sql) => observer.query(sql));
      await Promise.all(
        [writer, deletion, finalizer].map((c) => c.query(service)),
      );
      const deletionPid = await waitForLock(deletion),
        finalizerPid = await waitForLock(finalizer);
      const first = await create(1);
      await writer.query("begin");
      await writer.query(authenticate());
      await writer.query(
        "insert into storage.objects(bucket_id,name) values('site-media',$1)",
        [`${first.prefix}/640.webp`],
      );
      const deletingSite = deletion.query(
        "select public.soft_delete_site($1,$2)",
        [first.sid, owner],
      );
      outstanding.push(deletingSite);
      await locked(deletionPid);
      await writer.query("commit");
      await deletingSite;
      await assert.rejects(
        writer.query(
          "insert into storage.objects(bucket_id,name) values('site-media',$1)",
          [`${first.prefix}/1280.webp`],
        ),
        /row-level security/,
      );

      const second = await create(2);
      await observer.query(
        "update public.media_assets set upload_expires_at=clock_timestamp()-interval '1 second' where id=$1",
        [second.aid],
      );
      await deletion.query("begin");
      await deletion.query(
        "select public.begin_media_deletion($1,$2,$3,true)",
        [second.sid, second.aid, owner],
      );
      const finishing = finalizer.query(
        "select public.complete_media_upload($1,$2,$3,$4)",
        [
          second.sid,
          second.aid,
          owner,
          JSON.stringify({
            id: second.aid,
            src: `/media/${second.aid}/640.webp`,
            variants: [{ src: `/media/${second.aid}/640.webp` }],
          }),
        ],
      );
      // Attach rejection handling before committing the competing transaction.
      const refused = assert.rejects(finishing, /MEDIA_UNAVAILABLE/);
      outstanding.push(refused);
      await locked(finalizerPid);
      await deletion.query("commit");
      await refused;
      await observer.query("select public.finish_media_deletion($1,$2,$3)", [
        second.sid,
        second.aid,
        owner,
      ]);

      const third = await create(3);
      await writer.query(service);
      await writer.query("begin");
      await writer.query("select public.save_site_draft($1,$2,1,$3)", [
        third.sid,
        owner,
        third.config,
      ]);
      const publishing = deletion.query(
        "select public.publish_content($1,$2,2,$3,'{}')",
        [third.sid, owner, third.config],
      );
      outstanding.push(publishing);
      await locked(deletionPid);
      await writer.query("commit");
      await publishing;
      assert.equal(
        (
          await observer.query(
            "select revision from public.drafts where site_id=$1",
            [third.sid],
          )
        ).rows[0].revision,
        2,
      );
    } finally {
      await Promise.allSettled(clients.map((c) => c.query("rollback")));
      await Promise.allSettled(outstanding);
      await Promise.all(clients.map((c) => c.end()));
    }
  },
);
