import "server-only";
import sharp from "sharp";
import { randomBytes, randomUUID } from "node:crypto";
import {
  mediaSchema,
  isSampleMedia,
  type SiteConfig,
} from "@invitations/domain";
import { checkDb, HttpError, serviceDb, sessionDb } from "./server";

export async function deleteMedia(
  siteId: string,
  assetId: string,
  actor: string,
  cleanupOnly = false,
) {
  const db = serviceDb();
  const args = { sid: siteId, aid: assetId, actor };
  const { data, error } = await db.rpc("begin_media_deletion", {
    ...args,
    cleanup_only: cleanupOnly,
  });
  if (cleanupOnly && error?.message.includes("MEDIA_NOT_READY"))
    return { deleted: false };
  checkDb(error);
  const paths = (data || []).map((item: { path: string }) => item.path);
  if (
    paths.some(
      (path: string) =>
        !path.startsWith(`${siteId}/${assetId}/`) || path.includes(".."),
    )
  )
    throw new HttpError(500, "Nieprawidłowy zakres usuwania zdjęcia");
  for (let i = 0; i < paths.length; i += 500) {
    const { error: storageError } = await db.storage
      .from("site-media")
      .remove(paths.slice(i, i + 500));
    if (storageError)
      throw new HttpError(
        503,
        "Nie udało się usunąć plików. Ponów usuwanie zdjęcia z biblioteki.",
      );
  }
  const { error: finishError } = await db.rpc("finish_media_deletion", args);
  checkDb(finishError);
  return { deleted: true };
}

export async function cleanupMedia(siteId: string, actor: string) {
  const { data, error } = await serviceDb().rpc("media_cleanup_candidates", {
    sid: siteId,
    actor,
  });
  checkDb(error);
  for (const asset of data || [])
    await deleteMedia(siteId, asset.id, actor, true);
}

export async function uploadMedia(
  siteId: string,
  actor: string,
  buffer: Buffer,
  uploadDb: Awaited<ReturnType<typeof sessionDb>>,
) {
  if (!buffer.length || buffer.length > 8388608)
    throw new HttpError(413, "Limit pliku: 8 MB");
  await cleanupMedia(siteId, actor);
  const db = serviceDb();
  const assetId = randomUUID();
  const prefix = `${siteId}/${assetId}/${randomBytes(32).toString("hex")}`;
  const args = { sid: siteId, aid: assetId, actor };
  const { error: reserveError } = await db.rpc("reserve_media_upload", {
    ...args,
    original: `${prefix}/original`,
  });
  checkDb(reserveError);
  try {
    const metadata = await sharp(buffer, {
      limitInputPixels: 20000000,
    }).metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
      (metadata.pages || 1) !== 1
    )
      throw new HttpError(
        400,
        "Wymagane nieanimowane zdjęcie JPEG, PNG lub WebP",
      );
    const variants: { src: string; width: number }[] = [];
    let width = 0,
      height = 0;
    for (const target of [640, 1280, 1920]) {
      const output = await sharp(buffer, { limitInputPixels: 20000000 })
        .rotate()
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
      if (variants.some((v) => v.width === output.info.width)) continue;
      const name = `${output.info.width}.webp`;
      const { error: uploadError } = await uploadDb.storage
        .from("site-media")
        .upload(`${prefix}/${name}`, output.data, {
          contentType: "image/webp",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      variants.push({
        src: `/media/${assetId}/${name}`,
        width: output.info.width,
      });
      width = output.info.width;
      height = output.info.height;
    }
    const manifest = mediaSchema.parse({
      id: assetId,
      src: variants.at(-1)!.src,
      width,
      height,
      variants,
    });
    const { error: completeError } = await db.rpc("complete_media_upload", {
      ...args,
      content: manifest,
    });
    checkDb(completeError);
    return manifest;
  } catch (error) {
    // Only a still-processing upload can fail. A stale worker cannot reset deleting.
    const { error: failError } = await db.rpc("fail_media_upload", args);
    if (!failError) {
      try {
        await deleteMedia(siteId, assetId, actor, true);
      } catch {
        /* Preserve metadata and retry the full prefix on the next cleanup. */
      }
    }
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Nie udało się bezpiecznie przetworzyć zdjęcia");
  }
}
export async function validateMedia(siteId: string, config: SiteConfig) {
  const paths: Record<string, string> = {};
  // Only exact bundled manifests bypass private Storage ownership lookup.
  // Reparse here too, so callers cannot pass a forged reserved ID or source.
  const uploads = config.media
    .map((media) => mediaSchema.parse(media))
    .filter((media) => !isSampleMedia(media));
  if (!uploads.length) return paths;
  const { data, error } = await serviceDb()
    .from("media_assets")
    .select("id,manifest,original_path")
    .eq("site_id", siteId)
    .eq("status", "ready")
    .in(
      "id",
      uploads.map((m) => m.id),
    );
  checkDb(error);
  for (const media of uploads) {
    const row = data?.find((a) => a.id === media.id);
    if (!row)
      throw new HttpError(
        400,
        "Zdjęcie nie należy do tej realizacji lub nie jest gotowe",
      );
    const official = mediaSchema.parse(row.manifest);
    if (
      media.src !== official.src ||
      media.width !== official.width ||
      media.height !== official.height ||
      JSON.stringify(media.variants) !== JSON.stringify(official.variants)
    )
      throw new HttpError(400, "Nieprawidłowy manifest zdjęcia");
    for (const source of new Set([
      media.src,
      ...media.variants.map((v) => v.src),
    ]))
      paths[source] = mediaStoragePath(
        siteId,
        media.id,
        row.original_path,
        source,
      );
  }
  return paths;
}

export function mediaStoragePath(
  siteId: string,
  assetId: string,
  original: string,
  source: string,
) {
  if (
    !source.startsWith(`/media/${assetId}/`) ||
    source.includes("..") ||
    !original.startsWith(`${siteId}/${assetId}/`) ||
    original.includes("..") ||
    !original.endsWith("/original")
  )
    throw new HttpError(500, "Nieprawidłowy zakres zdjęcia");
  return (
    original.slice(0, -"original".length) +
    source.slice(`/media/${assetId}/`.length)
  );
}
