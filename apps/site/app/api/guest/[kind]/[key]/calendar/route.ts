import { calendarFile } from "@invitations/domain/operations";
import {
  allowed,
  context,
  content,
  endpoint,
  GuestError,
} from "../../../../../../lib/server";
export const GET = endpoint(async (request) => {
  const parts = new URL(request.url).pathname.split("/");
  const ctx = await context(parts[3], parts[4]);
  if (!(await allowed(ctx)))
    throw new GuestError(401, "Otwórz zaproszenie, aby potwierdzić dostęp");
  const result = await content(ctx);
  return new Response(calendarFile(result.config), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="invitation.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
});
