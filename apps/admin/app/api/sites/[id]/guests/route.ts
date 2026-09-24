import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { siteConfigSchema } from "@invitations/domain";
import { guestContent, rsvpSchema } from "@invitations/domain/guest";
import {
  api,
  checkDb,
  readJson,
  requireSite,
  required,
  serviceDb,
} from "../../../../../lib/server";
import { digest, hashCode } from "@invitations/domain/access-code";

const idFrom = (r: Request) => new URL(r.url).pathname.split("/")[3]!;
async function allRows<T>(
  read: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const page = await read(from, from + 499);
    checkDb(page.error);
    rows.push(...(page.data || []));
    if ((page.data?.length || 0) < 500) return rows;
  }
}
export const GET = api(async (request) => {
  const { site } = await requireSite(idFrom(request));
  const db = serviceDb();
  const [invitations, answers, release] = await Promise.all([
    allRows((from, to) =>
      db
        .from("invitations")
        .select(
          "id,label,variant_id,emails,guests,revoked,version,rsvp_revision,note",
        )
        .eq("site_id", site.id)
        .order("id")
        .range(from, to),
    ),
    allRows((from, to) =>
      db
        .from("rsvp_answers")
        .select("invitation_id,guest_id,event_id,attending")
        .eq("site_id", site.id)
        .order("invitation_id")
        .order("guest_id")
        .order("event_id")
        .range(from, to),
    ),
    site.published_release_id
      ? db
          .from("releases")
          .select("config")
          .eq("site_id", site.id)
          .eq("id", site.published_release_id)
          .single()
      : db.from("drafts").select("config").eq("site_id", site.id).single(),
  ]);
  checkDb(release.error);
  const config = release.data
    ? siteConfigSchema.parse(release.data.config)
    : null;
  return {
    site,
    variants: config?.variants.map(({ id, label }) => ({ id, label })) || [],
    url: new URL(`/s/${site.public_slug}`, required("SITE_URL")).href,
    invitations: invitations.map((i) => ({
      ...i,
      events:
        site.published_release_id &&
        config &&
        config.variants.some((v) => v.id === i.variant_id)
          ? guestContent(config, i.variant_id).events.map((e) => ({
              id: e.id,
              title: e.title,
            }))
          : [],
    })),
    answers,
  };
});
export const POST = api(async (request) => {
  const { site, user } = await requireSite(idFrom(request));
  const body = z
    .object({
      action: z.enum([
        "settings",
        "unpublish",
        "create",
        "update",
        "revoke",
        "rotate",
        "rsvp",
      ]),
      payload: z.unknown(),
    })
    .parse(await readJson(request));
  const db = serviceDb();
  if (body.action === "settings") {
    const p = z
      .object({
        mode: z.enum(["public", "code", "email"]),
        code: z.string().min(8).max(128).optional(),
        variant: z.string().min(1).max(64),
        deadline: z.iso.datetime().nullable(),
        version: z.number().int().positive(),
      })
      .parse(body.payload);
    const { error } = await db.rpc("configure_access", {
      sid: site.id,
      actor: user.id,
      mode: p.mode,
      code_hash: p.code ? await hashCode(p.code) : null,
      variant: p.variant,
      deadline: p.deadline,
      expected_version: p.version,
    });
    checkDb(error);
    return { saved: true };
  }
  if (body.action === "unpublish") {
    const { error } = await db.rpc("unpublish_content", {
      sid: site.id,
      actor: user.id,
    });
    checkDb(error);
    return { saved: true };
  }
  if (body.action === "rsvp") {
    const p = rsvpSchema.extend({ id: z.uuid() }).parse(body.payload);
    const { data, error } = await db.rpc("save_rsvp", {
      sid: site.id,
      iid: p.id,
      actor: user.id,
      expected_revision: p.revision,
      answers: p.answers,
      message: p.note,
    });
    checkDb(error);
    return { revision: data };
  }
  const token = randomBytes(32).toString("base64url");
  // Validate the destination before committing a newly generated invitation.
  const url = ["create", "rotate"].includes(body.action)
    ? new URL(`/i/${token}`, required("SITE_URL")).href
    : null;
  let id: string, payload: unknown;
  if (body.action === "update") {
    const p = z
      .object({
        id: z.uuid(),
        version: z.number().int().positive(),
        label: z.string().trim().min(1).max(200),
        variantId: z.string().min(1).max(64),
        emails: z.array(z.email().transform((s) => s.toLowerCase())).max(10),
      })
      .parse(body.payload);
    id = p.id;
    payload = p;
  } else if (body.action === "create") {
    const p = z
      .object({
        label: z.string().trim().min(1).max(200),
        variantId: z.string().min(1).max(64),
        emails: z.array(z.email().transform((s) => s.toLowerCase())).max(10),
        names: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
      })
      .parse(body.payload);
    id = randomUUID();
    payload = {
      ...p,
      guests: p.names.map((name) => ({ id: randomUUID(), name })),
      tokenHash: digest(token),
    };
  } else {
    id = z.object({ id: z.uuid() }).parse(body.payload).id;
    payload = { tokenHash: digest(token) };
  }
  const { error } = await db.rpc("manage_invitation", {
    sid: site.id,
    actor: user.id,
    operation: body.action,
    iid: id,
    payload,
  });
  checkDb(error);
  return {
    id,
    url,
  };
});
