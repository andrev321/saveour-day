import { z } from "zod";
import { createDemo } from "@wedding/domain/demo";
import {
  api,
  checkDb,
  readJson,
  requireAdmin,
  requireUser,
  serviceDb,
} from "../../../lib/server";
export const GET = api(async () => {
  const { db, user } = await requireUser();
  const [{ data: sites, error }, { data: admin }] = await Promise.all([
    db.from("sites").select("*").order("created_at", { ascending: false }),
    db
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  checkDb(error);
  return { sites, admin: !!admin };
});
export const POST = api(async (request) => {
  const { user } = await requireAdmin();
  const { name } = z
    .object({ name: z.string().trim().min(1).max(200) })
    .parse(await readJson(request));
  const db = serviceDb();
  const { data: site, error } = await db
    .from("sites")
    .insert({ name })
    .select()
    .single();
  checkDb(error);
  const config = createDemo();
  config.id = site.id;
  const { error: draftError } = await db
    .from("drafts")
    .insert({ site_id: site.id, config });
  checkDb(draftError);
  await db
    .from("audit_events")
    .insert({ site_id: site.id, actor_id: user.id, action: "site.created" });
  return site;
});
