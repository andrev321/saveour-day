import { test, expect, type Page } from "@playwright/test";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
async function openEditor(page: Page) {
  await page.goto(`${admin}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
}

for (const width of [320, 390, 768, 1024, 1280, 1920, 2560]) {
  test(`workspace edits and previews without overflow at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await openEditor(page);
    await page
      .getByLabel("Główny napis", { exact: true })
      .fill("Spotkanie przyjaciół");
    await page
      .getByRole("button", { name: "Zapisz szkic", exact: true })
      .click();
    if (width < 1100) {
      await page.getByRole("button", { name: "Podgląd", exact: true }).click();
      await expect(
        page.getByLabel("Główny napis", { exact: true }),
      ).not.toBeVisible();
    }
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("heading", { name: "Spotkanie przyjaciół", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const preview = page.locator("[data-ui=workspace-preview]");
    const toolbar = preview.locator("[data-ui=preview-toolbar]");
    expect(
      await toolbar.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await expect(
      preview.locator('[data-ui=preview-device][data-device="phone"]'),
    ).toBeVisible();
    const frame = await preview.locator("iframe").boundingBox();
    const canvas = await preview
      .locator("[data-ui=preview-canvas]")
      .boundingBox();
    expect(frame!.width).toBeLessThanOrEqual(canvas!.width);
    if (width < 1100) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Wygląd", exact: true })
        .click();
      await expect(
        page.getByLabel("Kolor akcentu", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Treść", exact: true })
        .click();
      await expect(
        page.getByLabel("Główny napis", { exact: true }),
      ).toHaveValue("Spotkanie przyjaciół");
    }
    await page.screenshot({ path: `test-results/workspace-${width}.png` });
    expect(errors).toEqual([]);
  });
}

test("view settings persist, resize is keyboard accessible, and reset restores defaults", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await openEditor(page);
  const separator = page.getByRole("separator", {
    name: "Szerokość formularza",
  });
  await separator.focus();
  await page.keyboard.press("End");
  await expect(separator).toHaveAttribute("aria-valuenow", "560");
  await page.getByRole("button", { name: "Zwiń nawigację" }).click();
  await page.getByRole("button", { name: "Ustawienia widoku" }).click();
  await page.getByText("Zwarta", { exact: true }).click();
  await page.keyboard.press("Escape");
  await page
    .locator("[data-ui=workspace-preview]")
    .getByRole("button", { name: "Komputer", exact: true })
    .click();
  await expect(page.locator("iframe")).toHaveCSS("width", "1440px");
  expect(
    await page
      .frameLocator("iframe")
      .locator("body")
      .evaluate(() => innerWidth),
  ).toBe(1440);
  const frame = await page.locator("iframe").boundingBox();
  expect(frame!.width).toBeLessThan(1440);
  await page.reload();
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await expect(separator).toHaveAttribute("aria-valuenow", "560");
  await expect(page.locator("[data-ui=editor-workspace]")).toHaveAttribute(
    "data-density",
    "compact",
  );
  await expect(
    page.getByRole("button", { name: "Rozwiń nawigację" }),
  ).toBeVisible();
  await expect(
    page
      .locator("[data-ui=workspace-preview]")
      .getByRole("button", { name: "Komputer", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Ustawienia widoku" }).click();
  await page.getByRole("button", { name: "Przywróć układ" }).click();
  await expect(separator).toHaveAttribute("aria-valuenow", "460");
  await expect(page.locator("[data-ui=editor-workspace]")).toHaveAttribute(
    "data-density",
    "comfortable",
  );
  await expect(
    page
      .locator("[data-ui=workspace-preview]")
      .getByRole("button", { name: "Telefon", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("preview toolbar stays in one row in both views and switches device frames", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEditor(page);
  await page.getByRole("button", { name: "Podgląd", exact: true }).click();
  const header = await page.locator("[data-ui=workspace-header]").boundingBox();
  expect(header!.height).toBeLessThanOrEqual(64);
  for (const expanded of [false, true]) {
    if (expanded)
      await page.getByRole("button", { name: "Powiększ podgląd" }).click();
    const scope = expanded
      ? page.getByRole("dialog")
      : page.locator("[data-ui=workspace-preview]");
    const toolbar = scope.locator("[data-ui=preview-toolbar]");
    expect(
      await toolbar.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    for (const [label, device, width] of [
      ["Tablet", "tablet", "768px"],
      ["Komputer", "desktop", "1440px"],
      ["Telefon", "phone", "390px"],
    ]) {
      await scope.getByRole("button", { name: label, exact: true }).click();
      await expect(
        scope.locator(`[data-ui=preview-device][data-device="${device}"]`),
      ).toBeVisible();
      await expect(scope.locator("iframe")).toHaveCSS("width", width);
    }
    const device = await scope
      .locator("[data-ui=preview-device]")
      .boundingBox();
    const canvas = await scope
      .locator("[data-ui=preview-canvas]")
      .boundingBox();
    expect(device!.height).toBeLessThanOrEqual(canvas!.height);
    await scope.getByRole("button", { name: "Dopasuj", exact: true }).click();
    await expect(scope.locator("[data-ui=preview-canvas]")).toHaveAttribute(
      "data-fit",
      "false",
    );
    await scope.getByRole("button", { name: "Dopasuj", exact: true }).click();
    await page.screenshot({
      path: `test-results/phone-preview-${expanded ? "expanded" : "panel"}.png`,
    });
    if (expanded)
      await scope.getByRole("button", { name: "Zamknij podgląd" }).click();
  }
});

test("mobile project menu publishes saved changes and reduced motion disables panel animations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openEditor(page);
  await expect(page.locator('[role="tabpanel"]').first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByLabel("Główny napis", { exact: true }).fill("Urodziny Oli");
  await page.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
  await page.getByRole("button", { name: "Opcje projektu" }).click();
  await page.getByRole("button", { name: "Symuluj publikację" }).click();
  await page.getByRole("button", { name: "Uruchom symulację" }).click();
  await expect(
    page.getByText("Symulacja zakończona. Nie utworzono wdrożenia Vercel."),
  ).toBeVisible();
});

test("expanded preview fills the viewport after resize and clips the entire phone screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openEditor(page);
  await page.getByRole("button", { name: "Powiększ podgląd" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Komputer", exact: true }).click();
  for (const width of [1280, 1920, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(async () => Math.round((await dialog.boundingBox())!.width))
      .toBe(width);
    await expect
      .poll(
        async () =>
          (await dialog.locator("[data-ui=preview-canvas]").boundingBox())!
            .width,
      )
      .toBeGreaterThan(width - 40);
    const device = dialog.locator("[data-ui=preview-device]");
    await expect
      .poll(async () => (await device.boundingBox())!.width)
      .toBeGreaterThan(Math.min(width - 80, 1350));
  }
  await dialog.getByRole("button", { name: "Telefon", exact: true }).click();
  const screen = dialog.locator("[data-ui=preview-device-screen]");
  await expect(screen).toHaveCSS("overflow", "hidden");
  await expect(screen).toHaveCSS("border-radius", "38px");
  await dialog
    .frameLocator("iframe")
    .locator("body")
    .evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.screenshot({ path: "test-results/phone-rounded-bottom.png" });
});
