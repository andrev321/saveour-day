import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildInvitationEmail,
  buildOtpEmail,
  buildReminderEmail,
} from "../packages/domain/src/email.ts";
import {
  readAllPages,
  sendEmail,
  sendEmailBatch,
} from "../packages/email/src/index.ts";

test("email builders localize invitation, reminder, and OTP messages across pl-PL, en-US, and de-DE", () => {
  const base = {
    displayName: "Anna & Jan",
    label: "Rodzina Kowalskich",
    url: "https://invite.example.test/s/site-1",
    deadline: "2026-06-01",
  };

  const plInvite = buildInvitationEmail({ ...base, locale: "pl-PL" });
  assert.equal(plInvite.subject, "Zaproszenie: Anna & Jan");
  assert.ok(plInvite.text.includes("Cześć (Rodzina Kowalskich),"));
  assert.ok(plInvite.text.includes(base.url));
  assert.ok(plInvite.text.includes("2026-06-01"));

  const enInvite = buildInvitationEmail({ ...base, locale: "en-US" });
  assert.equal(enInvite.subject, "Invitation: Anna & Jan");
  assert.ok(enInvite.text.includes("Hello (Rodzina Kowalskich),"));
  assert.ok(enInvite.text.includes(base.url));
  assert.ok(enInvite.text.includes("2026-06-01"));

  const deInvite = buildInvitationEmail({
    ...base,
    locale: "de-DE",
    deadline: null,
  });
  assert.equal(deInvite.subject, "Einladung: Anna & Jan");
  assert.ok(deInvite.text.includes("Hallo (Rodzina Kowalskich),"));
  assert.ok(deInvite.text.includes(base.url));
  assert.ok(!deInvite.text.includes("Bitte antwortet bis zum:"));

  const plReminder = buildReminderEmail({ ...base, locale: "pl-PL" });
  assert.equal(plReminder.subject, "Przypomnienie o odpowiedzi (RSVP): Anna & Jan");
  assert.ok(plReminder.text.includes("Termin odpowiedzi: 2026-06-01."));

  const enReminder = buildReminderEmail({ ...base, locale: "en-US" });
  assert.equal(enReminder.subject, "RSVP Reminder: Anna & Jan");
  assert.ok(enReminder.text.includes("Please respond by: 2026-06-01."));

  const deReminder = buildReminderEmail({ ...base, locale: "de-DE" });
  assert.equal(
    deReminder.subject,
    "Erinnerung an eure Rückmeldung (RSVP): Anna & Jan",
  );
  assert.ok(deReminder.text.includes("Antwortfrist: 2026-06-01."));

  // Unknown locale falls back to en-US
  const fallbackInvite = buildInvitationEmail({ ...base, locale: "fr-FR" });
  assert.equal(fallbackInvite.subject, "Invitation: Anna & Jan");

  const plOtp = buildOtpEmail({
    locale: "pl-PL",
    displayName: "Anna & Jan",
    code: "482910",
  });
  assert.equal(plOtp.subject, "Kod dostępu: Anna & Jan");
  assert.ok(plOtp.subject.includes("Anna & Jan"));
  assert.ok(plOtp.text.includes("482910"));

  const enOtp = buildOtpEmail({
    locale: "en-US",
    displayName: "Anna & Jan",
    code: "482910",
  });
  assert.equal(enOtp.subject, "Access code: Anna & Jan");
  assert.ok(enOtp.subject.includes("Anna & Jan"));
  assert.ok(enOtp.text.includes("482910"));

  const deOtp = buildOtpEmail({
    locale: "de-DE",
    displayName: "Anna & Jan",
    code: "482910",
  });
  assert.equal(deOtp.subject, "Zugangscode: Anna & Jan");
  assert.ok(deOtp.subject.includes("Anna & Jan"));
  assert.ok(deOtp.text.includes("482910"));
});

