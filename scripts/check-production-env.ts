import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

export type ProductionEnvOptions = {
  site?: boolean;
  skipEmail?: boolean;
};

const EMAIL_PATTERN =
  /^(?:[^<>]+\s+<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))$/;

export function validateProductionEnv(
  env: Record<string, string | undefined>,
  options: ProductionEnvOptions = {},
): { errors: string[]; requiredCount: number } {
  const { site = false, skipEmail = false } = options;
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    ...(site ? [] : ["APP_URL"]),
    "SITE_URL",
    ...(skipEmail ? [] : ["RESEND_API_KEY", "MAIL_FROM"]),
  ] as const;

  const errors = required
    .filter((name) => !env[name]?.trim())
    .map((name) => `Missing ${name}`);

  function requireHttps(
    name: "APP_URL" | "SITE_URL" | "NEXT_PUBLIC_SUPABASE_URL",
  ) {
    const value = env[name];
    if (!value) return;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") errors.push(`${name} must use HTTPS`);
      if (
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        errors.push(
          `${name} must specify the domain only, without path or credentials`,
        );
    } catch {
      errors.push(`${name} is not a valid URL`);
    }
  }

  requireHttps("APP_URL");
  requireHttps("SITE_URL");
  requireHttps("NEXT_PUBLIC_SUPABASE_URL");

  if (
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    errors.push("Supabase publishable key cannot be the service_role key");
  }

  const mailFrom = env.MAIL_FROM?.trim();
  if (!skipEmail && mailFrom) {
    const match = EMAIL_PATTERN.exec(mailFrom);
    const address = (match?.[1] || match?.[2] || "").toLowerCase();
    if (!address) {
      errors.push(
        "MAIL_FROM must be a valid email address or 'Name <email@domain>'",
      );
    } else if (address === "onboarding@resend.dev") {
      errors.push(
        "MAIL_FROM cannot use the restricted test sender onboarding@resend.dev in production",
      );
    }
  }

  return { errors, requiredCount: required.length };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const site = args.includes("--site");
  const skipEmail = args.includes("--skip-email");
  const filename = path.resolve(
    args.find((arg) => !arg.startsWith("--")) ||
      `apps/${site ? "site" : "admin"}/.env.production.local`,
  );

  let env: Record<string, string | undefined>;
  try {
    env = parseEnv(await fs.readFile(filename, "utf8"));
  } catch {
    throw new Error(`Cannot read configuration file: ${filename}`);
  }

  const { errors, requiredCount } = validateProductionEnv(env, {
    site,
    skipEmail,
  });
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    `Production configuration is complete: ${requiredCount} required variables.`,
  );
}
