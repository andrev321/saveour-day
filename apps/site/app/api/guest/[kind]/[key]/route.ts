import type { RsvpQuestion } from "@invitations/domain/rsvp-questions";
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
  const activeVariantId =
    activeInvitation?.variant_id ||
    ctx.site.public_variant_id ||
    result.config.defaultVariant;
  const eventIds = result.config.events.map((e) => e.id);

  const client = db();
  const [answersRes, questionsRes, qAnswersRes] = await Promise.all([
    activeInvitation && eventIds.length
      ? client
          .from("attendances")
          .select("guest_id,event_id,attending")
          .eq("site_id", ctx.site.id)
          .eq("invitation_id", activeInvitation.id)
          .in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    rsvpEnabled
      ? client
          .from("rsvp_questions")
          .select(
            "id,scope,type,label,help,required,allow_other,options,variant_ids,preset_key",
          )
          .eq("site_id", ctx.site.id)
          .order("position")
      : Promise.resolve({ data: [], error: null }),
    activeInvitation
      ? client
          .from("rsvp_question_answers")
          .select("question_id,guest_id,value")
          .eq("site_id", ctx.site.id)
          .eq("invitation_id", activeInvitation.id)
      : Promise.resolve({ data: [], error: null }),
  ]);

  check(answersRes.error);
  check(questionsRes.error);
  check(qAnswersRes.error);

  const questions: RsvpQuestion[] = (questionsRes.data || [])
    .map((q) => ({
      id: q.id as string,
      scope: q.scope as RsvpQuestion["scope"],
      type: q.type as RsvpQuestion["type"],
      label: q.label as string,
      help: (q.help as string | null) ?? null,
      required: Boolean(q.required),
      allowOther: Boolean(q.allow_other),
      options: (q.options as RsvpQuestion["options"]) || [],
      variantIds: (q.variant_ids as string[]) || [],
      presetKey: (q.preset_key as RsvpQuestion["presetKey"]) ?? null,
    }))
    .filter(
      (q) =>
        q.variantIds.length === 0 || q.variantIds.includes(activeVariantId),
    );

  const visibleQuestionIds = new Set(questions.map((q) => q.id));
  const questionAnswers = (qAnswersRes.data || [])
    .filter((a) => visibleQuestionIds.has(a.question_id as string))
    .map((a) => ({
      questionId: a.question_id as string,
      guestId: (a.guest_id as string | null) ?? null,
      value: a.value,
    }));

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
          groupName: activeInvitation.group_name,
          guests: activeInvitation.guests.map(({ id, kind, name }) => ({
            id,
            kind,
            name,
          })),
          revision: activeInvitation.rsvp_revision,
          note: activeInvitation.note,
          answers: answersRes.data || [],
          questionAnswers,
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
      action: z.enum([
        "code",
        "lookup",
        "lookup-reset",
        "self-register",
        "rsvp",
      ]),
      payload: z.unknown(),
    })
    .parse(await json(request));
  return executeGuestAction(ctx, body.action, body.payload, { request });
});
