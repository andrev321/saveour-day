import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createDemo } from "../packages/domain/src/demo.ts";
import { hashCode } from "../packages/domain/src/access-code.ts";
import { mediaSchema } from "../packages/domain/src/index.ts";

test("real guest handlers gate content, scope sessions, filter RSVP and reject foreign media", async () => {
  const jar = new Map<string, { value: string }>();
  let cookieOptions: Record<string, unknown> = {};
  mock.module("server-only", { namedExports: {} });
  mock.module("next/headers", {
    namedExports: {
      cookies: async () => ({
        get: (key: string) => jar.get(key),
        set: (key: string, value: string, options: Record<string, unknown>) => {
          jar.set(key, { value });
          cookieOptions = options;
        },
      }),
    },
  });
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-public-key";
  process.env.SITE_URL = "https://invite.example.test";
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.MAIL_FROM = "noreply@example.test";
  const config = createDemo();
  config.media = [
    mediaSchema.parse({
      id: "photo",
      src: "/media/photo/main.webp",
      width: 100,
      height: 100,
    }),
  ];
  config.hero.mediaId = "photo";
  const site = {
    id: config.id,
    access_mode: "code",
    access_code_hash: await hashCode("family-code"),
    access_version: 1,
    published_release_id: "release",
    public_variant_id: config.defaultVariant,
    rsvp_deadline: null,
  };
  const invitation = {
    id: "30000000-0000-4000-8000-000000000001",
    site_id: site.id,
    variant_id: config.defaultVariant,
    emails: ["family@example.com"],
    guests: [],
    revoked: false,
    version: 1,
    rsvp_revision: 0,
    note: "",
    label: "Family",
    allow_plus_one: false,
    plus_one: null,
  };
  let storedSession: unknown = null;
  let storedOtpHash: string | null = null;
  let releaseReads = 0;
  let siteDeleted = false;
  const buckets: string[] = [];
  mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(
        typeof input === "string" || input instanceof URL ? input : input.url,
      );
      if (url.origin === "https://api.resend.com" && url.pathname === "/emails") {
        return Response.json({ id: "re_otp_1" });
      }
      const table = url.pathname.split("/").at(-1);
      let data: unknown;
      if (table === "sites") {
        assert.equal(url.searchParams.get("deleted_at"), "is.null");
        data = siteDeleted ? null : site;
      } else if (table === "invitations")
        data = url.searchParams.has("emails")
          ? [{ id: invitation.id }]
          : invitation;
      else if (table === "guest_sessions") {
        if (init?.method === "POST")
          storedSession = JSON.parse(String(init.body));
        data = storedSession;
      } else if (table === "releases") {
        releaseReads++;
        data = {
          config,
          asset_paths: {
            "/media/photo/main.webp": `${site.id}/photo/main.webp`,
          },
        };
      } else if (
        url.pathname ===
        `/storage/v1/object/site-media/${site.id}/photo/main.webp`
      ) {
        return new Response("private-image", {
          headers: { "Content-Type": "image/webp" },
        });
      } else if (table === "rsvp_answers") {
        assert.equal(
          url.searchParams.get("event_id"),
          `in.(${config.events.map((e) => e.id).join(",")})`,
        );
        data = [];
      } else if (table === "consume_access_attempt") {
        buckets.push(JSON.parse(String(init?.body)).attempt_key);
        data = true;
      } else if (table === "create_guest_otp") {
        storedOtpHash = JSON.parse(String(init?.body)).code_hash;
        data = null;
      } else if (table === "verify_guest_otp") {
        const payload = JSON.parse(String(init?.body));
        data = storedOtpHash !== null && payload.code_hash === storedOtpHash;
      } else if (table === "otp") data = {};
      else if (table === "save_guest_rsvp") {
        const payload = JSON.parse(String(init?.body));
        assert.equal(payload.iid, invitation.id);
        assert.equal(payload.sid, site.id);
        assert.equal(typeof payload.session_hash, "string");
        data = 1;
      } else throw new Error(`Unexpected external request: ${url.pathname}`);
      return Response.json(data);
    },
  );
  try {
    const { GET, POST } =
      await import("../apps/site/app/api/guest/[kind]/[key]/route.ts");
    const media =
      await import("../apps/site/app/api/media/[kind]/[key]/[asset]/[file]/route.ts");
    const url = `${process.env.SITE_URL}/api/guest/i/token`;
    const post = (
      action: string,
      payload: unknown,
      origin = process.env.SITE_URL!,
    ) =>
      POST(
        new Request(url, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({ action, payload }),
        }),
      );
    let response = await GET(new Request(url));
    assert.deepEqual(await response.json(), {
      mode: "code",
      authorized: false,
      requiresLink: false,
    });
    assert.equal(releaseReads, 0);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(
      (await post("code", { code: "family-code" }, "https://foreign.test"))
        .status,
      403,
    );
    assert.equal((await post("code", { code: "wrong" })).status, 401);
    assert.equal((await post("code", { code: "family-code" })).status, 200);
    assert.equal(cookieOptions.httpOnly, true);
    assert.equal(cookieOptions.sameSite, "lax");
    response = await GET(new Request(url));
    assert.equal((await response.json()).authorized, true);
    const photo = await media.GET(
      new Request(`${process.env.SITE_URL}/api/media/i/token/photo/main.webp`),
    );
    assert.equal(photo.status, 200);
    assert.equal(await photo.text(), "private-image");
    assert.equal(photo.headers.get("cache-control"), "private, no-store");
    assert.equal(
      (
        await media.GET(
          new Request(
            `${process.env.SITE_URL}/api/media/i/token/foreign/photo.webp`,
          ),
        )
      ).status,
      404,
    );
    site.access_version++;
    assert.equal(
      (await (await GET(new Request(url))).json()).authorized,
      false,
    );
    assert.equal(
      (
        await media.GET(
          new Request(
            `${process.env.SITE_URL}/api/media/i/token/foreign/photo.webp`,
          ),
        )
      ).status,
      401,
    );
    site.access_mode = "email";
    buckets.length = 0;
    assert.equal(
      (await post("otp-send", { email: "family@example.com" })).status,
      200,
    );
    assert.equal(
      (await post("otp-verify", { email: "family@example.com" })).status,
      401,
    );
    assert.equal(
      (await post("otp-verify", { email: "family@example.com", token: "000000" })).status,
      401,
    );
    assert.notEqual(buckets[0], buckets[2]);
    site.access_mode = "public";
    jar.clear();
    const forbiddenPlusOne = await post("rsvp", {
      revision: 0,
      note: "",
      answers: [],
      plusOne: { id: "50000000-0000-4000-8000-000000000001", name: "Gość +1" },
    });
    assert.equal(forbiddenPlusOne.status, 409);
    invitation.allow_plus_one = true;
    const reply = await post("rsvp", {
      revision: 0,
      note: "",
      answers: [],
      plusOne: { id: "50000000-0000-4000-8000-000000000001", name: "Gość +1" },
    });
    assert.equal(reply.status, 200);
    assert.deepEqual(await reply.json(), { revision: 1 });
    invitation.allow_plus_one = false;
    assert.equal(
      (
        await (
          await GET(
            new Request(`${process.env.SITE_URL}/api/guest/v/${invitation.id}`),
          )
        ).json()
      ).authorized,
      true,
    );
    jar.clear();
    const bindingGate = await (
      await GET(
        new Request(`${process.env.SITE_URL}/api/guest/v/${invitation.id}`),
      )
    ).json();
    assert.equal(bindingGate.authorized, false);
    assert.equal(bindingGate.requiresLink, true);
    invitation.revoked = true;
    assert.equal((await GET(new Request(url))).status, 404);
    invitation.revoked = false;
    siteDeleted = true;
    const readsBeforeDeletion = releaseReads;
    assert.equal((await GET(new Request(url))).status, 404);
    assert.equal(
      (await post("rsvp", { revision: 0, note: "", answers: [] })).status,
      404,
    );
    assert.equal(
      (
        await media.GET(
          new Request(
            `${process.env.SITE_URL}/api/media/i/token/photo/main.webp`,
          ),
        )
      ).status,
      404,
    );
    assert.equal(releaseReads, readsBeforeDeletion);
  } finally {
    mock.restoreAll();
  }
});

