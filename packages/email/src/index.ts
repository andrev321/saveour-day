import { EMAIL_BATCH_LIMIT } from "@invitations/domain/email";

const RESEND_API_BASE = "https://api.resend.com";
const REQUEST_TIMEOUT_MS = 15000;
const MAX_BATCH_SIZE = EMAIL_BATCH_LIMIT;

export interface SendEmailInput {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  providerId?: string;
  status?: number;
  error?: string;
}

export interface SendEmailBatchItem {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

export interface SendEmailBatchInput {
  apiKey: string;
  items: SendEmailBatchItem[];
  idempotencyKey?: string;
}

export interface SendEmailBatchItemResult {
  id: string;
  ok: boolean;
  providerId?: string;
  error?: string;
}

function buildHeaders(apiKey: string, idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Resend API error (${response.status})`;
  try {
    const body = (await response.json()) as {
      message?: unknown;
      error?: unknown;
    } | null;
    if (body && typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    if (body && typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Ignore non-JSON error payloads and fall back to status code message.
  }
  return fallback;
}

export async function sendEmail(
  input: SendEmailInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SendEmailResult> {
  try {
    const response = await fetchImpl(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: buildHeaders(input.apiKey, input.idempotencyKey),
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: await readErrorMessage(response),
      };
    }

    const payload = (await response.json()) as { id?: unknown } | null;
    const providerId =
      payload && typeof payload.id === "string" ? payload.id : undefined;

    return {
      ok: true,
      providerId,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendEmailBatch(
  input: SendEmailBatchInput,
  fetchImpl: typeof fetch = fetch,
): Promise<SendEmailBatchItemResult[]> {
  if (input.items.length > MAX_BATCH_SIZE) {
    throw new Error(
      `sendEmailBatch supports at most ${MAX_BATCH_SIZE} items per call (received ${input.items.length}).`,
    );
  }

  if (input.items.length === 0) {
    return [];
  }

  try {
    const response = await fetchImpl(`${RESEND_API_BASE}/emails/batch`, {
      method: "POST",
      headers: buildHeaders(input.apiKey, input.idempotencyKey),
      body: JSON.stringify(
        input.items.map(({ from, to, subject, text }) => ({
          from,
          to,
          subject,
          text,
        })),
      ),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const error = await readErrorMessage(response);
      return input.items.map((item) => ({
        id: item.id,
        ok: false,
        error,
      }));
    }

    const payload = (await response.json()) as {
      data?: Array<{ id?: unknown }>;
    } | null;
    const records = Array.isArray(payload?.data) ? payload.data : [];

    return input.items.map((item, index) => {
      const record = records[index];
      const providerId =
        record && typeof record.id === "string" && record.id.length > 0
          ? record.id
          : undefined;
      if (!providerId) {
        return {
          id: item.id,
          ok: false,
          error: "Missing providerId in Resend batch response",
        };
      }
      return {
        id: item.id,
        ok: true,
        providerId,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return input.items.map((item) => ({
      id: item.id,
      ok: false,
      error: message,
    }));
  }
}

export async function readAllPages<T>(
  readPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  onError?: (error: { message: string }) => void,
  pageSize = 500,
): Promise<T[]> {
  const size = Math.max(1, Math.floor(pageSize));
  const results: T[] = [];
  let from = 0;

  while (true) {
    const to = from + size - 1;
    const { data, error } = await readPage(from, to);
    if (error) {
      onError?.(error);
      break;
    }
    if (!data || data.length === 0) {
      break;
    }
    results.push(...data);
    if (data.length < size) {
      break;
    }
    from += size;
  }

  return results;
}
