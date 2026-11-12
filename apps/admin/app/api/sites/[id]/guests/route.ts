import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  invitationTokenUrl,
  publicSiteUrl,
  siteConfigSchema,
} from "@invitations/domain";
import { guestContent, rsvpSchema } from "@invitations/domain/guest";
import {
  api,
  checkDb,
  readJson,
  requireSite,
  required,
  serviceDb,
  HttpError,
} from "../../../../../lib/server";
import {
  invitationInputSchema,
  questionSettingsSchema,
  guestDetailsSchema,
} from "@invitations/domain/operations";
import { readAllPages } from "@invitations/email";
import { digest, hashCode } from "@invitations/domain/access-code";

const idFrom = (r: Request) => new URL(r.url).pathname.split("/")[3]!;
export const GET = api(async (request) => {
  const { site } = await requireSite(idFrom(request));
  const db = serviceDb();
  const [invitations, answers, deliveries, release] = await Promise.all([
    readAllPages(
      (from, to) =>
        db
          .from("invitations")
          .select(
            "id,label,variant_id,emails,guests,revoked,version,rsvp_revision,note,archived_guests,guest_details,allow_plus_one,plus_one",
          )
          .eq("site_id", site.id)
          .order("id")
          .range(from, to),
      checkDb,
    ),
    readAllPages(
      (from, to) =>
        db
          .from("rsvp_answers")
          .select("invitation_id,guest_id,event_id,attending")
          .eq("site_id", site.id)
          .order("invitation_id")
          .order("guest_id")
          .order("event_id")
          .range(from, to),
      checkDb,
    ),
    readAllPages<{ invitation_id: string; created_at: string }>(
      (from, to) =>
        db
          .from("email_deliveries")
          .select("invitation_id,created_at")
          .eq("site_id", site.id)
          .eq("kind", "invitation")
          .eq("status", "sent")
          .order("created_at", { ascending: false })
          .range(from, to),
      checkDb,
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
  const sentAtByInvitation = new Map<string, string>();
  for (const delivery of deliveries) {
    if (!sentAtByInvitation.has(delivery.invitation_id)) {
      sentAtByInvitation.set(delivery.invitation_id, delivery.created_at);
    }
  }
  return {
    site,
    variants: config?.variants.map(({ id, label }) => ({ id, label })) || [],
    url: publicSiteUrl(site.id, required("SITE_URL")),
    invitations: invitations.map((i) => ({
      ...i,
      invitation_sent_at: sentAtByInvitation.get(i.id) ?? null,
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
        "import",
        "questions",
      ]),
      payload: z.unknown(),
    })
    .parse(await readJson(request));
  const db = serviceDb();
  if (body.action === "questions") {
    const p = z
      .object({
        questions: questionSettingsSchema,
        version: z.number().int().positive(),
      })
      .parse(body.payload);
    const { error } = await db.rpc("configure_questions", {
      sid: site.id,
      actor: user.id,
      questions: p.questions,
      expected_version: p.version,
    });
    checkDb(error);
    return { saved: true };
  }
  if (body.action === "import") {
    const p = z
      .object({
        requestId: z.uuid(),
        entries: z.array(invitationInputSchema).min(1).max(200),
      })
      .parse(body.payload);
    const entries = p.entries.map((entry) => {
      const token = randomBytes(32).toString("base64url");
      const id = randomUUID();
      return {
        id,
        label: entry.label,
        url: invitationTokenUrl(token, required("SITE_URL")),
        payload: {
          ...entry,
          guests: entry.names.map((name) => ({ id: randomUUID(), name })),
          tokenHash: digest(token),
        },
      };
    });
    const { data, error } = await db.rpc("import_guests", {
      sid: site.id,
      actor: user.id,
      request_id: p.requestId,
      entries: entries.map(({ id, payload }) => ({ id, payload })),
    });
    checkDb(error);
    return {
      imported: entries.length,
      alreadyImported: !data.created,
      links: data.created
        ? entries.map(({ label, url }) => ({ label, url }))
        : [],
    };
  }
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
    const p = rsvpSchema
      .extend({ id: z.uuid(), details: guestDetailsSchema.optional() })
      .parse(body.payload);
    const { data, error } = await db.rpc("save_guest_rsvp", {
      sid: site.id,
      iid: p.id,
      actor: user.id,
      expected_revision: p.revision,
      answers: p.answers,
      message: p.note,
      details: p.details ?? null,
      plus_one_input: p.plusOne ?? null,
    });
    checkDb(error);
    return { revision: data };
  }
  const token = randomBytes(32).toString("base64url");
  // Validate the destination before committing a newly generated invitation.
  const url = ["create", "rotate"].includes(body.action)
    ? invitationTokenUrl(token, required("SITE_URL"))
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
        allowPlusOne: z.boolean().optional(),
        guests: z
          .array(
            z.object({
              id: z.uuid().optional(),
              name: z.string().trim().min(1).max(200),
            }),
          )
          .min(1)
          .max(20)
          .optional(),
      })
      .parse(body.payload);
    id = p.id;
    if (p.guests) {
      const { data: existing, error } = await db
        .from("invitations")
        .select("guests,archived_guests")
        .eq("site_id", site.id)
        .eq("id", p.id)
        .single();
      checkDb(error);
      if (!existing) throw new HttpError(404, "Nie znaleziono zaproszenia.");
      const known = [...existing.guests, ...existing.archived_guests] as {
        id: string;
        name: string;
      }[];
      if (
        p.guests.some(
          (person) => person.id && !known.some((old) => old.id === person.id),
        )
      )
        throw new HttpError(400, "Nieprawidłowa osoba w zaproszeniu.");
      payload = {
        ...p,
        guests: p.guests.map((person) => ({
          id: person.id || randomUUID(),
          name: person.name,
        })),
      };
    } else payload = p;
  } else if (body.action === "create") {
    const p = z
      .object({
        label: z.string().trim().min(1).max(200),
        variantId: z.string().min(1).max(64),
        emails: z.array(z.email().transform((s) => s.toLowerCase())).max(10),
        names: z.array(z.string().trim().min(1).max(200)).min(1).max(20),
        allowPlusOne: z.boolean().default(false),
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
