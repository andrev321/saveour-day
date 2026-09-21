import fs from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

const filename = path.resolve(process.argv[2] || "apps/admin/.env.production.local");
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_URL",
  "VERCEL_TOKEN",
  "VERCEL_TEAM_ID",
  "VERCEL_GITHUB_REPO_ID",
  "ENGINE_GIT_SHA",
  "VERCEL_WEBHOOK_SECRET",
] as const;

let env: Record<string, string | undefined>;
try {
  env = parseEnv(await fs.readFile(filename, "utf8"));
} catch {
  throw new Error(`Nie można odczytać pliku konfiguracji: ${filename}`);
}

const errors = required
  .filter((name) => !env[name]?.trim())
  .map((name) => `Brakuje ${name}`);

function requireHttps(name: "APP_URL" | "NEXT_PUBLIC_SUPABASE_URL") {
  const value = env[name];
  if (!value) return;
  try {
    if (new URL(value).protocol !== "https:") errors.push(`${name} musi używać HTTPS`);
  } catch {
    errors.push(`${name} nie jest prawidłowym adresem URL`);
  }
}

requireHttps("APP_URL");
requireHttps("NEXT_PUBLIC_SUPABASE_URL");

if (env.ENGINE_GIT_SHA && !/^[a-f0-9]{40}$/.test(env.ENGINE_GIT_SHA)) {
  errors.push("ENGINE_GIT_SHA musi zawierać pełny, 40-znakowy SHA commitu");
}
if (
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.SUPABASE_SERVICE_ROLE_KEY
) {
  errors.push("Klucz publiczny Supabase nie może być kluczem service_role");
}
if (env.VERCEL_WEBHOOK_SECRET && env.VERCEL_WEBHOOK_SECRET.length < 32) {
  errors.push("VERCEL_WEBHOOK_SECRET musi mieć co najmniej 32 znaki");
}

if (errors.length) throw new Error(errors.join("\n"));
console.log(`Konfiguracja produkcyjna jest kompletna: ${required.length} wymaganych zmiennych.`);
