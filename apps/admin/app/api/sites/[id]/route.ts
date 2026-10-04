import { z } from "zod";
import { siteConfigSchema, invitationLocales } from "@invitations/domain";
import {
  api,
  checkDb,
  HttpError,
  readJson,
  requireSite,
  serviceDb,
} from "../../../../lib/server";
import { validateMedia, deleteMedia } from "../../../../lib/media";
import { publish } from "../../../../lib/publishing";

import { createTemplate, templateIds } from "@invitations/domain/templates";

const siteId = (request: Request) =>
  new URL(request.url).pathname.split("/")[3]!;
export const DELETE = api(async (request) => {
  const { site, user } = await requireSite(siteId(request));
  const { data, error } = await serviceDb().rpc("soft_delete_site", {
    sid: site.id,
    actor: user.id,
  });
  if (error?.message.includes("FORBIDDEN"))
    throw new HttpError(
      403,
      "Tylko właściciel lub administrator może usunąć realizację.",
    );
  checkDb(error);
  return { deletedAt: data };
});
export const GET = api(async (request) => {
  const { db, site } = await requireSite(siteId(request));
  const [draft, releases, media, snapshots, published] = await Promise.all([
    db.from("drafts").select("*").eq("site_id", site.id).single(),
    db
      .from("releases")
      .select("id,created_at,engine_sha")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("media_assets")
      .select("id,manifest,status")
      .eq("site_id", site.id)
      .in("status", ["ready", "deleting"])
      .not("manifest", "is", null),
    db
      .from("draft_snapshots")
      .select("id,created_at,revision")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(20),
    site.published_release_id
      ? db
          .from("releases")
          .select("config")
          .eq("site_id", site.id)
          .eq("id", site.published_release_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const result of [draft, releases, media, snapshots, published])
    checkDb(result.error);
  const urls: Record<string, string> = {};
  const sources = (media.data || [])
    .filter((asset) => asset.status === "ready")
    .flatMap((asset) => [
      asset.manifest.src,
      ...asset.manifest.variants.map((variant: { src: string }) => variant.src),
    ]);
  for (const source of sources) urls[source] = `/api/sites/${site.id}${source}`;
  return {
    site,
    draft: { ...draft.data, config: siteConfigSchema.parse(draft.data.config) },
    publishedConfig: published.data
      ? siteConfigSchema.parse(published.data.config)
      : null,
    snapshots: snapshots.data,
    releases: releases.data,
    media: media.data,
    urls,
  };
});
export const PATCH = api(async (request) => {
  const { site, user } = await requireSite(siteId(request));
  const body = z
    .object({ revision: z.number().int().positive(), config: siteConfigSchema })
    .parse(await readJson(request));
  if (body.config.id !== site.id)
    throw new HttpError(
      400,
      "Identyfikator konfiguracji musi odpowiadać realizacji",
    );
  await validateMedia(site.id, body.config);
  const { data, error } = await serviceDb().rpc("save_site_draft", {
    sid: site.id,
    actor: user.id,
    expected_revision: body.revision,
    content: body.config,
  });
  checkDb(error);
  return { revision: data };
});
export const POST = api(async (request) => {
  const { site, user } = await requireSite(siteId(request));
  const body = z
    .object({
      action: z.enum([
        "reset-template",
        "restore-draft",
        "publish",
        "restore",
        "delete-media",
      ]),
      payload: z.unknown(),
    })
    .parse(await readJson(request));
  if (body.action === "delete-media")
    return deleteMedia(
      site.id,
      z.object({ id: z.uuid() }).parse(body.payload).id,
      user.id,
    );
  if (body.action === "reset-template" || body.action === "restore-draft") {
    const db = serviceDb();
    const p = z
      .object({
        revision: z.number().int().positive(),
        templateId: z.enum(templateIds).optional(),
        locale: z.enum(invitationLocales).optional(),
        snapshotId: z.uuid().optional(),
      })
      .parse(body.payload);
    let config;
    if (body.action === "restore-draft") {
      if (!p.snapshotId) throw new HttpError(400, "Wybierz kopię szkicu");
      const { data, error } = await db
        .from("draft_snapshots")
        .select("config")
        .eq("site_id", site.id)
        .eq("id", p.snapshotId)
        .single();
      checkDb(error);
      config = siteConfigSchema.parse(data?.config);
      await validateMedia(site.id, config);
    } else {
      if (!p.templateId || !p.locale)
        throw new HttpError(400, "Wybierz szablon i język");
      const { data, error } = await db
        .from("drafts")
        .select("config")
        .eq("site_id", site.id)
        .single();
      checkDb(error);
      config = createTemplate(
        p.templateId,
        site.id,
        p.locale,
        undefined,
        siteConfigSchema.parse(data?.config).defaultVariant,
      );
    }
    const { data, error } = await db.rpc("replace_invitation_draft", {
      sid: site.id,
      actor: user.id,
      expected_revision: p.revision,
      content: config,
      snapshot_id: body.action === "restore-draft" ? p.snapshotId : null,
    });
    if (error?.message.includes("VARIANT_IN_USE"))
      throw new HttpError(
        409,
        "Najpierw zmień wariant lub cofnij powiązane zaproszenia: " +
          error.details,
      );
    checkDb(error);
    return { revision: data, config };
  }
  if (body.action === "publish")
    return publish(
      site,
      user.id,
      z.object({ revision: z.number().int().positive() }).parse(body.payload)
        .revision,
    );
  if (body.action === "restore")
    return publish(
      site,
      user.id,
      0,
      z.object({ releaseId: z.uuid() }).parse(body.payload).releaseId,
    );
  throw new HttpError(410, "Ta operacja publikacji została wycofana");
});
