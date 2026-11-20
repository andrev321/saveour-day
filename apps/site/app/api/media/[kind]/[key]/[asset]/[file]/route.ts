import { createHash } from "node:crypto";
import {
  content,
  context,
  db,
  endpoint,
  GuestError,
  check,
} from "../../../../../../../lib/server";

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

export const GET = endpoint(async (request) => {
  const parts = new URL(request.url).pathname.split("/");
  const ctx = await context(parts[3], parts[4]);
  const { config, assets } = await content(ctx);
  const source = `/media/${parts[5]}/${parts[6]}`;
  if (
    !config.media.some(
      (m) => m.src === source || m.variants.some((v) => v.src === source),
    ) ||
    !assets[source]
  )
    throw new GuestError(404, "Nie znaleziono zdjęcia");
  const etag = mediaEtag(assets[source]);
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
  const { data, error } = await db()
    .storage.from("site-media")
    .download(assets[source]);
  check(error);
  if (!data) throw new GuestError(404, "Nie znaleziono zdjęcia");
  await context(parts[3], parts[4]);
  return new Response(data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-cache",
      ETag: etag,
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
