import { test, expect } from "@playwright/test";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

for (const width of [390, 1280]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`studio controls stay still and disclosures retain edits at ${width}px (${reducedMotion})`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${admin}/demo`);
      await page
        .getByRole("button", { name: "Otwórz gotowy przykład" })
        .click();
      const toggle = page.getByRole("button", {
        name: "Początek zaproszenia",
        exact: true,
      });
      await toggle.scrollIntoViewIfNeeded();
      await toggle.hover();
      const before = await toggle.boundingBox();
      await page.mouse.down();
      await expect(toggle).toHaveCSS("transform", "none");
      await expect(toggle).toHaveCSS("translate", "none");
      expect(await toggle.boundingBox()).toEqual(before);
      await page.mouse.up();
      await toggle.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const input = dialog.getByLabel("Główny napis", { exact: true });
      await expect(input).toBeVisible();
      await input.fill("Nasze spotkanie");
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await toggle.click();
      await expect(input).toHaveValue("Nasze spotkanie");
      await page.screenshot({
        path: testInfo.outputPath(`studio-${width}-${reducedMotion}.png`),
      });
      expect(errors).toEqual([]);
    });
  }
}

for (const width of [390, 1280]) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`invitation motion is optional and sections enter once at ${width}px (${reducedMotion})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ reducedMotion });
      await page.addInitScript(() => {
        const original = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          if (
            this instanceof HTMLElement &&
            this.dataset.ui === "invitation-section"
          ) {
            this.dataset.motionStarts = String(
              Number(this.dataset.motionStarts || 0) + 1,
            );
          }
          return original.apply(this, args);
        };
      });
      await page.goto("/demo/pelna");
      const section = page.locator('[data-ui="invitation-section"]').last();
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      if (reducedMotion === "reduce") {
        await expect(section).not.toHaveAttribute("data-motion-starts");
        await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
      } else {
        await expect(section).toHaveAttribute("data-motion-starts", /[1-9]/);
        await expect(section).toHaveCSS("transform", "none");
        const starts = await section.getAttribute("data-motion-starts");
        await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
        await section.scrollIntoViewIfNeeded();
        await expect(section).toHaveAttribute("data-motion-starts", starts!);
        await expect(page.locator("html")).toHaveCSS(
          "scroll-behavior",
          "smooth",
        );
      }
      await expect(section).toHaveCSS("opacity", "1");
    });
  }
}

test("invitation content remains readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${test.info().project.use.baseURL}/demo/pelna`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator('[data-ui="invitation-section"]').last()).toHaveCSS(
    "opacity",
    "1",
  );
  await context.close();
});
