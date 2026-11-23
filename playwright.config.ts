import { defineConfig } from "@playwright/test";
const siteUrl = process.env.E2E_SITE_URL || "http://127.0.0.1:5173";
const adminUrl = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
const nextMode = process.env.CI || process.env.E2E_BUILT ? "start" : "dev";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "webkit",
      use: { browserName: "webkit" },
      testMatch:
        /.*(guest|workspace|photo-selectors|product-review|motion)\.spec\.ts/,
    },
  ],
  workers: process.env.CI ? 3 : undefined,
  // One retry on CI surfaces flakes as "flaky" (with a trace) instead of failing the job.
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: siteUrl,
    headless: true,
    trace: "on-first-retry",
    launchOptions: process.env.E2E_CHROMIUM_PATH
      ? {
          executablePath: process.env.E2E_CHROMIUM_PATH,
          args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
        }
      : undefined,
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `node node_modules/next/dist/bin/next ${nextMode} apps/site --hostname 127.0.0.1 --port ${new URL(siteUrl).port}`,
      url: siteUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: `node node_modules/next/dist/bin/next ${nextMode} apps/admin --hostname 127.0.0.1 --port ${new URL(adminUrl).port}`,
      url: adminUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: { E2E_DEMO: "1" },
    },
  ],
});
