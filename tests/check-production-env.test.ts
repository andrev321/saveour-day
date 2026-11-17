import { test } from "node:test";
import assert from "node:assert/strict";
import { validateProductionEnv } from "../scripts/check-production-env.ts";

const validAdminEnv = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
  APP_URL: "https://admin.saveour.day",
  SITE_URL: "https://saveour.day",
  RESEND_API_KEY: "re_live_123",
  MAIL_FROM: "saveour.day <powiadomienia@saveour.day>",
};

test("validateProductionEnv accepts valid admin and site production configuration and enforces HTTPS, key separation and verified sender", () => {
  assert.deepEqual(validateProductionEnv(validAdminEnv), {
    errors: [],
    requiredCount: 7,
  });

  assert.deepEqual(
    validateProductionEnv(
      { ...validAdminEnv, APP_URL: undefined },
      { site: true },
    ),
    {
      errors: [],
      requiredCount: 6,
    },
  );

  const missingEmail = validateProductionEnv({
    ...validAdminEnv,
    RESEND_API_KEY: "",
    MAIL_FROM: "",
  });
  assert.deepEqual(missingEmail.errors, [
    "Missing RESEND_API_KEY",
    "Missing MAIL_FROM",
  ]);

  assert.deepEqual(
    validateProductionEnv(
      { ...validAdminEnv, RESEND_API_KEY: "", MAIL_FROM: "" },
      { skipEmail: true },
    ).errors,
    [],
  );

  const invalid = validateProductionEnv({
    ...validAdminEnv,
    APP_URL: "http://admin.saveour.day/path",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "same",
    SUPABASE_SERVICE_ROLE_KEY: "same",
    MAIL_FROM: "Test <onboarding@resend.dev>",
  });
  assert.ok(invalid.errors.includes("APP_URL must use HTTPS"));
  assert.ok(
    invalid.errors.includes(
      "APP_URL must specify the domain only, without path or credentials",
    ),
  );
  assert.ok(
    invalid.errors.includes(
      "Supabase publishable key cannot be the service_role key",
    ),
  );
  assert.ok(
    invalid.errors.includes(
      "MAIL_FROM cannot use the restricted test sender onboarding@resend.dev in production",
    ),
  );
});
