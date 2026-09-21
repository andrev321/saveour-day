import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "apps/site"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CLIENT_ID: process.argv[2] || "demo-ivory",
      SITE_CONFIG: "",
      RELEASE_MANIFEST_URL: "",
    },
  },
);
process.exit(result.status ?? 1);
