import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { siteConfigSchema } from "@wedding/domain";
import { validateMedia } from "./media";
import { vercel } from "./vercel";
import { checkDb, HttpError, required, serviceDb } from "./server";

export async function publish(
  site: { id: string; vercel_project_id?: string },
  userId: string,
  revision: number,
  restoreId?: string,
) {
  const db = serviceDb();
  if (!site.vercel_project_id)
    throw new HttpError(
      409,
      "Administrator musi najpierw połączyć projekt Vercel",
    );
  const sha = required("ENGINE_GIT_SHA");
  if (!/^[a-f0-9]{40}$/.test(sha))
    throw new HttpError(
      503,
      "ENGINE_GIT_SHA musi wskazywać pełny commit silnika",
    );
  const appUrl = new URL(required("APP_URL"));
  if (appUrl.protocol !== "https:")
    throw new HttpError(503, "Publikacja wymaga adresu HTTPS panelu");
  const { data: draft, error } = await db
    .from(restoreId ? "releases" : "drafts")
    .select("*")
    .eq("site_id", site.id)
    .eq(restoreId ? "id" : "revision", restoreId || revision)
    .single();
  if (error || !draft)
    throw new HttpError(409, "Wersja nie istnieje lub szkic został zmieniony");
  const content = siteConfigSchema.parse(draft.config),
    assets = await validateMedia(site.id, content);
  const token = randomBytes(32).toString("hex");
  const { data: deploymentId, error: beginError } = await db.rpc(
    "begin_publication",
    {
      sid: site.id,
      actor: userId,
      expected_revision: revision,
      content,
      assets,
      sha: restoreId ? draft.engine_sha : sha,
      token_hash: createHash("sha256").update(token).digest("hex"),
      source_release: restoreId || null,
    },
  );
  checkDb(beginError);
  const { data: job } = await db
    .from("deployments")
    .select("*")
    .eq("id", deploymentId)
    .single();
  if (!job) throw new HttpError(500, "Nie można odczytać zadania publikacji");
  try {
    await vercel(
      `/v10/projects/${encodeURIComponent(site.vercel_project_id)}/env?upsert=true`,
      {
        method: "POST",
        body: JSON.stringify([
          {
            key: "RELEASE_MANIFEST_URL",
            value: new URL(`/api/releases/build/${job.release_id}`, appUrl)
              .href,
            type: "encrypted",
            target: ["production"],
          },
          {
            key: "RELEASE_TOKEN",
            value: token,
            type: "encrypted",
            target: ["production"],
          },
        ]),
      },
    );
    const result = await vercel("/v13/deployments", {
      method: "POST",
      body: JSON.stringify({
        name: `invitation-${site.id}`,
        project: site.vercel_project_id,
        target: "production",
        gitSource: {
          type: "github",
          repoId: required("VERCEL_GITHUB_REPO_ID"),
          ref: restoreId ? draft.engine_sha : sha,
        },
        meta: { publicationId: deploymentId, releaseId: job.release_id },
      }),
    });
    const { error: updateError } = await db
      .from("deployments")
      .update({
        vercel_id: result.id,
        status: "building",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deploymentId);
    checkDb(updateError);
  } catch {
    await db
      .from("deployments")
      .update({
        error:
          "Nie potwierdzono uruchomienia. Odśwież status; operator może sprawdzić zadanie w Vercel.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", deploymentId);
    throw new HttpError(
      502,
      "Nie potwierdzono publikacji. Zadanie zachowano do uzgodnienia z Vercel.",
    );
  }
  return { id: deploymentId };
}
export async function syncDeployment(id: string, siteId: string) {
  const db = serviceDb();
  const { data: row } = await db
    .from("deployments")
    .select("*")
    .eq("id", id)
    .eq("site_id", siteId)
    .single();
  if (!row) throw new HttpError(404, "Nie znaleziono wdrożenia");
  if (["ready", "error"].includes(row.status)) return row;
  let remote;
  if (row.vercel_id)
    remote = await vercel(
      `/v13/deployments/${encodeURIComponent(row.vercel_id)}`,
    );
  else {
    const { data: site } = await db
      .from("sites")
      .select("vercel_project_id")
      .eq("id", siteId)
      .single();
    const result = await vercel(
      `/v6/deployments?projectId=${encodeURIComponent(site!.vercel_project_id)}&limit=100&meta-publicationId=${encodeURIComponent(id)}`,
    );
    remote = result.deployments?.find(
      (d: { meta?: { publicationId?: string } }) =>
        d.meta?.publicationId === id,
    );
    if (!remote) return row;
  }
  const state = remote.readyState || remote.state;
  const status =
    state === "READY"
      ? "ready"
      : ["ERROR", "CANCELED"].includes(state)
        ? "error"
        : "building";
  const changes = {
    vercel_id: remote.id || remote.uid,
    status,
    url: remote.url ? `https://${remote.url}` : null,
    error:
      status === "error"
        ? "Build nie powiódł się. Poprzednia strona nadal działa."
        : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db
    .from("deployments")
    .update(changes)
    .eq("id", id)
    .in("status", ["preparing", "building"]);
  checkDb(error);
  return { ...row, ...changes };
}
