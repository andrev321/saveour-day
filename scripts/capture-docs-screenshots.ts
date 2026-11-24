import { spawn, type ChildProcess } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";
import { guestContent } from "../packages/domain/src/guest.ts";
import { createTemplate } from "../packages/domain/src/templates.ts";

const SITE_PORT = 5273;
const ADMIN_PORT = 3100;
const SITE_URL = process.env.E2E_SITE_URL || `http://127.0.0.1:${SITE_PORT}`;
const ADMIN_URL = process.env.E2E_ADMIN_URL || `http://127.0.0.1:${ADMIN_PORT}`;
const OUT_DIR = "docs/images";

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForUrl(url: string, timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isReachable(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startNextApp(
  appDir: string,
  port: number,
  extraEnv?: Record<string, string>,
): ChildProcess {
  return spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      appDir,
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      stdio: "ignore",
      env: { ...process.env, ...extraEnv },
    },
  );
}

async function waitForPreviewReady(page: Page): Promise<void> {
  const iframe = page.locator("iframe").first();
  await iframe.waitFor({ state: "visible", timeout: 30_000 });
  const frameLocator = page.frameLocator("iframe").first();
  const invitation = frameLocator.locator('[data-ui="invitation"]');
  await invitation.waitFor({ state: "visible", timeout: 30_000 });
  await invitation.evaluate(() => document.fonts.ready);
  const img = frameLocator.locator('[data-ui="invitation-hero-photo"] img');
  if ((await img.count()) > 0) {
    await img.first().waitFor({ state: "visible", timeout: 15_000 });
    await img.first().evaluate(async (node) => {
      const el = node as HTMLImageElement;
      if (el.complete && el.naturalWidth > 0) return;
      await new Promise<void>((resolve) => {
        el.addEventListener("load", () => resolve(), { once: true });
        el.addEventListener("error", () => resolve(), { once: true });
      });
    });
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

async function captureAdminScreenshots(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    window.localStorage.setItem("invitations-panel-language", "en");
    window.localStorage.setItem("mantine-color-scheme-value", "light");
  });

  const res = await page.goto(`${ADMIN_URL}/demo`, { waitUntil: "load" });
  const createBtn = page.getByRole("button", {
    name: /Create invitation|Utwórz zaproszenie/i,
  });
  try {
    await createBtn.waitFor({ state: "visible", timeout: 30_000 });
  } catch (err) {
    const body = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    console.error(
      `Admin /demo failed (status=${res?.status()}, url=${page.url()}): ${body.slice(0, 400)}`,
    );
    throw err;
  }
  await createBtn.click();

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("textbox").first().fill("Emma & Liam — Wedding");
  await dialog.getByLabel("Starting template").click();
  await page.getByRole("option", { name: "Wedding and reception" }).click();
  await dialog
    .getByRole("button", { name: /Create invitation|Utwórz zaproszenie/i })
    .click();

  await page.locator('[data-ui="editor-workspace"]').waitFor({
    state: "visible",
    timeout: 30_000,
  });
  await waitForPreviewReady(page);

  // Dismiss local demo notice banner so the workspace showcase stays clean.
  const demoClose = page.locator('[role="alert"] button').first();
  if (await demoClose.isVisible().catch(() => false)) {
    await demoClose.click();
    await page.waitForTimeout(200);
  }

  // 1. Desktop Light
  await page.screenshot({
    path: `${OUT_DIR}/admin-editor-desktop-light.png`,
    style: "nextjs-portal { display: none; }",
  });

  // 2. Desktop Dark
  await page.getByRole("button", { name: "Panel appearance" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  await page.waitForFunction(
    () =>
      document.documentElement.getAttribute("data-mantine-color-scheme") ===
      "dark",
  );
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${OUT_DIR}/admin-editor-desktop-dark.png`,
    style: "nextjs-portal { display: none; }",
  });

  // 3. Mobile Light (390x844)
  await page.getByRole("button", { name: "Panel appearance" }).click();
  await page.getByRole("menuitemradio", { name: "Light" }).click();
  await page.waitForFunction(
    () =>
      document.documentElement.getAttribute("data-mantine-color-scheme") ===
      "light",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT_DIR}/admin-editor-mobile.png`,
    style: "nextjs-portal { display: none; }",
  });
}

