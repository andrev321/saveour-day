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
    .select(
      "id,name,public_slug,owner_id,published_release_id,access_mode,access_version,public_variant_id,rsvp_deadline,rsvp_questions",
    )
    .eq("id", siteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) throw new HttpError(404, "Nie znaleziono realizacji");
  return { db, user, site: data };
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
    const requestId = crypto.randomUUID();
    try {
      if (!["GET", "HEAD"].includes(request.method)) verifyOrigin(request);
      const result = await handler(request);
      return result instanceof Response
        ? result
        : NextResponse.json(result, {
            headers: {
              "Cache-Control": "private, no-store",
              "X-Request-Id": requestId,
            },
          });
    } catch (error) {
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof z.ZodError
            ? 400
            : 500;
      if (status >= 500)
        console.error(
          JSON.stringify({
            event: "panel.request.failed",
            requestId,
            status,
            method: request.method,
            route: new URL(request.url).pathname.replace(
              /\/sites\/[^/]+/,
              "/sites/:id",
            ),
            reason: error instanceof Error ? error.name : "UnknownError",
          }),
        );
      if (error instanceof z.ZodError)
        return NextResponse.json(
          {
            error: error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("\n"),
          },
          {
            status: 400,
            headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
          },
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
          headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
        },
      );
    }
  };
}
export function checkDb(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.message.includes("REVISION_CONFLICT"))
    throw new HttpError(
      409,
      "Dane zmieniły się w innej sesji. Odśwież stronę przed zapisem.",
    );
  const messages: Record<string, string> = {
    MEDIA_IN_DRAFT: "Najpierw usuń zdjęcie z zaproszenia i zapisz szkic.",
    MEDIA_IN_RELEASE:
      "Zdjęcie jest używane w opublikowanej wersji lub historii publikacji. Nie można usunąć jej pliku.",
    MEDIA_IN_SNAPSHOT:
      "Zdjęcie jest używane w zachowanej kopii szkicu. Nie można usunąć jej pliku.",
    MEDIA_UNAVAILABLE:
      "Zdjęcie zostało usunięte lub trwa jego usuwanie. Odśwież bibliotekę zdjęć.",
    MEDIA_LIBRARY_FULL: "Limit biblioteki: 100 plików na realizację.",
    MEDIA_UPLOAD_LIMIT:
      "Trwa już maksymalna liczba uploadów. Poczekaj na ich zakończenie.",
    MEDIA_REMAIN:
      "Nie udało się usunąć wszystkich plików. Ponów usuwanie zdjęcia.",
    MEDIA_NOT_READY: "Poczekaj na zakończenie przesyłania zdjęcia.",
    SITE_DELETED: "Realizacja została usunięta. Wróć do listy realizacji.",
    VARIANT_MISSING:
      "Wariant jest używany przez zaproszenia albo nie istnieje w publikacji.",
    QUESTION_IMMUTABLE:
      "Nie można zmienić typu ani zakresu pytania, które ma już odpowiedzi.",
    REQUIRED_QUESTION_MISSING: "Wypełnij wszystkie wymagane pytania.",
    CODE_REQUIRED: "Ustaw kod dostępu.",
    EMAIL_REQUIRED: "Każde aktywne zaproszenie musi mieć adres e-mail.",
    RSVP_CLOSED: "Termin odpowiedzi minął.",
    UNPUBLISHED: "Strona nie jest opublikowana.",
    INVALID_ANSWERS: "Odpowiedzi nie pasują do zaproszenia.",
    FORBIDDEN: "Brak dostępu.",
    LEGACY_PUBLICATION_ACTIVE:
      "Najpierw wyłącz stare publiczne deploymenty tej realizacji zgodnie z instrukcją migracji.",
  };
  for (const [key, message] of Object.entries(messages)) {
    if (error.message.includes(key)) throw new HttpError(409, message);
  }
  console.error(
    JSON.stringify({
      event: "database.operation.failed",
      code:
        error.code && /^[A-Z0-9_]{1,32}$/.test(error.code)
          ? error.code
          : "unknown",
    }),
  );
  throw new HttpError(500, "Nie udało się zapisać danych");
}
