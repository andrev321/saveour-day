// Mirrors the GitHub Actions E2E job locally: production builds, `next start`,
// Chromium + WebKit, 3 workers, and no reuse of an already running dev server.
// Stop any local `next dev` first: builds overwrite apps/*/.next and the ports must be free.
// Extra arguments are passed to Playwright, e.g. `npm run test:e2e:ci -- --project=webkit`.
import { spawnSync } from "node:child_process";

const env = { ...process.env, CI: "1" };

function step(command: string) {
  console.log(`\n> ${command}`);
  const result = spawnSync(command, { stdio: "inherit", shell: true, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

step("npx tsx scripts/run-parallel.ts build:demo build:admin");
step(`npx playwright test ${process.argv.slice(2).join(" ")}`.trimEnd());