test("publish and previewEmailCampaign generate canonical /s/<site.id> URLs and guest context resolves both UUID and legacy public_slug", async () => {
  class HttpError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  const siteId = "20000000-0000-4000-8000-000000000099";
  const legacySlug = `anna-i-jan-${siteId}`;
  const config = createDemo();
  config.id = siteId;

  const queryFor = (table: string) => {
    const invitationRows = [
      {
        id: "30000000-0000-4000-8000-000000000001",
        label: "Nowakowie",
        version: 1,
        rsvp_revision: 0,
        variant_id: config.defaultVariant,
        guests: [{ id: "g1", name: "Jan" }],
        emails: ["jan@example.com"],
        allow_plus_one: false,
        plus_one: null,
      },
    ];
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      order: () => chain,
      single: async () => ({
        data: table === "releases" || table === "drafts" ? { config } : null,
        error: null,
      }),
      maybeSingle: async () => ({
        data: table === "releases" || table === "drafts" ? { config } : null,
        error: null,
      }),
      range: async (from: number) => ({
        data: table === "invitations" && from === 0 ? invitationRows : [],
        error: null,
      }),
    };
    return chain;
  };

  mock.module("server-only", { namedExports: {} });
  mock.module("../apps/admin/lib/media.ts", {
    namedExports: {
      validateMedia: async () => ({}),
    },
  });
  mock.module("../apps/admin/lib/server.ts", {
    namedExports: {
      HttpError,
      required: (name: string) => {
        assert.equal(name, "SITE_URL");
        return "https://invite.example.test";
      },
      checkDb: (err: { message: string } | null) => {
        if (err) throw new HttpError(409, err.message);
      },
      serviceDb: () => ({
        from: (table: string) => queryFor(table),
        rpc: async (fn: string, args: Record<string, unknown>) => {
          assert.equal(fn, "publish_content");
          assert.equal(args.sid, siteId);
          return { data: "release-1", error: null };
        },
      }),
    },
  });

  try {
    const { publish } = await import("../apps/admin/lib/publishing.ts");
    const published = await publish({ id: siteId }, "owner-1", 3);
    assert.deepEqual(published, {
      id: "release-1",
      url: `https://invite.example.test/s/${siteId}`,
    });

    const { previewEmailCampaign } = await import("../apps/admin/lib/emails.ts");
    const preview = await previewEmailCampaign({
      id: siteId,
      access_mode: "email",
      published_release_id: "release-1",
      rsvp_deadline: null,
    });
    assert.equal(preview.reminderRecipients.length, 1);
    assert.ok(
      preview.reminderRecipients[0]!.text.includes(
        `https://invite.example.test/s/${siteId}`,
      ),
    );

    // Also verify apps/site/lib/server.ts context("s", key) resolves UUID first, then falls back to public_slug
    const queriedFields: string[] = [];
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
      const url = new URL(
        typeof input === "string" || input instanceof URL ? input : input.url,
      );
      if (url.searchParams.has("id")) {
        queriedFields.push(`id:${url.searchParams.get("id")}`);
        if (url.searchParams.get("id") === `eq.${siteId}`) {
          return Response.json({
            id: siteId,
            published_release_id: "release-1",
            access_mode: "public",
            access_code_hash: null,
            access_version: 1,
            public_variant_id: config.defaultVariant,
            rsvp_deadline: null,
          });
        }
        return Response.json(null);
      }
      if (url.searchParams.has("public_slug")) {
        queriedFields.push(
          `public_slug:${url.searchParams.get("public_slug")}`,
        );
        return Response.json({
          id: siteId,
          published_release_id: "release-1",
          access_mode: "public",
          access_code_hash: null,
          access_version: 1,
          public_variant_id: config.defaultVariant,
          rsvp_deadline: null,
        });
      }
      return Response.json(null);
    });

    const { context } = await import("../apps/site/lib/server.ts");
    const byUuid = await context("s", siteId);
    assert.equal(byUuid.site.id, siteId);
    assert.deepEqual(queriedFields, [`id:eq.${siteId}`]);

    queriedFields.length = 0;
    const byLegacySlug = await context("s", legacySlug);
    assert.equal(byLegacySlug.site.id, siteId);
    assert.deepEqual(queriedFields, [`public_slug:eq.${legacySlug}`]);
  } finally {
    mock.restoreAll();
  }
});

test("rsvpSchema accepts optional and nullable plusOne and rejects invalid plusOne payloads", async () => {
  const { rsvpSchema } = await import("../packages/domain/src/guest.ts");
  const plusOneId = "40000000-0000-4000-8000-000000000002";

  const withPlusOne = rsvpSchema.parse({
    revision: 0,
    note: "",
    answers: [
      {
        guestId: plusOneId,
        eventId: "ceremony",
        attending: true,
      },
    ],
    plusOne: { id: plusOneId, name: "  Anna Nowak  " },
  });
  assert.deepEqual(withPlusOne.plusOne, { id: plusOneId, name: "Anna Nowak" });

  const clearedPlusOne = rsvpSchema.parse({
    revision: 1,
    note: "",
    answers: [],
    plusOne: null,
  });
  assert.equal(clearedPlusOne.plusOne, null);

  assert.throws(() =>
    rsvpSchema.parse({
      revision: 0,
      note: "",
      answers: [],
      plusOne: { id: "not-a-uuid", name: "Anna" },
    }),
  );
  assert.throws(() =>
    rsvpSchema.parse({
      revision: 0,
      note: "",
      answers: [],
      plusOne: { id: plusOneId, name: "   " },
    }),
  );
});


