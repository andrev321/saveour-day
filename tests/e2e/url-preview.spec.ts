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
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  const url = page.getByLabel("Link wydarzenia (opcjonalny)", { exact: true });
  await url.fill("f");
  await page.keyboard.press("Escape");
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
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  await url.fill("https://");
  await page.keyboard.press("Escape");
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  await url.fill("https://example.com/event");
  await page.keyboard.press("Escape");
  await expect(
    page.frameLocator("iframe").locator('a[href="https://example.com/event"]'),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zapisz szkic", exact: true }),
  ).toBeEnabled();

  // Also verify direct iframe boundary resilience against invalid URL payloads.
  const preview = page.frameLocator("iframe");
  const config = createDemo();
  for (const rawUrl of ["f", "https:", "https://", "https://[", ""]) {
    config.events[0].url = rawUrl;
    await page.evaluate(
      (cfg) =>
        new Promise<void>((resolve) => {
          const frame = document.querySelector("iframe")!.contentWindow!;
          frame.addEventListener("message", () => resolve(), { once: true });
          frame.postMessage(
            { type: "preview-config", config: cfg, urls: {} },
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
  await page.evaluate((cfg) => {
    document
      .querySelector("iframe")!
      .contentWindow!.postMessage(
        { type: "preview-config", config: cfg, urls: {} },
        location.origin,
      );
  }, config);
  await expect(
    preview.getByRole("heading", { name: config.hero.title, exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
