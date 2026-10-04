import { z } from "zod";
import {
  api,
  requireSite,
  readJson,
  serviceDb,
  required,
  checkDb,
  HttpError,
} from "../../../../../lib/server";
import { reminderPreview } from "../../../../../lib/reminders";
export const maxDuration = 180;
const id = (request: Request) => new URL(request.url).pathname.split("/")[3]!;
export const GET = api(async (request) => {
  const { site } = await requireSite(id(request));
  return reminderPreview(site);
});
export const POST = api(async (request) => {
  const { site, user } = await requireSite(id(request));
  const key = required("RESEND_API_KEY"),
    from = required("REMINDER_FROM");
  const payload = z
    .object({
      releaseId: z.uuid(),
      recipients: z
        .array(
          z.object({
            id: z.uuid(),
            email: z.email(),
            version: z.number().int().positive(),
            revision: z.number().int().nonnegative(),
          }),
        )
        .min(1)
        .max(10),
    })
    .parse(await readJson(request));
  if (payload.releaseId !== site.published_release_id)
    throw new HttpError(
      409,
      "Publikacja zmieniła się. Odśwież podgląd przypomnień.",
    );
  if (
    new Set(payload.recipients.map((r) => `${r.id}:${r.email}`)).size !==
    payload.recipients.length
  )
    throw new HttpError(400, "Powtórzony odbiorca.");
  const preview = await reminderPreview(site);
  const db = serviceDb();
  const results: { id: string; email: string; status: string }[] = [];
  for (const selected of payload.recipients) {
    const recipient = preview.recipients.find(
      (r) =>
        r.id === selected.id &&
        r.email === selected.email &&
        r.version === selected.version &&
        r.revision === selected.revision,
    );
    if (!recipient) {
      results.push({ ...selected, status: "changed" });
      continue;
    }
    const body = {
      from,
      to: [recipient.email],
      subject: recipient.subject,
      text: recipient.text,
    };
    const { data: claim, error } = await db.rpc("claim_reminder", {
      sid: site.id,
      actor: user.id,
      iid: recipient.id,
      expected_version: recipient.version,
      expected_rsvp: recipient.revision,
      recipient: recipient.email,
      message_payload: body,
    });
    checkDb(error);
    if (!claim) {
      results.push({ ...selected, status: "skipped" });
      continue;
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `rsvp-reminder-${claim.id}`,
        },
        body: JSON.stringify(claim.payload),
        signal: AbortSignal.timeout(10000),
      });
      const sent = await response.json();
      if (!response.ok || typeof sent.id !== "string")
        throw new Error("provider_rejected");
      const updated = await db
        .from("reminder_deliveries")
        .update({ status: "sent", provider_id: sent.id, lease_until: null })
        .eq("id", claim.id);
      checkDb(updated.error);
      results.push({ ...selected, status: "sent" });
    } catch {
      // Leave the lease for one minute. A retry uses exactly the same immutable payload and idempotency key.
      await db
        .from("reminder_deliveries")
        .update({ status: "failed" })
        .eq("id", claim.id);
      console.error(
        JSON.stringify({ event: "reminder.send.failed", deliveryId: claim.id }),
      );
      results.push({ ...selected, status: "failed" });
    }
  }
  return { results };
});
