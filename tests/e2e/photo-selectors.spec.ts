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
        name: "Podgląd i kadrowanie: Zdjęcie testowe",
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("textbox", { name: "Opis zdjęcia", exact: true })
      .fill("");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Gotowe", exact: true })
      .click();
    await tab("Strona");
    for (const label of [
      "Zdjęcie główne",
      "Zdjęcie mobilne",
      "Zdjęcie na tablecie",
    ]) {
      const select = page.getByRole("combobox", { name: label, exact: true });
      await select.click();
      const option = page.getByRole("option", { name: "photo", exact: true });
      await expect(
        option.locator('[data-ui="photo-reference-thumbnail"]'),
      ).toBeVisible();
      await expect(option.locator("img")).toHaveJSProperty(
        "naturalWidth",
        1200,
      );
      if ((await select.inputValue()) === "photo") {
        await select.press("Escape");
      } else {
        await select.press("ArrowDown");
        await select.press("Enter");
      }
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
    await tab("Sekcje");
    await page.getByRole("button", { name: "Galeria", exact: false }).click();
    const gallery = page.getByTestId("section-gallery");
    await expect(
      gallery
        .locator('[data-ui="reference-row"]')
        .filter({ hasText: "photo" })
        .locator('[data-ui="photo-reference-thumbnail"]'),
    ).toBeVisible();
    await gallery
      .getByRole("button", { name: "Ukryj: photo", exact: true })
      .click();
    await expect(
      gallery.getByRole("button", { name: "Pokaż: photo", exact: true }),
    ).toBeVisible();
    await gallery
      .getByRole("button", { name: "Pokaż: photo", exact: true })
      .click();
    await expect(
      gallery.getByRole("button", { name: "Ukryj: photo", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("alert").filter({ hasText: "hiddenSectionIds" }),
    ).toHaveCount(0);
  });
}
