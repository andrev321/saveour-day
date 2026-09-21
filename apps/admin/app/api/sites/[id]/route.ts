import { z } from "zod";
import { siteConfigSchema } from "@wedding/domain";
import {
  api,
  checkDb,
  HttpError,
  readJson,
  requireAdmin,
  requireSite,
  required,
  serviceDb,
} from "../../../../lib/server";
import {
  prepareUpload,
  finalizeUpload,
  validateMedia,
} from "../../../../lib/media";
import { publish, syncDeployment } from "../../../../lib/publishing";
import { createProject, vercel } from "../../../../lib/vercel";
const siteId = (request: Request) =>
  new URL(request.url).pathname.split("/")[3]!;
export const GET = api(async (request) => {
  const { db, site } = await requireSite(siteId(request));
  const [draft, releases, deployments, media] = await Promise.all([
    db.from("drafts").select("*").eq("site_id", site.id).single(),
    db
      .from("releases")
      .select("id,created_at,engine_sha")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("deployments")
      .select("*")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("media_assets")
      .select("id,manifest")
      .eq("site_id", site.id)
      .eq("status", "ready"),
  ]);
  for (const result of [draft, releases, deployments, media])
    checkDb(result.error);
  const urls: Record<string, string> = {};
  const sources = (media.data || []).flatMap((asset) => [
    asset.manifest.src,
    ...asset.manifest.variants.map((variant: { src: string }) => variant.src),
  ]);
  if (sources.length) {
    const { data: signedUrls, error } = await db.storage
      .from("site-media")
      .createSignedUrls(
        sources.map((source) => `${site.id}/${source.slice("/media/".length)}`),
        3600,
      );
    checkDb(error);
    for (const signed of signedUrls || []) {
      if (signed.signedUrl && signed.path)
        urls[`/media/${signed.path.slice(`${site.id}/`.length)}`] =
          signed.signedUrl;
    }
  }
  return {
    site,
    draft: draft.data,
    releases: releases.data,
    deployments: deployments.data,
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
        "publish",
        "restore",
        "sync",
        "prepare-upload",
        "finalize-upload",
        "connect",
        "invite",
        "domain",
        "resolve-failed",
      ]),
      payload: z.unknown(),
    })
    .parse(await readJson(request));
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
  if (body.action === "sync")
    return syncDeployment(
      z.object({ id: z.uuid() }).parse(body.payload).id,
      site.id,
    );
  if (body.action === "prepare-upload")
    return prepareUpload(site.id, body.payload);
  if (body.action === "finalize-upload")
    return finalizeUpload(
      site.id,
      z.object({ id: z.uuid() }).parse(body.payload).id,
    );
  await requireAdmin();
  const db = serviceDb();
  if (body.action === "connect") {
    if (site.vercel_project_id) return { connected: true };
    const project = await createProject(site.id);
    const { error } = await db
      .from("sites")
      .update({ vercel_project_id: project.id })
      .eq("id", site.id);
    checkDb(error);
    return { connected: true };
  }
  if (body.action === "invite") {
    const { email } = z.object({ email: z.email() }).parse(body.payload);
    const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
      redirectTo: new URL("/account", required("APP_URL")).href,
    });
    if (error || !data.user)
      throw new HttpError(
        400,
        "Nie udało się zaprosić użytkownika. Dla istniejącego konta przypisz członkostwo w bazie.",
      );
    const { error: memberError } = await db
      .from("site_members")
      .insert({ site_id: site.id, user_id: data.user.id });
    checkDb(memberError);
    return { invited: true };
  }
  if (body.action === "domain") {
    if (!site.vercel_project_id)
      throw new HttpError(409, "Najpierw połącz projekt Vercel");
    const { domain } = z
      .object({
        domain: z
          .string()
          .toLowerCase()
          .max(253)
          .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
      })
      .parse(body.payload);
    const result = await vercel(
      `/v10/projects/${encodeURIComponent(site.vercel_project_id)}/domains`,
      { method: "POST", body: JSON.stringify({ name: domain }) },
    );
    const { error } = await db
      .from("sites")
      .update({ domain })
      .eq("id", site.id);
    checkDb(error);
    return result;
  }
  const { id } = z.object({ id: z.uuid() }).parse(body.payload);
  const { error } = await db
    .from("deployments")
    .update({
      status: "error",
      error: "Zadanie zamknięte przez operatora po kontroli Vercel.",
    })
    .eq("id", id)
    .eq("site_id", site.id)
    .eq("status", "preparing");
  checkDb(error);
  await db.from("audit_events").insert({
    site_id: site.id,
    actor_id: user.id,
    action: "deployment.resolved",
  });
  return { resolved: true };
});
