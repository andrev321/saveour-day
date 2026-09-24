import fs from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";

const args = process.argv.slice(2);
const site = args.includes("--site");
const filename = path.resolve(
  args.find((arg) => arg !== "--site") ||
    `apps/${site ? "site" : "admin"}/.env.production.local`,
);
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  ...(site ? [] : ["APP_URL"]),
  "SITE_URL",
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

function requireHttps(
  name: "APP_URL" | "SITE_URL" | "NEXT_PUBLIC_SUPABASE_URL",
) {
  const value = env[name];
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") errors.push(`${name} musi używać HTTPS`);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      errors.push(
        `${name} musi wskazywać samą domenę bez ścieżki i danych logowania`,
      );
  } catch {
    errors.push(`${name} nie jest prawidłowym adresem URL`);
  }
}

requireHttps("APP_URL");
requireHttps("SITE_URL");
requireHttps("NEXT_PUBLIC_SUPABASE_URL");

if (
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.SUPABASE_SERVICE_ROLE_KEY
) {
  errors.push("Klucz publiczny Supabase nie może być kluczem service_role");
}

if (errors.length) throw new Error(errors.join("\n"));
console.log(
  `Konfiguracja produkcyjna jest kompletna: ${required.length} wymaganych zmiennych.`,
);
