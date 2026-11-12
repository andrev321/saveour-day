import {
  api,
  readJson,
  requireSite,
} from "../../../../../lib/server";
import {
  previewEmailCampaign,
  sendEmailCampaign,
  sendEmailCampaignSchema,
} from "../../../../../lib/emails";

export const maxDuration = 180;

const idFrom = (request: Request) => new URL(request.url).pathname.split("/")[3]!;

export const GET = api(async (request) => {
  const { site } = await requireSite(idFrom(request));
  return previewEmailCampaign(site);
});

export const POST = api(async (request) => {
  const { site, user } = await requireSite(idFrom(request));
  const payload = sendEmailCampaignSchema.parse(await readJson(request));
  return sendEmailCampaign(site, user, payload);
});
