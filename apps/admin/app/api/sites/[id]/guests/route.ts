import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  invitationTokenUrl,
  publicSiteUrl,
  siteConfigSchema,
} from "@invitations/domain";
import { guestContent, rsvpSchema } from "@invitations/domain/guest";
import {
  invitationDisplayName,
  invitationInputSchema,
} from "@invitations/domain/invitation";
import {
  rsvpQuestionsListSchema,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";
import { readAllPages } from "@invitations/domain/hybrid-rsvp";
import { digest, hashCode } from "@invitations/domain/access-code";
import {
  api,
  checkDb,
  readJson,
  requireSite,
  required,
  serviceDb,
} from "../../../../../lib/server";

const idFrom = (r: Request) => new URL(r.url).pathname.split("/")[3]!;

export const GET = api(async (request) => {
  const { site } = await requireSite(idFrom(request));
  const db = serviceDb();
  const [invitations, answers, questionsRes, qAnswers, draftRes, releaseRes] =
    await Promise.all([
      readAllPages(
        (from, to) =>
          db
            .from("invitations")
            .select(
              "id,group_name,variant_id,revoked,version,rsvp_revision,note,short_code,origin,review_status,invitation_guests(id,kind,name,position)",
            )
            .eq("site_id", site.id)
            .order("id")
            .range(from, to),
        checkDb,
      ),
      readAllPages(
        (from, to) =>
          db
            .from("attendances")
            .select("invitation_id,guest_id,event_id,attending")
            .eq("site_id", site.id)
            .order("invitation_id")
            .order("guest_id")
            .order("event_id")
            .range(from, to),
        checkDb,
      ),
      db
        .from("rsvp_questions")
        .select(
          "id,scope,type,label,help,required,allow_other,options,variant_ids,preset_key",
        )
        .eq("site_id", site.id)
        .order("position"),
      readAllPages(
        (from, to) =>
          db
            .from("rsvp_question_answers")
            .select("question_id,invitation_id,guest_id,value")
            .eq("site_id", site.id)
            .order("question_id")
            .order("invitation_id")
            .range(from, to),
        checkDb,
      ),
      db.from("drafts").select("config").eq("site_id", site.id).single(),
      site.published_release_id
        ? db
            .from("releases")
            .select("config")
            .eq("site_id", site.id)
            .eq("id", site.published_release_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
    ]);

  checkDb(questionsRes.error);
  checkDb(draftRes.error);
  checkDb(releaseRes.error);
  const draftConfig = draftRes.data
    ? siteConfigSchema.parse(draftRes.data.config)
    : null;
  const releaseConfig = releaseRes.data
    ? siteConfigSchema.parse(releaseRes.data.config)
    : null;
  const config = releaseConfig || draftConfig;
  const variantMap = new Map<string, string>();
  for (const v of draftConfig?.variants || []) variantMap.set(v.id, v.label);
  for (const v of releaseConfig?.variants || []) {
    if (!variantMap.has(v.id)) variantMap.set(v.id, v.label);
  }
  const variants = Array.from(variantMap, ([id, label]) => ({ id, label }));

  const questions: RsvpQuestion[] = (questionsRes.data || []).map((q) => ({
    id: q.id as string,
    scope: q.scope as RsvpQuestion["scope"],
    type: q.type as RsvpQuestion["type"],
    label: q.label as string,
    help: (q.help as string | null) ?? null,
    required: Boolean(q.required),
    allowOther: Boolean(q.allow_other),
    options: (q.options as RsvpQuestion["options"]) || [],
    variantIds: (q.variant_ids as string[]) || [],
    presetKey: (q.preset_key as RsvpQuestion["presetKey"]) ?? null,
  }));

  return {
    site,
    variants,
    locale: config?.locale || "pl-PL",
    displayName: config?.identity.displayName || site.name,
    url: publicSiteUrl(site.id, required("SITE_URL")),
    invitations: invitations.map((raw) => {
      const { invitation_guests, ...rest } = raw as typeof raw & {
        invitation_guests?: {
          id: string;
          kind: "named" | "companion";
          name: string | null;
          position: number;
        }[];
      };
      const guests = [...(invitation_guests || [])]
        .sort((a, b) => a.position - b.position)
        .map(({ id, kind, name }) => ({ id, kind, name }));
      return {
        ...rest,
        guests,
        events:
          site.published_release_id &&
          config &&
          config.variants.some((v) => v.id === rest.variant_id)
            ? guestContent(config, rest.variant_id).events.map((e) => ({
                id: e.id,
                title: e.title,
              }))
            : [],
      };
    }),
    answers,
    questions,
    questionAnswers: qAnswers.map((a) => ({
      questionId: a.question_id as string,
      invitationId: a.invitation_id as string,
      guestId: (a.guest_id as string | null) ?? null,
      value: a.value,
    })),
  };
});

export const POST = api(async (request) => {
  const { site, user } = await requireSite(idFrom(request));
  const body = z
    .object({
      action: z.enum([
        "settings",
        "rsvp-options",
        "unpublish",
        "create",
        "update",
        "convert-companion",
        "revoke",
        "rotate",
        "rsvp",
        "import",
        "save-questions",
        "approve-pending",
        "merge-pending",
      ]),
      payload: z.unknown(),
    })
    .parse(await readJson(request));
  const db = serviceDb();

  if (body.action === "save-questions") {
    const p = z
      .object({
        questions: rsvpQuestionsListSchema,
        version: z.number().int().positive(),
      })
      .parse(body.payload);
    const { error } = await db.rpc("manage_rsvp_questions", {
      sid: site.id,
      actor: user.id,
      questions: p.questions,
      expected_version: p.version,
    });
    checkDb(error);
    return { saved: true };
  }

  if (body.action === "rsvp-options") {
    const p = z
      .object({
        rsvpEnabled: z.boolean(),
        allowSelfRegistration: z.boolean(),
        version: z.number().int().positive(),
      })
      .parse(body.payload);
    const { error } = await db.rpc("configure_rsvp_options", {
      sid: site.id,
      actor: user.id,
      rsvp_on: p.rsvpEnabled,
      self_reg: p.allowSelfRegistration,
      expected_version: p.version,
    });
    checkDb(error);
    return { saved: true };
  }

  if (body.action === "approve-pending") {
    const p = z.object({ id: z.uuid() }).parse(body.payload);
    const { error } = await db.rpc("approve_pending_invitation", {
      sid: site.id,
      actor: user.id,
      iid: p.id,
    });
    checkDb(error);
    return { saved: true };
  }

  if (body.action === "merge-pending") {
    const p = z
      .object({
        pendingId: z.uuid(),
        targetId: z.uuid(),
        targetGuestId: z.uuid().nullable().optional(),
      })
      .parse(body.payload);
    const { error } = await db.rpc("merge_pending_invitation", {
      sid: site.id,
      actor: user.id,
      pending_iid: p.pendingId,
      target_iid: p.targetId,
      target_guest_id: p.targetGuestId ?? null,
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
      const guests = entry.guests.map((g) => ({
        id: g.id || randomUUID(),
        kind: g.kind,
        name: g.name,
      }));
      return {
        id,
        label: invitationDisplayName({ groupName: entry.groupName, guests }),
        url: invitationTokenUrl(token, required("SITE_URL")),
        payload: {
          groupName: entry.groupName ?? null,
          variantId: entry.variantId,
          guests,
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
    const shortCodeById = new Map<string, string>();
    if (data.created && entries.length) {
      const { data: createdRows, error: scError } = await db
        .from("invitations")
        .select("id,short_code")
        .eq("site_id", site.id)
        .in(
          "id",
          entries.map((e) => e.id),
        );
      checkDb(scError);
      for (const row of createdRows || []) {
        shortCodeById.set(row.id, row.short_code);
      }
    }
    return {
      imported: entries.length,
      alreadyImported: !data.created,
      links: data.created
        ? entries.map(({ id, label, url }) => ({
            id,
            label,
            url,
            shortCode: shortCodeById.get(id) ?? null,
          }))
        : [],
    };
  }

  if (body.action === "settings") {
    const p = z
      .object({
        mode: z.enum(["public", "code"]),
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
    const { data, error } = await db.rpc("save_guest_rsvp", {
      sid: site.id,
      iid: p.id,
      actor: user.id,
      expected_revision: p.revision,
      answers: p.answers,
      message: p.note,
      companion_names: p.companionNames ?? {},
      question_answers: p.questionAnswers ?? [],
    });
    checkDb(error);
    return { revision: data };
  }

  const token = randomBytes(32).toString("base64url");
  const url = ["create", "rotate"].includes(body.action)
    ? invitationTokenUrl(token, required("SITE_URL"))
    : null;
  let id: string;
  let payload: unknown;

  if (body.action === "update") {
    const p = invitationInputSchema
      .extend({
        id: z.uuid(),
        version: z.number().int().positive(),
      })
      .parse(body.payload);
    id = p.id;
    payload = {
      version: p.version,
      groupName: p.groupName ?? null,
      variantId: p.variantId,
      guests: p.guests.map((g) => ({
        id: g.id || randomUUID(),
        kind: g.kind,
        name: g.name,
      })),
    };
  } else if (body.action === "create") {
    const p = invitationInputSchema.parse(body.payload);
    id = randomUUID();
    payload = {
      groupName: p.groupName ?? null,
      variantId: p.variantId,
      guests: p.guests.map((g) => ({
        id: g.id || randomUUID(),
        kind: g.kind,
        name: g.name,
      })),
      tokenHash: digest(token),
    };
  } else if (body.action === "convert-companion") {
    const p = z
      .object({
        id: z.uuid(),
        version: z.number().int().positive(),
        guestId: z.uuid(),
        name: z.string().trim().min(1).max(200),
      })
      .parse(body.payload);
    id = p.id;
    payload = {
      version: p.version,
      guestId: p.guestId,
      name: p.name,
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

  let shortCode: string | null = null;
  if (body.action === "create" || body.action === "rotate") {
    const { data: invRow } = await db
      .from("invitations")
      .select("short_code")
      .eq("site_id", site.id)
      .eq("id", id)
      .maybeSingle();
    shortCode = invRow?.short_code ?? null;
  }

  return {
    id,
    url,
    shortCode,
  };
});
