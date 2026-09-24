import "server-only";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mediaSchema, type SiteConfig } from "@invitations/domain";
import { z } from "zod";
import { checkDb, HttpError, serviceDb } from "./server";

const maxLibraryAssets = 100;
const maxPendingUploads = 5;
const uploadReservationMinutes = 30;

async function clearExpiredReservations(
  db: ReturnType<typeof serviceDb>,
  siteId: string,
) {
  const expiresAt = new Date(
    Date.now() - uploadReservationMinutes * 60 * 1000,
  ).toISOString();
  const { data, error } = await db
    .from("media_assets")
    .select("id,original_path")
    .eq("site_id", siteId)
    .eq("status", "pending")
    .lt("created_at", expiresAt);
  checkDb(error);
  if (!data?.length) return;
  await db.storage
    .from("site-media")
    .remove(data.map((asset) => asset.original_path));
  const { error: deleteError } = await db
    .from("media_assets")
    .delete()
    .in(
      "id",
      data.map((asset) => asset.id),
    );
  checkDb(deleteError);
}

export async function prepareUpload(siteId: string, input: unknown) {
  const body = z
    .object({
      type: z.enum(["image/jpeg", "image/png", "image/webp"]),
      size: z.number().int().positive().max(8388608),
    })
    .parse(input);
  const db = serviceDb();
  await clearExpiredReservations(db, siteId);
  const [ready, pending] = await Promise.all([
    db
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("status", "ready"),
    db
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .eq("status", "pending"),
  ]);
  checkDb(ready.error);
  checkDb(pending.error);
  if ((ready.count || 0) >= maxLibraryAssets)
    throw new HttpError(400, "Limit biblioteki: 100 plików na realizację.");
  if ((pending.count || 0) >= maxPendingUploads)
    throw new HttpError(
      429,
      "Trwa już maksymalna liczba uploadów. Poczekaj na ich zakończenie.",
    );
  const id = randomUUID(),
    original = `${siteId}/${id}/original`;
  const { error } = await db
    .from("media_assets")
    .insert({ id, site_id: siteId, original_path: original });
  checkDb(error);
  const { data, error: signedError } = await db.storage
    .from("site-media")
    .createSignedUploadUrl(original, { upsert: false });
  if (signedError || !data)
    throw new HttpError(503, "Nie można przygotować uploadu");
  return { id, path: original, token: data.token, type: body.type };
}
export async function finalizeUpload(siteId: string, assetId: string) {
  const db = serviceDb();
  const { data: asset } = await db
    .from("media_assets")
    .select("*")
    .eq("id", assetId)
    .eq("site_id", siteId)
    .single();
  if (!asset) throw new HttpError(404, "Nie znaleziono zdjęcia");
  if (asset.status === "ready") return asset.manifest;
  if (asset.status !== "pending")
    throw new HttpError(400, "Upload został odrzucony. Dodaj nowy plik.");
  try {
    const { data, error } = await db.storage
      .from("site-media")
      .download(asset.original_path);
    if (error || !data) throw new HttpError(400, "Najpierw prześlij plik");
    if (data.size > 8388608) throw new HttpError(413, "Limit pliku: 8 MB");
    const buffer = Buffer.from(await data.arrayBuffer());
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
      const { error: uploadError } = await db.storage
        .from("site-media")
        .upload(`${siteId}/${assetId}/${name}`, output.data, {
          contentType: "image/webp",
          upsert: false,
        });
      if (
        uploadError &&
        !uploadError.message.toLowerCase().includes("already exists")
      )
        throw uploadError;
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
    const { error: updateError } = await db
      .from("media_assets")
      .update({ status: "ready", manifest })
      .eq("id", assetId)
      .eq("site_id", siteId);
    checkDb(updateError);
    await db.storage.from("site-media").remove([asset.original_path]);
    return manifest;
  } catch (error) {
    await db
      .from("media_assets")
      .update({ status: "error" })
      .eq("id", assetId)
      .eq("site_id", siteId);
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Nie udało się bezpiecznie przetworzyć zdjęcia");
  }
}
export async function validateMedia(siteId: string, config: SiteConfig) {
  const paths: Record<string, string> = {};
  if (!config.media.length) return paths;
  const { data, error } = await serviceDb()
    .from("media_assets")
    .select("id,manifest")
    .eq("site_id", siteId)
    .eq("status", "ready")
    .in(
      "id",
      config.media.map((m) => m.id),
    );
  checkDb(error);
  for (const media of config.media) {
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
      paths[source] = `${siteId}/${source.slice("/media/".length)}`;
  }
  return paths;
}
