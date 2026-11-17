import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { digest } from "@invitations/domain/access-code";
import {
  guestLookupSchema,
  rsvpSchema,
  selfRegisterSchema,
} from "@invitations/domain/guest";
import {
  allowed as defaultAllowed,
  check,
  clearLookupInvitationCookie,
  context,
  db as defaultDb,
  grant as defaultGrant,
  GuestError,
  readInvitationSession,
  session as defaultSession,
  setLookupInvitationCookie,
  unlock as defaultUnlock,
  type Context,
} from "./server";

export type GuestAction =
  "code" | "lookup" | "lookup-reset" | "self-register" | "rsvp";

export const SELF_REGISTER_NAMED_PLACEHOLDER =
  "00000000-0000-4000-8000-000000000001";
export const SELF_REGISTER_COMPANION_PLACEHOLDER =
  "00000000-0000-4000-8000-000000000002";

export type GuestActionDb = ReturnType<typeof defaultDb>;

export type GuestActionDeps = {
  db?: GuestActionDb;
  now?: () => number;
  request?: Request;
  limit?: (
    request: Request,
    key: string,
    max?: number,
    seconds?: number,
  ) => Promise<void>;
  grant?: (ctx: Context) => Promise<void>;
  unlock?: (ctx: Context, code: string) => Promise<void>;
  session?: (ctx: Context) => Promise<{ token_hash: string } | null>;
  allowed?: (ctx: Context) => Promise<boolean>;
  loadContext?: (invitationId: string) => Promise<Context>;
  setLookupCookie?: (siteId: string, invitationId: string) => Promise<void>;
  clearLookupCookie?: (siteId: string) => Promise<void>;
  readDeviceSession?: typeof readInvitationSession;
};

const codePayloadSchema = z.object({
  code: z.string().max(128),
});

