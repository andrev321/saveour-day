import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["node_modules/next/dist/bin/next", "build", "apps/site"],
  { stdio: "inherit", env: { ...process.env } },
);
process.exit(result.status ?? 1);
