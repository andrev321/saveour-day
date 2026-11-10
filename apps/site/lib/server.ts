import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { isSiteUuidKey, siteConfigSchema } from "@invitations/domain";
import { guestContent } from "@invitations/domain/guest";
import { digest, verifyCode } from "@invitations/domain/access-code";

export class GuestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new GuestError(503, "Usługa jest chwilowo niedostępna");
  return value;
}
export function db() {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function authDb() {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export function check(error: { message: string } | null) {
  if (!error) return;
  const messages: Record<string, string> = {
    REVISION_CONFLICT: "Odpowiedź zmieniła się w innej sesji. Odśwież stronę.",
    RSVP_CLOSED: "Termin odpowiedzi minął.",
    FORBIDDEN: "Dostęp wygasł. Otwórz zaproszenie ponownie.",
    UNPUBLISHED: "Strona nie jest dostępna.",
    INVALID_ANSWERS: "Odpowiedzi nie pasują do zaproszenia.",
    VARIANT_MISSING: "Wariant zaproszenia nie jest dostępny.",
  };
  for (const [key, message] of Object.entries(messages))
    if (error.message.includes(key))
      throw new GuestError(
        key === "FORBIDDEN" ? 401 : key === "UNPUBLISHED" ? 404 : 409,
        message,
      );
  throw new GuestError(
    503,
    "Nie udało się wykonać operacji. Spróbuj ponownie.",
  );
}
export type GuestRecord = {
  id: string;
  site_id: string;
  variant_id: string;
  emails: string[];
  guests: { id: string; name: string }[];
  revoked: boolean;
  version: number;
  rsvp_revision: number;
  note: string;
  label: string;
  guest_details?: import("@invitations/domain/operations").GuestDetails;
};
export type SiteRecord = {
  id: string;
  published_release_id: string | null;
  access_mode: "public" | "code" | "email";
  access_code_hash: string | null;
  access_version: number;
  public_variant_id: string;
  rsvp_deadline: string | null;
  rsvp_questions?: import("@invitations/domain/operations").QuestionSettings;
};
export async function context(kind: string, key: string) {
  if (
    !["s", "i", "v"].includes(kind) ||
    key.length > 200 ||
    (kind === "v" && !isSiteUuidKey(key))
  )
    throw new GuestError(404, "Nie znaleziono zaproszenia");
  const client = db();
  let invitation: GuestRecord | null = null;
  if (kind !== "s") {
    const result = await client
      .from("invitations")
      .select("*")
      .eq(kind === "v" ? "id" : "token_hash", kind === "v" ? key : digest(key))
      .maybeSingle();
    check(result.error);
    invitation = result.data;
    if (!invitation || invitation.revoked)
      throw new GuestError(404, "Zaproszenie jest niedostępne");
  }
  const findSite = async (field: "id" | "public_slug", value: string) => {
    const result = await client
      .from("sites")
      .select(
        "id,published_release_id,access_mode,access_code_hash,access_version,public_variant_id,rsvp_deadline,rsvp_questions",
      )
      .eq(field, value)
      .is("deleted_at", null)
      .maybeSingle();
    check(result.error);
    return result.data as SiteRecord | null;
  };
  // Existing public links still resolve through their stored slug.
  const site = invitation
    ? await findSite("id", invitation.site_id)
    : (isSiteUuidKey(key) ? await findSite("id", key) : null) ??
      (await findSite("public_slug", key));
  if (!site?.published_release_id)
    throw new GuestError(404, "Strona jest niedostępna");
  return { site, invitation, requiresSession: kind === "v" };
}
export type Context = Awaited<ReturnType<typeof context>>;
const cookieName = (ctx: Context) =>
  `guest_${ctx.invitation?.id || ctx.site.id}`;
export async function session(ctx: Context) {
  const raw = (await cookies()).get(cookieName(ctx))?.value;
  if (!raw) return null;
  const { data, error } = await db()
    .from("guest_sessions")
    .select("*")
    .eq("token_hash", digest(raw))
    .eq("site_id", ctx.site.id)
    .maybeSingle();
  check(error);
  if (
    !data ||
    Date.parse(data.expires_at) <= Date.now() ||
    data.access_version !== ctx.site.access_version ||
    data.invitation_id !== (ctx.invitation?.id || null) ||
    (ctx.invitation && data.invitation_version !== ctx.invitation.version)
  )
    return null;
  if (
    ctx.site.access_mode === "email" &&
    (!ctx.invitation || !ctx.invitation.emails.includes(data.email))
  )
    return null;
  return data;
}
export async function grant(ctx: Context, email: string | null = null) {
  const token = randomBytes(32).toString("base64url");
  const { error } = await db()
    .from("guest_sessions")
    .insert({
      token_hash: digest(token),
      site_id: ctx.site.id,
      invitation_id: ctx.invitation?.id || null,
      access_version: ctx.site.access_version,
      invitation_version: ctx.invitation?.version || null,
      email,
      expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
    });
  check(error);
  (await cookies()).set(cookieName(ctx), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400,
  });
}
export async function allowed(ctx: Context) {
  return (
    (ctx.site.access_mode === "public" && !ctx.requiresSession) ||
    !!(await session(ctx))
  );
}
export async function content(ctx: Context) {
  if (!(await allowed(ctx)))
    throw new GuestError(401, "Otwórz zaproszenie, aby potwierdzić dostęp");
  const { data, error } = await db()
    .from("releases")
    .select("config,asset_paths")
    .eq("site_id", ctx.site.id)
    .eq("id", ctx.site.published_release_id!)
    .single();
  check(error);
  if (!data) throw new GuestError(404, "Strona jest niedostępna");
  const config = siteConfigSchema.parse(data.config);
  const variantId = ctx.invitation?.variant_id || ctx.site.public_variant_id;
  if (!config.variants.some((v) => v.id === variantId))
    throw new GuestError(404, "Wariant jest niedostępny");
  return {
    config: guestContent(config, variantId),
    assets: data.asset_paths as Record<string, string>,
  };
}
export async function limit(
  request: Request,
  key: string,
  max = 10,
  seconds = 600,
) {
  // Vercel overwrites this header; local development deliberately shares a bucket.
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || "unknown"
    : "local";
  for (const bucket of [`${key}:${ip}`, `global:${ip}`]) {
    const { data, error } = await db().rpc("consume_access_attempt", {
      attempt_key: digest(bucket),
      max_attempts: bucket.startsWith("global:") ? 100 : max,
      window_seconds: seconds,
    });
    check(error);
    if (!data) throw new GuestError(429, "Zbyt wiele prób. Spróbuj później.");
  }
}
export async function unlock(ctx: Context, code: string) {
  if (
    ctx.site.access_mode !== "code" ||
    !(await verifyCode(code, ctx.site.access_code_hash))
  )
    throw new GuestError(401, "Nieprawidłowy kod dostępu");
  await grant(ctx);
}
export function endpoint(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    const requestId = crypto.randomUUID();
    try {
      if (request.method !== "GET") {
        const expected = new URL(required("SITE_URL")).origin;
        if (request.headers.get("origin") !== expected)
          throw new GuestError(403, "Nieprawidłowe źródło żądania");
      }
      const result = await handler(request);
      return result instanceof Response
        ? result
        : Response.json(result, {
            headers: {
              "Cache-Control": "private, no-store",
              "X-Request-Id": requestId,
            },
          });
    } catch (e) {
      if (!(e instanceof GuestError) || e.status >= 500)
        console.error(
          JSON.stringify({
            event: "guest.request.failed",
            requestId,
            method: request.method,
            reason: e instanceof Error ? e.name : "UnknownError",
            status: e instanceof GuestError ? e.status : 503,
          }),
        );
      return Response.json(
        {
          error:
            e instanceof GuestError
              ? e.message
              : e instanceof z.ZodError
                ? "Nieprawidłowe dane"
                : "Usługa jest chwilowo niedostępna",
        },
        {
          status:
            e instanceof GuestError
              ? e.status
              : e instanceof z.ZodError
                ? 400
                : 503,
          headers: {
            "Cache-Control": "private, no-store",
            "X-Request-Id": requestId,
          },
        },
      );
    }
  };
}
export async function json(request: Request) {
  if (Number(request.headers.get("content-length")) > 100_000)
    throw new GuestError(413, "Za dużo danych");
  const raw = await request.text();
  if (raw.length > 100_000) throw new GuestError(413, "Za dużo danych");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new GuestError(400, "Nieprawidłowe dane");
  }
}
