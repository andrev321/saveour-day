import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createTemplate, templateIds } from "@invitations/domain/templates";
import { invitationLocales } from "@invitations/domain";
import {
  api,
  checkDb,
  readJson,
  requireUser,
  serviceDb,
} from "../../../lib/server";
export const GET = api(async () => {
  const { db, user } = await requireUser();
  const [{ data: sites, error }, { data: admin }] = await Promise.all([
    db
      .from("sites")
      .select("id,name,public_slug,published_release_id,owner_id,created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    db
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  checkDb(error);
  return {
    sites: (sites || []).map((site) => ({
      ...site,
      canDelete: site.owner_id === user.id || !!admin,
    })),
    admin: !!admin,
  };
});
export const POST = api(async (request) => {
  const { user } = await requireUser();
  const { name, templateId, locale } = z
    .object({
      name: z.string().trim().min(1).max(200),
      templateId: z.enum(templateIds),
      locale: z.enum(invitationLocales),
    })
    .parse(await readJson(request));
  const id = randomUUID();
  const config = createTemplate(templateId, id, locale);
  const stem =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "zaproszenie";
  const { error } = await serviceDb().rpc("create_owned_site", {
    actor: user.id,
    title: name,
    slug: stem + "-" + id,
    sid: id,
    content: config,
  });
  checkDb(error);
  return { id, name };
});
