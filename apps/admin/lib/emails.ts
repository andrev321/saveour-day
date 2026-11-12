import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { publicSiteUrl, siteConfigSchema } from "@invitations/domain";
import {
  buildInvitationEmail,
  buildReminderEmail,
  EMAIL_BATCH_LIMIT,
} from "@invitations/domain/email";
import { guestContent } from "@invitations/domain/guest";
import { readAllPages, sendEmailBatch } from "@invitations/email";
import { checkDb, HttpError, required, serviceDb } from "./server";

export const DAILY_EMAIL_LIMIT = EMAIL_BATCH_LIMIT;

export type EmailCampaignKind = "invitation" | "reminder";

export type EmailCampaignRecipient = {
  id: string;
  label: string;
  email: string;
  version: number;
  revision: number;
  subject: string;
  text: string;
};

export type EmailCampaignPreview = {
  configured: boolean;
  dailyLimit: number;
  usedToday: number;
  invitationRecipients: EmailCampaignRecipient[];
  reminderRecipients: EmailCampaignRecipient[];
  releaseId: string;
};

export type EmailCampaignSendResult = {
  id: string;
  email: string;
  status: "sent" | "failed" | "changed" | "skipped";
};

export type EmailCampaignSite = {
  id: string;
  access_mode: string;
  published_release_id: string | null;
  rsvp_deadline: string | null;
};

export const sendEmailCampaignSchema = z.object({
  kind: z.enum(["invitation", "reminder"]),
  releaseId: z.uuid(),
  recipients: z
    .array(
      z.object({
        id: z.uuid(),
        email: z.email().transform((s) => s.toLowerCase()),
        version: z.number().int().positive(),
        revision: z.number().int().nonnegative(),
      }),
    )
    .min(1)
    .max(DAILY_EMAIL_LIMIT),
});

export type SendEmailCampaignInput = z.infer<typeof sendEmailCampaignSchema>;

export type EmailCampaignDeps = {
  db?: ReturnType<typeof serviceDb>;
  siteUrl?: string;
  apiKey?: string;
  mailFrom?: string;
  sendBatch?: typeof sendEmailBatch;
  now?: () => Date;
};

type ClaimedEmailItem = {
  id: string;
  invitationId: string;
  email: string;
  payload: {
    from: string;
    to: string;
    subject: string;
    text: string;
  };
};

async function countUsedToday(
  db: ReturnType<typeof serviceDb>,
  siteId: string,
  now: Date,
): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  const deliveriesToday = await readAllPages<{
    status: string;
    lease_until: string | null;
  }>(
    (from, to) =>
      db
        .from("email_deliveries")
        .select("status,lease_until")
        .eq("site_id", siteId)
        .eq("day", today)
        .range(from, to),
    checkDb,
  );
  return deliveriesToday.filter(
    (row) =>
      row.status === "sent" ||
      (row.status === "pending" &&
        row.lease_until !== null &&
        Date.parse(row.lease_until) > now.getTime()),
  ).length;
}

