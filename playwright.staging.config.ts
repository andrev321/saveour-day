import { defineConfig } from "@playwright/test";
if (
  !process.env.STAGING_ADMIN_URL ||
  !process.env.STAGING_SITE_URL ||
  !process.env.STAGING_PANEL_STORAGE_STATE
)
  throw new Error(
    "Set staging URLs and STAGING_PANEL_STORAGE_STATE for a dedicated test account.",
  );
for (const value of [
  process.env.STAGING_ADMIN_URL,
  process.env.STAGING_SITE_URL,
])
  if (!value.includes("staging"))
    throw new Error("Smoke tests may only target staging hosts.");
export default defineConfig({
  testDir: "tests/staging",
  workers: 1,
  timeout: 120000,
  use: {
    browserName: "chromium",
    extraHTTPHeaders: { Origin: process.env.STAGING_ADMIN_URL! },
    storageState: JSON.parse(process.env.STAGING_PANEL_STORAGE_STATE),
    screenshot: "only-on-failure",
  },
});
