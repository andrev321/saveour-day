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
    async function tab(name: string) {
      if (width < 1100) {
        await page.getByRole("button", { name: "Menu", exact: true }).click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name, exact: true })
          .click();
      } else await page.getByRole("tab", { name, exact: true }).click();
    }
    await page
      .getByRole("button", { name: "Początek zaproszenia", exact: true })
      .click();
    let dialog = page.getByRole("tabpanel").filter({ visible: true });
    await dialog.getByRole("button", { name: "Komputer", exact: true }).click();
    const focus = dialog.getByRole("group", { name: "Przesuń ramkę kadru" });
    await expect(focus.locator("img")).toHaveJSProperty("naturalWidth", 1200);
    await focus.scrollIntoViewIfNeeded();
    const bounds = await focus.boundingBox();
    await focus.click({
      position: { x: bounds!.width * 0.97, y: bounds!.height * 0.5 },
    });
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "100% 50%",
    );
    await focus.press("ArrowLeft");
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "98% 50%",
    );
    await dialog.getByRole("button", { name: "Telefon", exact: true }).click();
    await dialog.getByRole("button", { name: "Wyśrodkuj kadr" }).click();
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "50% 50%",
    );
    await focus.press("ArrowDown");
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "50% 52%",
    );
    await dialog.getByRole("button", { name: "Wyśrodkuj kadr" }).click();
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "50% 50%",
    );
    await dialog.getByRole("button", { name: "Tablet", exact: true }).click();
    await dialog.getByRole("button", { name: "Wyśrodkuj kadr" }).click();
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "50% 50%",
    );
    await focus.press("ArrowRight");
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "52% 50%",
    );
    const frameBounds = await dialog.getByTestId("photo-crop").boundingBox();
    const stageBounds = await focus.boundingBox();
    const centerX = frameBounds!.x + frameBounds!.width / 2;
    const centerY = frameBounds!.y + frameBounds!.height / 2;
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + stageBounds!.width * 0.1, centerY, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "82% 50%",
    );
    await expect(dialog.locator('[data-ui="photo-crop-frame"]')).toHaveCount(1);
    await expect(focus.locator("img")).toHaveCount(1);
    await dialog.getByRole("button", { name: "Komputer", exact: true }).click();
    await expect(dialog.getByTestId("photo-crop")).toHaveAttribute(
      "data-position",
      "98% 50%",
    );
    await tab("Zdjęcia");
    await page
      .getByRole("button", {
        name: "Podgląd i opis: Zdjęcie testowe",
        exact: true,
      })
      .click();
    dialog = page.getByRole("dialog");
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
        name: "Podgląd i opis: Zdjęcie z biblioteki",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Ustaw jako główne", exact: true })
      .click();
    await dialog.getByRole("button", { name: "Gotowe", exact: true }).click();
    await expect(
      page.getByRole("button", {
        name: "Podgląd i opis: Zdjęcie z biblioteki",
        exact: true,
      }),
    ).toContainText("Główne");
    await page
      .getByRole("button", {
        name: "Podgląd i opis: Nasze wspólne zdjęcie",
        exact: true,
      })
      .click();
    await dialog
      .getByRole("button", { name: "Usuń z zaproszenia", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: "Podgląd i opis: Zdjęcie testowe",
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
      name: "Podgląd i opis: Zdjęcie testowe",
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
