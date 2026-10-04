import { rsvpSchema } from "@invitations/domain/guest";
import {
  defaultQuestions,
  guestDetailsSchema,
} from "@invitations/domain/operations";
import { z } from "zod";
import {
  allowed,
  authDb,
  check,
  content,
  context,
  db,
  endpoint,
  grant,
  GuestError,
  json,
  limit,
  session,
  unlock,
} from "../../../../../lib/server";
const readContext = (r: Request) => {
  const parts = new URL(r.url).pathname.split("/");
  return context(parts[3], parts[4]);
};
export const GET = endpoint(async (request) => {
  const ctx = await readContext(request);
  if (!(await allowed(ctx))) {
    return {
      mode: ctx.site.access_mode,
      authorized: false,
      requiresLink: ctx.requiresSession && ctx.site.access_mode !== "email",
    };
  }
  const result = await content(ctx);
  const eventIds = result.config.events.map((e) => e.id);
  const { data: answers, error } =
    ctx.invitation && eventIds.length
      ? await db()
          .from("rsvp_answers")
          .select("guest_id,event_id,attending")
          .eq("site_id", ctx.site.id)
          .eq("invitation_id", ctx.invitation.id)
          .in("event_id", eventIds)
      : { data: [], error: null };
  check(error);
  return {
    authorized: true,
    mode: ctx.site.access_mode,
    config: result.config,
    invitation: ctx.invitation
      ? {
          label: ctx.invitation.label,
          guests: ctx.invitation.guests,
          revision: ctx.invitation.rsvp_revision,
          note: ctx.invitation.note,
          details: Object.fromEntries(
            ctx.invitation.guests.map((g) => {
              const detail = ctx.invitation?.guest_details?.[g.id] || {};
              const questions = ctx.site.rsvp_questions || defaultQuestions;
              return [
                g.id,
                Object.fromEntries(
                  Object.entries(detail).filter(
                    ([key]) => questions[key as keyof typeof questions],
                  ),
                ),
              ];
            }),
          ),
          answers: answers || [],
        }
      : null,
    questions: ctx.site.rsvp_questions || defaultQuestions,
    deadline: ctx.site.rsvp_deadline,
    closed:
      !!ctx.site.rsvp_deadline &&
      new Date(ctx.site.rsvp_deadline).getTime() < Date.now(),
  };
});
export const POST = endpoint(async (request) => {
  const ctx = await readContext(request);
  const body = z
    .object({
      action: z.enum(["code", "otp-send", "otp-verify", "rsvp"]),
      payload: z.unknown(),
    })
    .parse(await json(request));
  if (body.action === "code") {
    await limit(request, `code:${ctx.site.id}`);
    if (ctx.requiresSession)
      throw new GuestError(401, "Otwórz oryginalny link zaproszenia");
    await unlock(
      ctx,
      z.object({ code: z.string().max(128) }).parse(body.payload).code,
    );
    return { ok: true };
  }
  if (body.action.startsWith("otp-")) {
    if (ctx.site.access_mode !== "email")
      throw new GuestError(400, "Logowanie e-mail nie jest włączone");
    const p = z
      .object({
        email: z.email().transform((s) => s.toLowerCase()),
        token: z
          .string()
          .regex(/^\d{6,10}$/)
          .optional(),
      })
      .parse(body.payload);
    await limit(
      request,
      `${body.action}:${ctx.site.id}:${p.email}`,
      body.action === "otp-send" ? 3 : 10,
    );
    const { data: matching, error } = await db()
      .from("invitations")
      .select("id")
      .eq("site_id", ctx.site.id)
      .eq("revoked", false)
      .contains("emails", [p.email]);
    check(error);
    const eligible = ctx.invitation
      ? ctx.invitation.emails.includes(p.email)
      : !!matching?.length;
    const auth = authDb();
    if (body.action === "otp-send") {
      if (eligible) {
        const { error: sendError } = await auth.auth.signInWithOtp({
          email: p.email,
          options: { shouldCreateUser: true },
        });
        if (sendError)
          throw new GuestError(
            503,
            "Nie udało się wysłać kodu. Spróbuj ponownie później.",
          );
      }
      return {
        ok: true,
        message: "Jeżeli adres ma dostęp, otrzyma kod logowania.",
      };
    }
    if (!p.token || !eligible)
      throw new GuestError(401, "Nieprawidłowy kod lub brak dostępu");
    const { data: verified, error: verifyError } = await auth.auth.verifyOtp({
      email: p.email,
      token: p.token,
      type: "email",
    });
    if (verifyError || verified.user?.email?.toLowerCase() !== p.email)
      throw new GuestError(401, "Nieprawidłowy kod lub brak dostępu");
    // Do not send Supabase tokens to the guest. Only issue a scoped, revocable cookie.
    if (verified.session) await auth.auth.signOut({ scope: "local" });
    if (ctx.invitation) {
      await grant(ctx, p.email);
      return { ok: true };
    }
    const links = [];
    for (const row of matching || []) {
      const individual = await context("v", row.id);
      if (!individual.invitation?.emails.includes(p.email)) continue;
      await grant(individual, p.email);
      links.push({ href: `/v/${row.id}`, label: individual.invitation.label });
    }
    return { ok: true, links };
  }
  await limit(request, `rsvp:${ctx.site.id}`, 60);
  if (!ctx.invitation || !(await allowed(ctx)))
    throw new GuestError(401, "Brak dostępu do odpowiedzi");
  if (
    ctx.site.access_mode === "public" &&
    !ctx.requiresSession &&
    !(await session(ctx))
  )
    await grant(ctx);
  const active = await session(ctx);
  if (!active) throw new GuestError(401, "Dostęp wygasł");
  const p = rsvpSchema
    .extend({ details: guestDetailsSchema.optional() })
    .parse(body.payload);
  const { data, error } = await db().rpc(
    p.details ? "save_rsvp_with_details" : "save_rsvp",
    {
      sid: ctx.site.id,
      iid: ctx.invitation.id,
      expected_revision: p.revision,
      answers: p.answers,
      message: p.note,
      ...(p.details ? { details: p.details } : {}),
      session_hash: active.token_hash,
    },
  );
  check(error);
  return { revision: data };
});