async function captureGuestScreenshots(page: Page): Promise<void> {
  const fullConfig = createTemplate("wedding-reception", "docs-guest", "en-GB");
  fullConfig.hero.dateLabel = "12 June 2027 · 15:00";
  for (const variant of fullConfig.variants) {
    variant.dateLabel = fullConfig.hero.dateLabel;
  }
  if (fullConfig.venues[0]) {
    fullConfig.venues[0].name = "St. Anne's Chapel";
    fullConfig.venues[0].address = "14 Botanical Lane, Como";
    fullConfig.venues[0].description =
      "Ceremony begins at 15:00. Guest parking is available behind the courtyard.";
    fullConfig.venues[0].showMap = true;
  }
  if (fullConfig.venues[1]) {
    fullConfig.venues[1].name = "Villa Botanica";
    fullConfig.venues[1].address = "88 Lakeview Terrace, Como";
    fullConfig.venues[1].description =
      "Welcome aperitif on the terrace from 17:30, followed by dinner.";
    fullConfig.venues[1].showMap = true;
  }
  fullConfig.contacts = [
    {
      id: "contact-organiser",
      name: "Emma & Liam",
      phone: "+44 20 7946 0192",
    },
  ];
  for (const section of fullConfig.sections) {
    if (
      section.type === "venue" &&
      section.venueId === fullConfig.venues[0]?.id
    ) {
      section.title = "Ceremony";
    }
    if (
      section.type === "venue" &&
      section.venueId === fullConfig.venues[1]?.id
    ) {
      section.title = "Reception";
    }
    if (section.type === "contact") {
      section.title = "Confirm attendance";
      section.body =
        "Let us know if you can join us — reach out by phone or message by 1 May 2027.";
      section.contactIds = ["contact-organiser"];
    }
  }
  const limitedVariant =
    fullConfig.variants.find((v) => v.id !== fullConfig.defaultVariant)?.id ||
    fullConfig.defaultVariant;

  await page.setViewportSize({ width: 1280, height: 800 });

  // 4. Guest Limited Variant (hero + filtered nav)
  await page.route("**/api/guest/i/docs-limited", (route) =>
    route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        config: guestContent(fullConfig, limitedVariant),
      },
    }),
  );
  await page.goto(`${SITE_URL}/i/docs-limited`, { waitUntil: "load" });
  await page.locator('[data-ui="invitation"]').waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>(
      '[data-ui="invitation-hero-photo"] img',
    );
    return !img || (img.complete && img.naturalWidth > 0);
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${OUT_DIR}/guest-variant-limited.png`,
    style: "nextjs-portal { display: none; }",
  });

  // 5. Guest RSVP & Venue Confirmation section (full variant, scrolled to bottom/RSVP)
  await page.route("**/api/guest/i/docs-rsvp", (route) =>
    route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        config: guestContent(fullConfig, fullConfig.defaultVariant),
      },
    }),
  );
  await page.goto(`${SITE_URL}/i/docs-rsvp`, { waitUntil: "load" });
  await page.locator('[data-ui="invitation"]').waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${OUT_DIR}/guest-rsvp-desktop.png`,
    style: "nextjs-portal { display: none; }",
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const spawned: ChildProcess[] = [];

  try {
    if (!(await isReachable(SITE_URL))) {
      spawned.push(startNextApp("apps/site", SITE_PORT));
    }
    if (!(await isReachable(ADMIN_URL))) {
      spawned.push(startNextApp("apps/admin", ADMIN_PORT, { E2E_DEMO: "1" }));
    }
    await Promise.all([waitForUrl(SITE_URL), waitForUrl(ADMIN_URL)]);

    const browser = await chromium.launch({ headless: true });
    try {
      const adminContext = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      });
      const adminPage = await adminContext.newPage();
      await captureAdminScreenshots(adminPage);
      await adminContext.close();

      const guestContext = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        reducedMotion: "reduce",
      });
      const guestPage = await guestContext.newPage();
      await captureGuestScreenshots(guestPage);
      await guestContext.close();
    } finally {
      await browser.close();
    }
    console.log(`Captured documentation screenshots in ${OUT_DIR}/`);
  } finally {
    for (const child of spawned) {
      child.kill();
    }
  }
}

await main();
