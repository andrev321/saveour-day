import { api, requireSite } from "../../../../../lib/server";
import { uploadMedia } from "../../../../../lib/media";
import { readImage } from "../../../../../lib/media-upload";

export const maxDuration = 300;
export const POST = api(async (request) => {
  const { site, user, db } = await requireSite(
    new URL(request.url).pathname.split("/")[3],
  );
  const image = await readImage(request);
  return uploadMedia(site.id, user.id, image, db);
});