export async function executeGuestAction(
  ctx: Context,
  action: GuestAction,
  payload: unknown,
  deps: GuestActionDeps = {},
) {
  const client = deps.db ?? defaultDb();
  const now = deps.now ?? (() => Date.now());
  const req = deps.request ?? new Request("http://localhost");
  const doGrant = deps.grant ?? defaultGrant;
  const doUnlock = deps.unlock ?? defaultUnlock;
  const getSession = deps.session ?? defaultSession;
  const isAllowed = deps.allowed ?? defaultAllowed;
  const loadContext = deps.loadContext ?? ((id: string) => context("v", id));
  const setLookup = deps.setLookupCookie ?? setLookupInvitationCookie;
  const clearLookup = deps.clearLookupCookie ?? clearLookupInvitationCookie;
  const checkDeviceSession = deps.readDeviceSession ?? readInvitationSession;

  const rateLimit =
    deps.limit ??
    (async (request: Request, key: string, max = 10, seconds = 600) => {
      // Vercel overwrites this header; local development deliberately shares a bucket.
      const ip = process.env.VERCEL
        ? request.headers.get("x-vercel-forwarded-for") || "unknown"
        : "local";
      for (const bucket of [`${key}:${ip}`, `global:${ip}`]) {
        const { data, error } = await client.rpc("consume_access_attempt", {
          attempt_key: digest(bucket),
          max_attempts: bucket.startsWith("global:") ? 100 : max,
          window_seconds: seconds,
        });
        check(error);
        if (!data)
          throw new GuestError(429, "Zbyt wiele prób. Spróbuj później.");
      }
    });

  if (action === "code") {
    await rateLimit(req, `code:${ctx.site.id}`);
    if (ctx.requiresSession)
      throw new GuestError(401, "Otwórz oryginalny link zaproszenia");
    const { code } = codePayloadSchema.parse(payload);
    await doUnlock(ctx, code);
    return { ok: true };
  }

  if (action === "lookup-reset") {
    await clearLookup(ctx.site.id);
    return { ok: true };
  }

  if (action === "lookup") {
    await rateLimit(req, `lookup:${ctx.site.id}`, 30, 600);
    if (!(await isAllowed(ctx))) {
      throw new GuestError(401, "Brak dostępu do strony");
    }
    if (!ctx.site.rsvp_enabled) {
      return { status: "not_found" as const };
    }
    const p = guestLookupSchema.parse(payload);
    const { data, error } = await client.rpc("lookup_guest_invitation", {
      sid: ctx.site.id,
      query_text: p.query,
      disambiguator: p.disambiguator ?? null,
      session_hash: null,
    });
    check(error);
    const result = (data || { status: "not_found" }) as {
      status: "not_found" | "ambiguous" | "locked" | "matched";
      invitationId?: string;
    };

    if (result.status === "locked" && result.invitationId) {
      const individual = await loadContext(result.invitationId);
      const deviceSession = await checkDeviceSession(
        individual.site,
        individual.invitation,
      );
      if (deviceSession) {
        await setLookup(ctx.site.id, result.invitationId);
        return { status: "matched" as const };
      }
      return { status: "locked" as const };
    }

    if (result.status === "matched" && result.invitationId) {
      const individual = await loadContext(result.invitationId);
      await doGrant(individual);
      await setLookup(ctx.site.id, result.invitationId);
      return { status: "matched" as const };
    }

    return { status: result.status };
  }

  if (action === "self-register") {
    await rateLimit(req, `self-register:${ctx.site.id}`, 5, 600);
    if (!(await isAllowed(ctx))) {
      throw new GuestError(401, "Brak dostępu do strony");
    }
    if (!ctx.site.rsvp_enabled) {
      throw new GuestError(409, "Potwierdzanie obecności jest wyłączone.");
    }
    if (!ctx.site.allow_self_registration) {
      throw new GuestError(403, "Zgłoszenia spoza listy są wyłączone.");
    }
    if (ctx.site.rsvp_deadline && now() > Date.parse(ctx.site.rsvp_deadline)) {
      throw new GuestError(409, "Termin odpowiedzi minął.");
    }

    const p = selfRegisterSchema.parse(payload);
    const newInvId = randomUUID();
    const rawToken = randomBytes(24).toString("base64url");

    const { error: createError } = await client.rpc(
      "create_self_registered_invitation",
      {
        sid: ctx.site.id,
        iid: newInvId,
        guest_name: p.name,
        token_hash: digest(rawToken),
        with_companion: p.withCompanion,
        companion_name: p.withCompanion ? (p.companionName ?? null) : null,
        answers: p.rsvp.answers,
        message: p.rsvp.note,
        question_answers: p.rsvp.questionAnswers ?? [],
      },
    );
    check(createError);

    const createdCtx = await loadContext(newInvId);
    await doGrant(createdCtx);
    await setLookup(ctx.site.id, newInvId);
    return { ok: true, revision: 1 };
  }

  await rateLimit(req, `rsvp:${ctx.site.id}`, 60);
  if (!ctx.site.rsvp_enabled) {
    throw new GuestError(409, "Potwierdzanie obecności jest wyłączone.");
  }
  if (!ctx.invitation || !(await isAllowed(ctx)))
    throw new GuestError(401, "Brak dostępu do odpowiedzi");
  if (
    ctx.site.access_mode === "public" &&
    !ctx.requiresSession &&
    !(await getSession(ctx))
  )
    await doGrant(ctx);
  const active = await getSession(ctx);
  if (!active) throw new GuestError(401, "Dostęp wygasł");
  if (ctx.site.rsvp_deadline && now() > Date.parse(ctx.site.rsvp_deadline))
    throw new GuestError(409, "Termin odpowiedzi minął.");

  const p = rsvpSchema.parse(payload);

  const { data, error } = await client.rpc("save_guest_rsvp", {
    sid: ctx.site.id,
    iid: ctx.invitation.id,
    expected_revision: p.revision,
    answers: p.answers,
    message: p.note,
    companion_names: p.companionNames ?? {},
    question_answers: p.questionAnswers ?? [],
    session_hash: active.token_hash,
  });
  check(error);
  return { revision: data };
}
