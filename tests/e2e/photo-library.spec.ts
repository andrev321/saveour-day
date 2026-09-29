import { test, expect } from "@playwright/test";
import sharp from "sharp";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

for (const width of [390, 1440])
  test(`photo library previews, frames and manages photos at ${width}px`, async ({
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
    if (width < 1100) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Zdjęcia", exact: true })
        .click();
    } else
      await page.getByRole("tab", { name: "Zdjęcia", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Podgląd i kadrowanie: Zdjęcie testowe",
        exact: true,
      })
      .click();
    const dialog = page.getByRole("dialog");
    const focus = dialog.getByRole("group", { name: "Ustaw punkt kadrowania" });
    const bounds = await focus.boundingBox();
    await focus.click({
      position: { x: bounds!.width * 0.75, y: bounds!.height * 0.25 },
    });
    await expect(dialog.getByTestId("photo-crop")).toHaveCSS(
      "object-position",
      "75% 25%",
    );
    await focus.press("ArrowLeft");
    await expect(dialog.getByTestId("photo-crop")).toHaveCSS(
      "object-position",
      "73% 25%",
    );
    await dialog.getByText("Telefon", { exact: true }).click();
    await expect(dialog.getByTestId("photo-crop")).toHaveCSS(
      "object-position",
      "50% 50%",
    );
    await focus.press("ArrowDown");
    await expect(dialog.getByTestId("photo-crop")).toHaveCSS(
      "object-position",
      "50% 52%",
    );
    await dialog.getByRole("button", { name: "Wyśrodkuj kadr" }).click();
    await expect(dialog.getByTestId("photo-crop")).toHaveCSS(
      "object-position",
      "50% 50%",
    );
    await dialog.getByText("Komputer", { exact: true }).click();
    await expect(dialog.getByTestId("photo-crop")).toHaveCSS(
      "object-position",
      "73% 25%",
    );
    await dialog
      .getByRole("textbox", { name: "Opis zdjęcia", exact: true })
      .fill("Nasze wspólne zdjęcie");
    await page.screenshot({
      path: `test-results/photo-library-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await dialog.getByRole("button", { name: "Gotowe", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Podgląd i kadrowanie: Zdjęcie z biblioteki",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Ustaw jako główne", exact: true })
      .click();
    await dialog.getByRole("button", { name: "Gotowe", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Podgląd i kadrowanie: Zdjęcie z biblioteki",
        exact: true,
      }),
    ).toContainText("Główne");
    await page
      .getByRole("button", {
        name: "Podgląd i kadrowanie: Nasze wspólne zdjęcie",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Usuń z zaproszenia", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Podgląd i kadrowanie: Zdjęcie testowe",
        exact: true,
      }),
    ).toContainText("W bibliotece");
    await expect(
      page.getByRole("alert").filter({ hasText: "mediaIds" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Zapisz szkic", exact: true })
      .click();
    const removedPhoto = page.getByRole("button", {
      name: "Podgląd i kadrowanie: Zdjęcie testowe",
      exact: true,
    });
    await removedPhoto.click();
    await dialog
      .getByRole("button", { name: "Usuń plik z biblioteki", exact: true })
      .click();
    await expect(dialog).toContainText("Tej operacji nie można cofnąć");
    await dialog.getByRole("button", { name: "Anuluj", exact: true }).click();
    await expect(removedPhoto).toHaveCount(1);
    await dialog
      .getByRole("button", { name: "Usuń plik z biblioteki", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Usuń plik na zawsze", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(removedPhoto).toHaveCount(0);
  });
