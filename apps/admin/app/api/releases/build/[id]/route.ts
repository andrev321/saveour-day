import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { api, HttpError, serviceDb } from "../../../../../lib/server";
export const GET = api(async (request) => {
  const url = new URL(request.url),
    id = url.pathname.split("/").at(-1);
  if (!z.uuid().safeParse(id).success)
    throw new HttpError(404, "Wydanie nie istnieje");
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "Nieprawidłowy dostęp do wydania");
  const db = serviceDb();
  const { data } = await db.from("releases").select("*").eq("id", id).single();
  if (
    !data ||
    new Date(data.token_expires_at).valueOf() < Date.now() ||
    !timingSafeEqual(
      Buffer.from(createHash("sha256").update(token).digest("hex")),
      Buffer.from(data.build_token_hash),
    )
  )
    throw new HttpError(401, "Dostęp do wydania wygasł");
  const asset = url.searchParams.get("asset");
  if (!asset) return data.config;
  const objectPath = Object.hasOwn(data.asset_paths, asset)
    ? data.asset_paths[asset]
    : null;
  if (!objectPath) throw new HttpError(404, "Zdjęcie nie należy do wydania");
  const { data: file, error } = await db.storage
    .from("site-media")
    .download(objectPath);
  if (error || !file) throw new HttpError(404, "Brak zdjęcia");
  return new NextResponse(file, {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(file.size),
      "Cache-Control": "no-store",
    },
  });
});
