import { createHash } from "node:crypto";
import { z } from "zod";
import { mediaSchema } from "@invitations/domain";
import {
  api,
  checkDb,
  HttpError,
  requireSite,
  serviceDb,
} from "../../../../../../../lib/server";
import { mediaStoragePath } from "../../../../../../../lib/media";

function mediaEtag(storagePath: string) {
  return `"${createHash("sha256").update(storagePath).digest("base64url").slice(0, 27)}"`;
}

function matchesIfNoneMatch(header: string | null, etag: string) {
  if (!header) return false;
  return header
    .split(",")
    .map((token) => token.trim())
    .some((token) => token === "*" || token === etag || token === `W/${etag}`);
}

export const GET = api(async (request) => {
  const parts = new URL(request.url).pathname.split("/");
  const { site } = await requireSite(parts[3]);
  if (
    !z.uuid().safeParse(parts[5]).success ||
    !/^[1-9][0-9]{0,3}\.webp$/.test(parts[6])
  )
    throw new HttpError(404, "Nie znaleziono zdjęcia");
  const client = serviceDb();
  const { data, error } = await client
    .from("media_assets")
    .select("manifest,original_path")
    .eq("site_id", site.id)
    .eq("id", parts[5])
    .eq("status", "ready")
    .maybeSingle();
  checkDb(error);
  if (!data) throw new HttpError(404, "Nie znaleziono zdjęcia");
  const manifest = mediaSchema.parse(data.manifest);
  const source = `/media/${parts[5]}/${parts[6]}`;
  if (![manifest.src, ...manifest.variants.map((v) => v.src)].includes(source))
    throw new HttpError(404, "Nie znaleziono zdjęcia");
  const path = mediaStoragePath(site.id, parts[5], data.original_path, source);
  const etag = mediaEtag(path);
  if (matchesIfNoneMatch(request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "private, no-cache",
        Vary: "Cookie",
      },
    });
  }
  const { data: image, error: storageError } = await client.storage
    .from("site-media")
    .download(path);
  checkDb(storageError);
  if (!image) throw new HttpError(404, "Nie znaleziono zdjęcia");
  // Check again after I/O; the service-role read does not enforce tenant RLS.
  await requireSite(site.id);
  const { data: current, error: currentError } = await client
    .from("media_assets")
    .select("id")
    .eq("site_id", site.id)
    .eq("id", parts[5])
    .eq("status", "ready")
    .maybeSingle();
  checkDb(currentError);
  if (!current) throw new HttpError(404, "Nie znaleziono zdjęcia");
  return new Response(image, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-cache",
      ETag: etag,
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
