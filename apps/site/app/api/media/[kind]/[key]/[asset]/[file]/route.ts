import {
  content,
  context,
  db,
  endpoint,
  GuestError,
  check,
} from "../../../../../../../lib/server";
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
  const { data, error } = await db()
    .storage.from("site-media")
    .download(assets[source]);
  check(error);
  if (!data) throw new GuestError(404, "Nie znaleziono zdjęcia");
  await context(parts[3], parts[4]);
  return new Response(data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

