import "server-only";
import { publishedConfigSchema } from "@invitations/domain";
import { validateMedia } from "./media";
import { checkDb, HttpError, required, serviceDb } from "./server";
export async function publish(
  site: { id: string },
  userId: string,
  revision: number,
  restoreId?: string,
) {
  const url = new URL("/s/" + site.id, required("SITE_URL")).href;
  const db = serviceDb();
  const { data, error } = await db
    .from(restoreId ? "releases" : "drafts")
    .select("*")
    .eq("site_id", site.id)
    .eq(restoreId ? "id" : "revision", restoreId || revision)
    .single();
  if (error || !data)
    throw new HttpError(409, "Wersja nie istnieje lub szkic został zmieniony");
  const content = publishedConfigSchema.parse(data.config);
  const assets = await validateMedia(site.id, content);
  const { data: id, error: publishError } = await db.rpc("publish_content", {
    sid: site.id,
    actor: userId,
    expected_revision: revision,
    content,
    assets,
    source_release: restoreId || null,
  });
  checkDb(publishError);
  return { id, url };
}
