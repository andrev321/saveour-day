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
  };
  let storedSession: unknown = null;
  let releaseReads = 0;
  const buckets: string[] = [];
  mock.method(
    globalThis,
    "fetch",
    async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(
        typeof input === "string" || input instanceof URL ? input : input.url,
      );
      const table = url.pathname.split("/").at(-1);
      let data: unknown;
      if (table === "sites") data = site;
      else if (table === "invitations")
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
      } else if (table === "otp") data = {};
      else if (table === "save_rsvp") {
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
    assert.notEqual(buckets[0], buckets[2]);
    site.access_mode = "public";
    jar.clear();
    const reply = await post("rsvp", { revision: 0, note: "", answers: [] });
    assert.equal(reply.status, 200);
    assert.deepEqual(await reply.json(), { revision: 1 });
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
  } finally {
    mock.restoreAll();
  }
});
