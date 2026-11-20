import { test, expect } from "@playwright/test";
import sharp from "sharp";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

for (const width of [390, 1440]) {
  test(`photo selectors show thumbnails, names and ID fallback at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const image = await sharp({
      create: { width: 1200, height: 800, channels: 3, background: "#a6b99b" },
    })
      .webp()
      .toBuffer();
    await page.route("**/media/library-demo.webp", (route) =>
      route.fulfill({ contentType: "image/webp", body: image }),
    );
    await page.goto(`${admin}/demo/photos`);
    async function tab(name: string) {
      if (width < 1100) {
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name, exact: true })
          .click();
      } else await page.getByRole("tab", { name, exact: true }).click();
    }
    await tab("Zdjęcia");
    await page
      .getByRole("button", {
        name: "Podgląd i opis: Zdjęcie testowe",
        exact: true,
      })
      .click();
    const altInput = page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Opis zdjęcia", exact: true });
    await expect(async () => {
      await altInput.fill("");
      await expect(altInput).toHaveValue("", { timeout: 300 });
    }).toPass({ timeout: 10000 });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Gotowe", exact: true })
      .click();
    await tab("Treść");
    await page
      .getByRole("button", { name: "Początek zaproszenia", exact: true })
      .click();
    const heroDialog = page.getByRole("dialog", {
      name: "Początek zaproszenia",
    });
    await expect(heroDialog).toBeVisible();
    await heroDialog.evaluate(async (el) => {
      const root = el.closest(".mantine-Modal-root") ?? el;
      await Promise.allSettled(
        root.getAnimations({ subtree: true }).map((a) => a.finished),
      );
    });
    for (const device of ["Komputer", "Telefon", "Tablet"]) {
      await heroDialog
        .getByRole("button", { name: device, exact: true })
        .click();
      const select = heroDialog.getByRole("combobox", {
        name: "Zdjęcie dla wybranego urządzenia",
        exact: true,
      });
      await expect(async () => {
        await select.scrollIntoViewIfNeeded();
        if ((await select.getAttribute("aria-expanded")) !== "true") {
          await select.click();
        }
        await expect(select).toHaveAttribute("aria-expanded", "true", {
          timeout: 1500,
        });
      }).toPass({ timeout: 10000 });
      const option = page.getByRole("option", { name: "photo", exact: true });
      await expect(
        option.locator('[data-ui="photo-reference-thumbnail"]'),
      ).toBeVisible();
      await expect(option.locator("img")).toHaveJSProperty(
        "naturalWidth",
        1200,
      );
      await option.click();
      await expect(select).toHaveValue("photo");
    }
    await page.screenshot({
      path: `test-results/photo-selectors-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await page
      .getByTestId("section-gallery")
      .getByRole("button", { name: /Galeria/ })
      .click();
    await expect(
      page
        .locator('[data-ui="reference-row"]')
        .filter({ hasText: "photo" })
        .locator('[data-ui="photo-reference-thumbnail"]'),
    ).toBeVisible();
    await page
      .locator('[data-ui="reference-row"]')
      .filter({ hasText: "photo" })
      .getByRole("button", { name: "Usuń z sekcji" })
      .click();
    await page.keyboard.press("Escape");
    await expect(
      page.frameLocator("iframe").locator('[data-kind="gallery"] img'),
    ).toHaveCount(0);
  });
}