export async function previewEmailCampaign(
  site: EmailCampaignSite,
  deps?: EmailCampaignDeps,
): Promise<EmailCampaignPreview> {
  if (site.access_mode !== "email" || !site.published_release_id) {
    throw new HttpError(
      409,
      "Wysyłka e-mail wymaga opublikowanego zaproszenia z dostępem e-mail.",
    );
  }

  const db = deps?.db ?? serviceDb();
  const now = deps?.now ? deps.now() : new Date();
  const siteUrl = deps?.siteUrl ?? required("SITE_URL");

  const { data: release, error: releaseError } = await db
    .from("releases")
    .select("config")
    .eq("site_id", site.id)
    .eq("id", site.published_release_id)
    .single();
  checkDb(releaseError);
  if (!release) {
    throw new HttpError(404, "Strona jest niedostępna.");
  }

  const config = siteConfigSchema.parse(release.config);

  const [invitations, answers, sentInvitationDeliveries, usedToday] =
    await Promise.all([
      readAllPages<{
        id: string;
        label: string;
        version: number;
        rsvp_revision: number;
        variant_id: string;
        guests: { id: string; name: string }[];
        emails: string[];
      }>(
        (from, to) =>
          db
            .from("invitations")
            .select("id,label,version,rsvp_revision,variant_id,guests,emails")
            .eq("site_id", site.id)
            .eq("revoked", false)
            .order("id")
            .range(from, to),
        checkDb,
      ),
      readAllPages<{
        invitation_id: string;
        guest_id: string;
        event_id: string;
      }>(
        (from, to) =>
          db
            .from("rsvp_answers")
            .select("invitation_id,guest_id,event_id")
            .eq("site_id", site.id)
            .order("invitation_id")
            .order("guest_id")
            .order("event_id")
            .range(from, to),
        checkDb,
      ),
      readAllPages<{
        invitation_id: string;
        email: string;
      }>(
        (from, to) =>
          db
            .from("email_deliveries")
            .select("invitation_id,email")
            .eq("site_id", site.id)
            .eq("kind", "invitation")
            .eq("status", "sent")
            .range(from, to),
        checkDb,
      ),
      countUsedToday(db, site.id, now),
    ]);

  const knownAnswers = new Set(
    answers.map((a) => `${a.invitation_id}:${a.guest_id}:${a.event_id}`),
  );
  const sentInvitationKeys = new Set(
    sentInvitationDeliveries.map(
      (d) => `${d.invitation_id}:${d.email.toLowerCase()}`,
    ),
  );

  const locale = config.locale;
  const displayName = config.identity.displayName;
  const url = publicSiteUrl(site.id, siteUrl);
  const formattedDeadline = site.rsvp_deadline
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Warsaw",
      }).format(new Date(site.rsvp_deadline))
    : null;

  const deadlinePassed =
    !!site.rsvp_deadline && Date.parse(site.rsvp_deadline) <= now.getTime();

  const validInvitations = invitations.filter(
    (i) =>
      i.emails.length > 0 &&
      config.variants.some((v) => v.id === i.variant_id),
  );

  const invitationRecipients: EmailCampaignRecipient[] =
    validInvitations.flatMap((i) =>
      i.emails
        .filter(
          (email) =>
            !sentInvitationKeys.has(`${i.id}:${email.toLowerCase()}`),
        )
        .map((email) => {
          const message = buildInvitationEmail({
            locale,
            displayName,
            label: i.label,
            url,
            deadline: formattedDeadline,
          });
          return {
            id: i.id,
            label: i.label,
            email: email.toLowerCase(),
            version: i.version,
            revision: i.rsvp_revision,
            subject: message.subject,
            text: message.text,
          };
        }),
    );

  const reminderRecipients: EmailCampaignRecipient[] = deadlinePassed
    ? []
    : validInvitations
        .filter((i) => {
          const events = guestContent(config, i.variant_id).events;
          return i.guests.some((g) =>
            events.some((e) => !knownAnswers.has(`${i.id}:${g.id}:${e.id}`)),
          );
        })
        .flatMap((i) =>
          i.emails.map((email) => {
            const message = buildReminderEmail({
              locale,
              displayName,
              label: i.label,
              url,
              deadline: formattedDeadline,
            });
            return {
              id: i.id,
              label: i.label,
              email: email.toLowerCase(),
              version: i.version,
              revision: i.rsvp_revision,
              subject: message.subject,
              text: message.text,
            };
          }),
        );

  const apiKey = deps?.apiKey ?? process.env.RESEND_API_KEY;
  const mailFrom = deps?.mailFrom ?? process.env.MAIL_FROM;

  return {
    configured: Boolean(apiKey && mailFrom),
    dailyLimit: DAILY_EMAIL_LIMIT,
    usedToday,
    invitationRecipients,
    reminderRecipients,
    releaseId: site.published_release_id,
  };
}

