import { randomInt as nodeRandomInt } from "node:crypto";
import { z } from "zod";
import { digest } from "@invitations/domain/access-code";
import { buildOtpEmail } from "@invitations/domain/email";
import { rsvpSchema } from "@invitations/domain/guest";
import { guestDetailsSchema } from "@invitations/domain/operations";
import {
  sendEmail as defaultSendEmail,
  type SendEmailInput,
  type SendEmailResult,
} from "@invitations/email";
import {
  allowed as defaultAllowed,
  check,
  context,
  db as defaultDb,
  grant as defaultGrant,
  GuestError,
  required,
  session as defaultSession,
  unlock as defaultUnlock,
  type Context,
} from "./server";

export type GuestAction = "code" | "otp-send" | "otp-verify" | "rsvp";

export type GuestActionDb = ReturnType<typeof defaultDb>;

export type GuestActionDeps = {
  db?: GuestActionDb;
  sendEmail?: (input: SendEmailInput) => Promise<SendEmailResult>;
  now?: () => number;
  randomInt?: (min: number, max: number) => number;
  request?: Request;
  limit?: (
    request: Request,
    key: string,
    max?: number,
    seconds?: number,
  ) => Promise<void>;
  grant?: (ctx: Context, email?: string | null) => Promise<void>;
  unlock?: (ctx: Context, code: string) => Promise<void>;
  session?: (ctx: Context) => Promise<{ token_hash: string } | null>;
  allowed?: (ctx: Context) => Promise<boolean>;
  loadContext?: (invitationId: string) => Promise<Context>;
};

const codePayloadSchema = z.object({
  code: z.string().max(128),
});

const otpPayloadSchema = z.object({
  email: z.email().transform((s) => s.toLowerCase()),
  token: z
    .string()
    .regex(/^\d{6,10}$/)
    .optional(),
});

const rsvpPayloadSchema = rsvpSchema.extend({
  details: guestDetailsSchema.optional(),
});

const OTP_TTL_SECONDS = 900;

export async function executeGuestAction(
  ctx: Context,
  action: GuestAction,
  payload: unknown,
  deps: GuestActionDeps = {},
) {
  const client = deps.db ?? defaultDb();
  const send = deps.sendEmail ?? defaultSendEmail;
  const now = deps.now ?? (() => Date.now());
  const randInt = deps.randomInt ?? nodeRandomInt;
  const req = deps.request ?? new Request("http://localhost");
  const doGrant = deps.grant ?? defaultGrant;
  const doUnlock = deps.unlock ?? defaultUnlock;
  const getSession = deps.session ?? defaultSession;
  const isAllowed = deps.allowed ?? defaultAllowed;
  const loadContext = deps.loadContext ?? ((id: string) => context("v", id));

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

  if (action === "otp-send" || action === "otp-verify") {
    if (ctx.site.access_mode !== "email")
      throw new GuestError(400, "Logowanie e-mail nie jest włączone");

    const p = otpPayloadSchema.parse(payload);
    await rateLimit(
      req,
      `${action}:${ctx.site.id}:${p.email}`,
      action === "otp-send" ? 3 : 10,
    );

    const { data: matching, error } = await client
      .from("invitations")
      .select("id")
      .eq("site_id", ctx.site.id)
      .eq("revoked", false)
      .contains("emails", [p.email]);
    check(error);

    const eligible = ctx.invitation
      ? ctx.invitation.emails.includes(p.email)
      : !!matching?.length;

    if (action === "otp-send") {
      if (eligible) {
        const code = String(randInt(100000, 1000000));
        const codeHash = digest(`${ctx.site.id}:${p.email}:${code}`);
        const { error: otpError } = await client.rpc("create_guest_otp", {
          sid: ctx.site.id,
          target_email: p.email,
          code_hash: codeHash,
          ttl_seconds: OTP_TTL_SECONDS,
        });
        check(otpError);

        const { data: release, error: releaseError } = await client
          .from("releases")
          .select("config")
          .eq("site_id", ctx.site.id)
          .eq("id", ctx.site.published_release_id!)
          .maybeSingle();
        check(releaseError);

        const releaseConfig = release?.config as
          | { locale?: string; identity?: { displayName?: string } }
          | undefined;
        const locale = releaseConfig?.locale || "pl-PL";
        const displayName =
          releaseConfig?.identity?.displayName?.trim() || "Save Our Day";

        const message = buildOtpEmail({ locale, displayName, code });
        const result = await send({
          apiKey: required("RESEND_API_KEY"),
          from: required("MAIL_FROM"),
          to: p.email,
          subject: message.subject,
          text: message.text,
        });
        if (!result.ok) {
          throw new GuestError(
            503,
            "Nie udało się wysłać kodu. Spróbuj ponownie później.",
          );
        }
      }
      return {
        ok: true,
        message: "Jeżeli adres ma dostęp, otrzyma kod logowania.",
      };
    }

    if (!p.token || !eligible)
      throw new GuestError(401, "Nieprawidłowy kod lub brak dostępu");

    const codeHash = digest(`${ctx.site.id}:${p.email}:${p.token}`);
    const { data: verified, error: verifyError } = await client.rpc(
      "verify_guest_otp",
      {
        sid: ctx.site.id,
        target_email: p.email,
        code_hash: codeHash,
      },
    );
    check(verifyError);
    if (!verified)
      throw new GuestError(401, "Nieprawidłowy kod lub brak dostępu");

    if (ctx.invitation) {
      await doGrant(ctx, p.email);
      return { ok: true };
    }

    const links = [];
    for (const row of matching || []) {
      const individual = await loadContext(row.id);
      if (!individual.invitation?.emails.includes(p.email)) continue;
      await doGrant(individual, p.email);
      links.push({ href: `/v/${row.id}`, label: individual.invitation.label });
    }
    return { ok: true, links };
  }

  await rateLimit(req, `rsvp:${ctx.site.id}`, 60);
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
  if (
    ctx.site.rsvp_deadline &&
    now() > Date.parse(ctx.site.rsvp_deadline)
  )
    throw new GuestError(409, "Termin odpowiedzi minął.");

  const p = rsvpPayloadSchema.parse(payload);
  if (p.plusOne && !ctx.invitation.allow_plus_one) {
    throw new GuestError(409, "Odpowiedzi nie pasują do zaproszenia.");
  }

  const { data, error } = await client.rpc("save_guest_rsvp", {
    sid: ctx.site.id,
    iid: ctx.invitation.id,
    expected_revision: p.revision,
    answers: p.answers,
    message: p.note,
    details: p.details ?? null,
    plus_one_input: p.plusOne ?? null,
    session_hash: active.token_hash,
  });
  check(error);
  return { revision: data };
}
