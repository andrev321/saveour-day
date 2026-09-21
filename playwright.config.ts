import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --port 5173",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: "npm run dev:admin",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