test("sendEmail handles success, API error, 429 rate limit, and network failure", async () => {
  const captured: Array<{ url: string; headers: Record<string, string>; body: unknown }> = [];
  const okFetch: typeof fetch = async (input, init) => {
    captured.push({
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return Response.json({ id: "re_single_1" }, { status: 200 });
  };

  const okResult = await sendEmail(
    {
      apiKey: "re_test_key",
      from: "noreply@saveour.day",
      to: "guest@example.com",
      subject: "Subject",
      text: "Hello",
      idempotencyKey: "idem-1",
    },
    okFetch,
  );
  assert.deepEqual(okResult, {
    ok: true,
    providerId: "re_single_1",
    status: 200,
  });
  assert.equal(captured[0]!.url, "https://api.resend.com/emails");
  assert.equal(captured[0]!.headers.Authorization, "Bearer re_test_key");
  assert.equal(captured[0]!.headers["Idempotency-Key"], "idem-1");

  const rateLimitFetch: typeof fetch = async () =>
    Response.json({ message: "Too many requests" }, { status: 429 });
  const rateLimitResult = await sendEmail(
    {
      apiKey: "re_test_key",
      from: "noreply@saveour.day",
      to: "guest@example.com",
      subject: "Subject",
      text: "Hello",
    },
    rateLimitFetch,
  );
  assert.deepEqual(rateLimitResult, {
    ok: false,
    status: 429,
    error: "Too many requests",
  });

  const nonJsonErrorFetch: typeof fetch = async () =>
    new Response("Bad Gateway", { status: 502 });
  const nonJsonErrorResult = await sendEmail(
    {
      apiKey: "re_test_key",
      from: "noreply@saveour.day",
      to: "guest@example.com",
      subject: "Subject",
      text: "Hello",
    },
    nonJsonErrorFetch,
  );
  assert.deepEqual(nonJsonErrorResult, {
    ok: false,
    status: 502,
    error: "Resend API error (502)",
  });

  const networkErrorFetch: typeof fetch = async () => {
    throw new Error("ECONNRESET");
  };
  const networkResult = await sendEmail(
    {
      apiKey: "re_test_key",
      from: "noreply@saveour.day",
      to: "guest@example.com",
      subject: "Subject",
      text: "Hello",
    },
    networkErrorFetch,
  );
  assert.deepEqual(networkResult, {
    ok: false,
    error: "ECONNRESET",
  });
});

test("sendEmailBatch maps providerId per item, enforces 50-item limit, and maps 429/network errors", async () => {
  const empty = await sendEmailBatch(
    { apiKey: "re_test_key", items: [] },
    async () => {
      throw new Error("Should not fetch for empty batch");
    },
  );
  assert.deepEqual(empty, []);

  const tooManyItems = Array.from({ length: 51 }, (_, i) => ({
    id: `del-${i}`,
    from: "noreply@saveour.day",
    to: `guest${i}@example.com`,
    subject: "S",
    text: "T",
  }));
  await assert.rejects(
    () =>
      sendEmailBatch(
        { apiKey: "re_test_key", items: tooManyItems },
        async () => Response.json({}),
      ),
    /at most 50 items/,
  );

  const items = [
    {
      id: "del-1",
      from: "noreply@saveour.day",
      to: "a@example.com",
      subject: "Hello A",
      text: "Body A",
    },
    {
      id: "del-2",
      from: "noreply@saveour.day",
      to: "b@example.com",
      subject: "Hello B",
      text: "Body B",
    },
  ];

  const batchSuccess = await sendEmailBatch(
    { apiKey: "re_test_key", items, idempotencyKey: "batch-1" },
    async (input, init) => {
      assert.equal(String(input), "https://api.resend.com/emails/batch");
      const headers = (init?.headers ?? {}) as Record<string, string>;
      assert.equal(headers["Idempotency-Key"], "batch-1");
      return Response.json({ data: [{ id: "re_1" }, { id: "re_2" }] });
    },
  );
  assert.deepEqual(batchSuccess, [
    { id: "del-1", ok: true, providerId: "re_1" },
    { id: "del-2", ok: true, providerId: "re_2" },
  ]);

  const batchPartialMissingId = await sendEmailBatch(
    { apiKey: "re_test_key", items },
    async () => Response.json({ data: [{ id: "re_1" }] }),
  );
  assert.deepEqual(batchPartialMissingId, [
    { id: "del-1", ok: true, providerId: "re_1" },
    {
      id: "del-2",
      ok: false,
      error: "Missing providerId in Resend batch response",
    },
  ]);

  const batch429 = await sendEmailBatch(
    { apiKey: "re_test_key", items },
    async () => Response.json({ error: "Rate limit exceeded" }, { status: 429 }),
  );
  assert.deepEqual(batch429, [
    { id: "del-1", ok: false, error: "Rate limit exceeded" },
    { id: "del-2", ok: false, error: "Rate limit exceeded" },
  ]);

  const batchNetworkError = await sendEmailBatch(
    { apiKey: "re_test_key", items },
    async () => {
      throw new Error("socket hang up");
    },
  );
  assert.deepEqual(batchNetworkError, [
    { id: "del-1", ok: false, error: "socket hang up" },
    { id: "del-2", ok: false, error: "socket hang up" },
  ]);
});

test("readAllPages paginates across multiple pages and handles errors", async () => {
  const ranges: Array<[number, number]> = [];
  const dataset = ["a", "b", "c", "d", "e"];

  const all = await readAllPages<string>(
    async (from, to) => {
      ranges.push([from, to]);
      return { data: dataset.slice(from, to + 1), error: null };
    },
    undefined,
    2,
  );
  assert.deepEqual(all, dataset);
  assert.deepEqual(ranges, [
    [0, 1],
    [2, 3],
    [4, 5],
  ]);

  const exactRanges: Array<[number, number]> = [];
  const exactDataset = ["a", "b", "c", "d"];
  const exactAll = await readAllPages<string>(
    async (from, to) => {
      exactRanges.push([from, to]);
      return { data: exactDataset.slice(from, to + 1), error: null };
    },
    undefined,
    2,
  );
  assert.deepEqual(exactAll, exactDataset);
  assert.deepEqual(exactRanges, [
    [0, 1],
    [2, 3],
    [4, 5],
  ]);

  let capturedError: string | undefined;
  const partial = await readAllPages<string>(
    async (from) => {
      if (from === 0) return { data: ["x", "y"], error: null };
      return { data: null, error: { message: "db timeout" } };
    },
    (err) => {
      capturedError = err.message;
    },
    2,
  );
  assert.deepEqual(partial, ["x", "y"]);
  assert.equal(capturedError, "db timeout");
});

test("EMAIL_BATCH_LIMIT caps batch size and sendEmailBatch forwards idempotencyKey", async () => {
  const { EMAIL_BATCH_LIMIT } = await import("../packages/domain/src/email.ts");
  assert.equal(EMAIL_BATCH_LIMIT, 50);

  let seenKey = "";
  const items = Array.from({ length: EMAIL_BATCH_LIMIT }, (_, idx) => ({
    id: `id-${idx}`,
    from: "noreply@saveour.day",
    to: `g${idx}@example.com`,
    subject: "S",
    text: "T",
  }));
  const res = await sendEmailBatch(
    { apiKey: "re_test_key", items, idempotencyKey: "batch-limit-50" },
    async (_url, init) => {
      seenKey = ((init?.headers ?? {}) as Record<string, string>)["Idempotency-Key"] ?? "";
      return Response.json({
        data: items.map((_, idx) => ({ id: `re_${idx}` })),
      });
    },
  );
  assert.equal(seenKey, "batch-limit-50");
  assert.equal(res.length, EMAIL_BATCH_LIMIT);
  assert.ok(res.every((r) => r.ok));
});
