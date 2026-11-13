import { defaultQuestions } from "@invitations/domain/operations";
import { z } from "zod";
import { executeGuestAction } from "../../../../../lib/guest-actions";
import {
  allowed,
  check,
  content,
  context,
  db,
  endpoint,
  json,
} from "../../../../../lib/server";
const readContext = (r: Request) => {
  const parts = new URL(r.url).pathname.split("/");
  return context(parts[3], parts[4]);
};
export const GET = endpoint(async (request) => {
  const ctx = await readContext(request);
  if (!(await allowed(ctx))) {
    return {
      mode: ctx.site.access_mode,
      authorized: false,
      requiresLink: ctx.requiresSession,
    };
  }
  const result = await content(ctx);
  const rsvpEnabled = ctx.site.rsvp_enabled ?? true;
  const activeInvitation = rsvpEnabled ? ctx.invitation : null;
  const eventIds = result.config.events.map((e) => e.id);
  const { data: answers, error } =
    activeInvitation && eventIds.length
      ? await db()
          .from("rsvp_answers")
          .select("guest_id,event_id,attending")
          .eq("site_id", ctx.site.id)
          .eq("invitation_id", activeInvitation.id)
          .in("event_id", eventIds)
      : { data: [], error: null };
  check(error);
  const questions = ctx.site.rsvp_questions || defaultQuestions;
  const allGuests = activeInvitation
    ? [
        ...activeInvitation.guests,
        ...(activeInvitation.plus_one ? [activeInvitation.plus_one] : []),
      ]
    : [];
  return {
    authorized: true,
    mode: ctx.site.access_mode,
    rsvpEnabled,
    allowSelfRegistration: Boolean(ctx.site.allow_self_registration),
    canResetLookup:
      new URL(request.url).pathname.split("/")[3] === "s" &&
      Boolean(activeInvitation),
    config: result.config,
    invitation: activeInvitation
      ? {
          label: activeInvitation.label,
          guests: activeInvitation.guests,
          allowPlusOne: activeInvitation.allow_plus_one,
          plusOne: activeInvitation.plus_one,
          revision: activeInvitation.rsvp_revision,
          note: activeInvitation.note,
          details: Object.fromEntries(
            allGuests.map((g) => {
              const detail = activeInvitation.guest_details?.[g.id] || {};
              return [
                g.id,
                Object.fromEntries(
                  Object.entries(detail).filter(
                    ([key]) => questions[key as keyof typeof questions],
                  ),
                ),
              ];
            }),
          ),
          answers: answers || [],
        }
      : null,
    questions,
    deadline: ctx.site.rsvp_deadline,
    closed:
      !!ctx.site.rsvp_deadline &&
      new Date(ctx.site.rsvp_deadline).getTime() < Date.now(),
  };
});
export const POST = endpoint(async (request) => {
  const ctx = await readContext(request);
  const body = z
    .object({
      action: z.enum(["code", "lookup", "lookup-reset", "self-register", "rsvp"]),
      payload: z.unknown(),
    })
    .parse(await json(request));
  return executeGuestAction(ctx, body.action, body.payload, { request });
});
