import { defineConfig } from "@playwright/test";
const siteUrl = process.env.E2E_SITE_URL || "http://127.0.0.1:5173";
const adminUrl = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: siteUrl,
    headless: true,
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
      command: `node node_modules/next/dist/bin/next dev apps/site --hostname 127.0.0.1 --port ${new URL(siteUrl).port}`,
      url: siteUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: `node node_modules/next/dist/bin/next dev apps/admin --hostname 127.0.0.1 --port ${new URL(adminUrl).port}`,
      url: adminUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