export async function sendEmailCampaign(
  site: EmailCampaignSite,
  user: { id: string },
  input: SendEmailCampaignInput,
  deps?: EmailCampaignDeps,
): Promise<{ results: EmailCampaignSendResult[]; usedToday: number }> {
  const parsed = sendEmailCampaignSchema.parse(input);
  if (parsed.releaseId !== site.published_release_id) {
    throw new HttpError(
      409,
      "Publikacja zmieniła się. Odśwież podgląd wysyłki.",
    );
  }
  if (
    new Set(parsed.recipients.map((r) => `${r.id}:${r.email}`)).size !==
    parsed.recipients.length
  ) {
    throw new HttpError(400, "Powtórzony odbiorca.");
  }

  const apiKey = deps?.apiKey ?? required("RESEND_API_KEY");
  const mailFrom = deps?.mailFrom ?? required("MAIL_FROM");
  const db = deps?.db ?? serviceDb();
  const sendBatch = deps?.sendBatch ?? sendEmailBatch;
  const now = deps?.now ? deps.now() : new Date();

  const preview = await previewEmailCampaign(site, {
    ...deps,
    db,
    apiKey,
    mailFrom,
    now: () => now,
  });

  const eligible =
    parsed.kind === "invitation"
      ? preview.invitationRecipients
      : preview.reminderRecipients;

  const resultsByKey = new Map<string, EmailCampaignSendResult>();
  const claimItems: Array<{
    invitationId: string;
    email: string;
    expectedVersion: number;
    expectedRsvp: number;
    payload: {
      from: string;
      to: string;
      subject: string;
      text: string;
    };
  }> = [];

  for (const selected of parsed.recipients) {
    const key = `${selected.id}:${selected.email}`;
    const recipient = eligible.find(
      (r) =>
        r.id === selected.id &&
        r.email === selected.email &&
        r.version === selected.version &&
        r.revision === selected.revision,
    );
    if (!recipient) {
      resultsByKey.set(key, {
        id: selected.id,
        email: selected.email,
        status: "changed",
      });
      continue;
    }
    claimItems.push({
      invitationId: recipient.id,
      email: recipient.email,
      expectedVersion: recipient.version,
      expectedRsvp: recipient.revision,
      payload: {
        from: mailFrom,
        to: recipient.email,
        subject: recipient.subject,
        text: recipient.text,
      },
    });
  }

  if (claimItems.length > 0) {
    const { data: claimData, error: claimError } = await db.rpc(
      "claim_email_batch",
      {
        sid: site.id,
        actor: user.id,
        kind: parsed.kind,
        items: claimItems,
        daily_site_limit: DAILY_EMAIL_LIMIT,
      },
    );
    checkDb(claimError);

    const claimed = (Array.isArray(claimData) ? claimData : []) as ClaimedEmailItem[];
    const claimedByKey = new Map(
      claimed.map((c) => [`${c.invitationId}:${c.email.toLowerCase()}`, c]),
    );

    for (const item of claimItems) {
      const key = `${item.invitationId}:${item.email}`;
      if (!claimedByKey.has(key)) {
        resultsByKey.set(key, {
          id: item.invitationId,
          email: item.email,
          status: "skipped",
        });
      }
    }

    if (claimed.length > 0) {
      const idempotencyKey = `email-batch-${parsed.kind}-${createHash("sha256")
        .update(claimed.map((c) => c.id).sort().join(","))
        .digest("hex")}`;
      const batchResults = await sendBatch({
        apiKey,
        idempotencyKey,
        items: claimed.map((c) => ({
          id: c.id,
          from: c.payload.from,
          to: c.payload.to,
          subject: c.payload.subject,
          text: c.payload.text,
        })),
      });

      const { error: finalizeError } = await db.rpc("finalize_email_batch", {
        results: batchResults.map((r) => ({
          id: r.id,
          status: r.ok ? "sent" : "failed",
          ...(r.providerId ? { providerId: r.providerId } : {}),
        })),
      });
      checkDb(finalizeError);

      const claimedById = new Map(claimed.map((c) => [c.id, c]));
      for (const batchResult of batchResults) {
        const item = claimedById.get(batchResult.id);
        if (!item) continue;
        const key = `${item.invitationId}:${item.email.toLowerCase()}`;
        resultsByKey.set(key, {
          id: item.invitationId,
          email: item.email,
          status: batchResult.ok ? "sent" : "failed",
        });
      }
    }
  }

  const usedToday = await countUsedToday(db, site.id, now);
  const results = parsed.recipients.map(
    (r) =>
      resultsByKey.get(`${r.id}:${r.email}`) ?? {
        id: r.id,
        email: r.email,
        status: "failed" as const,
      },
  );

  return { results, usedToday };
}
