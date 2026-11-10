import { test, mock } from "node:test";
import assert from "node:assert/strict";

test("admin auth confirm handles OAuth code exchange, oauth errors and OTP verification", async () => {
  let exchangeCodeResult: { error: Error | null } = { error: null };
  let verifyOtpResult: { error: Error | null } = { error: null };
  let lastExchangedCode: string | null = null;
  let lastVerifiedOtp: { token_hash: string; type: string } | null = null;

  const fakeDb = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        lastExchangedCode = code;
        return exchangeCodeResult;
      },
      verifyOtp: async (params: { token_hash: string; type: string }) => {
        lastVerifiedOtp = params;
        return verifyOtpResult;
      },
    },
  };

  mock.module("server-only", { namedExports: {} });
  mock.module("../apps/admin/lib/server.ts", {
    namedExports: {
      sessionDb: async () => fakeDb,
    },
  });

  const { GET } = await import("../apps/admin/app/auth/confirm/route.ts");

  // 1. OAuth code exchange success -> redirects to /
  {
    exchangeCodeResult = { error: null };
    const req = new Request("https://admin.example.com/auth/confirm?code=valid-code-123");
    const res = await GET(req);
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://admin.example.com/");
    assert.equal(lastExchangedCode, "valid-code-123");
  }

  // 2. OAuth code exchange error -> redirects to /?error=oauth_failed
  {
    exchangeCodeResult = { error: new Error("invalid code") };
    const req = new Request("https://admin.example.com/auth/confirm?code=bad-code");
    const res = await GET(req);
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://admin.example.com/?error=oauth_failed");
  }

  // 3. OAuth provider error param -> redirects with error
  {
    const req = new Request("https://admin.example.com/auth/confirm?error=access_denied&error_description=User+cancelled");
    const res = await GET(req);
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://admin.example.com/?error=access_denied");
  }

  // 4. OTP signup verification success -> redirects to /?emailConfirmed=1
  {
    verifyOtpResult = { error: null };
    const req = new Request("https://admin.example.com/auth/confirm?token_hash=token123&type=signup");
    const res = await GET(req);
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://admin.example.com/?emailConfirmed=1");
    assert.deepEqual(lastVerifiedOtp, { token_hash: "token123", type: "signup" });
  }

  // 5. OTP recovery verification success -> redirects to /account
  {
    verifyOtpResult = { error: null };
    const req = new Request("https://admin.example.com/auth/confirm?token_hash=token456&type=recovery");
    const res = await GET(req);
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://admin.example.com/account");
  }

  // 6. Unknown / expired params -> redirects to /?error=expired
  {
    const req = new Request("https://admin.example.com/auth/confirm");
    const res = await GET(req);
    assert.equal(res.status, 307);
    assert.equal(res.headers.get("location"), "https://admin.example.com/?error=expired");
  }
});
