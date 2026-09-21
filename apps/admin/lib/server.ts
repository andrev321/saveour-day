import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new HttpError(503, `Brak konfiguracji usługi: ${name}`);
  return value;
}
export function serviceDb() {
  return createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function sessionDb() {
  const jar = await cookies();
  return createServerClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          for (const { name, value, options } of values)
            jar.set(name, value, options);
        },
      },
    },
  );
}
export async function requireUser() {
  const db = await sessionDb();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Zaloguj się ponownie");
  return { db, user: data.user };
}
export async function requireSite(siteId: string) {
  if (!z.uuid().safeParse(siteId).success)
    throw new HttpError(404, "Nie znaleziono realizacji");
  const { db, user } = await requireUser();
  const { data, error } = await db
    .from("sites")
    .select("*")
    .eq("id", siteId)
    .maybeSingle();
  if (error || !data) throw new HttpError(404, "Nie znaleziono realizacji");
  return { db, user, site: data };
}
export async function requireAdmin() {
  const { db, user } = await requireUser();
  const { data } = await db
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) throw new HttpError(403, "Ta operacja wymaga administratora");
  return { db, user };
}
export function verifyOrigin(request: Request) {
  const expected = process.env.APP_URL || new URL(request.url).origin;
  if (request.headers.get("origin") !== new URL(expected).origin)
    throw new HttpError(403, "Nieprawidłowe źródło żądania");
}
export async function readJson(request: Request) {
  if (Number(request.headers.get("content-length")) > 512_000)
    throw new HttpError(413, "Zbyt duża konfiguracja");
  const raw = await request.text();
  if (raw.length > 512_000) throw new HttpError(413, "Zbyt duża konfiguracja");
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new HttpError(400, "Nieprawidłowy JSON");
  }
}
export function api(handler: (request: Request) => Promise<unknown>) {
  return async (request: Request) => {
    try {
      if (!["GET", "HEAD"].includes(request.method)) verifyOrigin(request);
      const result = await handler(request);
      return result instanceof Response
        ? result
        : NextResponse.json(result, {
            headers: { "Cache-Control": "private, no-store" },
          });
    } catch (error) {
      if (error instanceof z.ZodError)
        return NextResponse.json(
          {
            error: error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("\n"),
          },
          { status: 400 },
        );
      return NextResponse.json(
        {
          error:
            error instanceof HttpError
              ? error.message
              : "Operacja nie powiodła się. Spróbuj ponownie.",
        },
        {
          status: error instanceof HttpError ? error.status : 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
  };
}
export function checkDb(error: { message: string } | null) {
  if (!error) return;
  if (error.message.includes("REVISION_CONFLICT"))
    throw new HttpError(
      409,
      "Szkic zmienił się w innej sesji. Odśwież stronę przed zapisem.",
    );
  if (error.message.includes("DEPLOYMENT_ACTIVE"))
    throw new HttpError(409, "Publikacja już trwa. Odśwież jej status.");
  if (error.message.includes("DAILY_LIMIT"))
    throw new HttpError(
      429,
      "Limit 10 publikacji w ciągu 24 godzin został wykorzystany.",
    );
  throw new HttpError(500, "Nie udało się zapisać danych");
}
