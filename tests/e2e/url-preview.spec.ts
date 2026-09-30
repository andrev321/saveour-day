import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("editing an event URL keeps normal and expanded previews usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${admin}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  const url = page
    .getByLabel("Ceremonia", { exact: true })
    .getByLabel("Link wydarzenia", { exact: true });
  await url.fill("f");
  await expect(
    page.getByRole("button", { name: "Zapisz szkic", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Powiększ podgląd" }).click();
  await expect(
    page
      .getByRole("dialog")
      .frameLocator("iframe")
      .getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await url.fill("https://");
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
  await url.fill("https://example.com/event");
  await expect(
    page.frameLocator("iframe").locator('a[href="https://example.com/event"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zapisz szkic", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("preview preserves valid content while an event URL is incomplete and recovers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${admin}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  const preview = page.frameLocator("iframe");
  await expect(
    preview.getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();

  // Send through the real iframe boundary, including configurations that are
  // invalid while the user is typing. They must never crash the message handler.
  const config = createDemo();
  for (const url of [
    "f",
    "https:",
    "https://",
    "https://[",
    "https://example.com/event",
    "",
  ]) {
    config.events[0].url = url;
    await page.evaluate(
      (config) =>
        new Promise<void>((resolve) => {
          const frame = document.querySelector("iframe")!.contentWindow!;
          frame.addEventListener("message", () => resolve(), { once: true });
          frame.postMessage(
            { type: "preview-config", config, urls: {} },
            location.origin,
          );
        }),
      config,
    );
    await expect(
      preview.getByRole("heading", { name: "Anna & Jan", exact: true }),
    ).toBeVisible();
  }
  config.hero.title = "Updated after URL editing";
  await page.evaluate((config) => {
    document
      .querySelector("iframe")!
      .contentWindow!.postMessage(
        { type: "preview-config", config, urls: {} },
        location.origin,
      );
  }, config);
  await expect(
    preview.getByRole("heading", { name: config.hero.title, exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
