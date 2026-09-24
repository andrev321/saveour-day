import { test, expect } from "@playwright/test";
const adminUrl = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920])
  test(`invitation reflows at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/demo/pelna");
    await expect(
      page.getByRole("heading", { name: "Anna & Jan", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Po ceremonii zapraszamy do wspólnego świętowania."),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `test-results/invitation-${width}.png`,
      fullPage: true,
    });
  });
test("all existing routes load directly", async ({ page }) => {
  for (const route of ["glowna", "pelna", "ograniczona"]) {
    await page.goto(`/demo/${route}`);
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
  }
});
test("admin demo edits and saves before simulated publication", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await expect(
    page.getByText("Demonstracja lokalna", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Główny napis", { exact: true }).fill("Zmieniona");
  await expect(
    page.getByRole("button", { name: "Symuluj publikację" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Zapisz szkic" }).click();
  await page.getByRole("button", { name: "Symuluj publikację" }).click();
  await page.getByRole("button", { name: "Uruchom symulację" }).click();
  await expect(
    page.getByText("Symulacja zakończona. Nie utworzono wdrożenia Vercel."),
  ).toBeVisible();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Zmieniona", exact: true }),
  ).toBeVisible();
});
test("admin demo forwards custom color tokens to the preview", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("tab", { name: "Ustawienia", exact: true }).click();
  await page.getByLabel("Kolor akcentu", { exact: true }).fill("#123456");
  await expect(page.frameLocator("iframe").locator(".invitation")).toHaveCSS(
    "--accent",
    "#123456",
  );
});
test("panel language preserves the untouched invitation template", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("combobox", { name: "Język panelu" }).click();
  await page.getByRole("option", { name: "English", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
});
test("panel language preserves a customized invitation template", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByLabel("Główny napis", { exact: true }).fill("Kasia");
  await page.getByRole("combobox", { name: "Język panelu" }).click();
  await page.getByRole("option", { name: "Deutsch", exact: true }).click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Kasia", exact: true }),
  ).toBeVisible();
});
test("section editor uses Polish section names and supports reordering", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("tab", { name: "Sekcje", exact: true }).click();
  await expect(
    page.getByText("Przeciągnij sekcje, aby ustawić kolejność", {
      exact: false,
    }),
  ).toBeVisible();
  const parking = page.getByTestId("section-parking");
  const handle = page.getByTestId("drag-handle-parking");
  await handle.click();
  await expect(page.getByLabel("Identyfikator", { exact: true })).toBeHidden();
  await handle.focus();
  await handle.press("Space");
  await expect(page.locator(".section-drag-ghost")).toBeVisible();
  await handle.press("Escape");
  await expect(page.locator(".section-drag-ghost")).toBeHidden();
  await parking.getByRole("button").first().click();
  await page.getByRole("button", { name: "Przesuń sekcję wyżej" }).click();
  await expect(
    page.getByRole("button", { name: "Zapisz szkic" }),
  ).toBeEnabled();
  await page.getByRole("combobox", { name: "Rodzaj sekcji" }).click();
  await expect(
    page.getByRole("option", { name: "Miejsce", exact: true }),
  ).toBeVisible();
});
test("new text sections are visible in the preview", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("tab", { name: "Sekcje", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj sekcję" }).click();
  await expect(
    page.frameLocator("iframe").getByText("Nowa sekcja", { exact: true }),
  ).toBeVisible();
});
test("editor manages named content variants", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("tab", { name: "Strony", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Strony" })).toBeVisible();
  await expect(page.getByLabel(/Przygotuj warianty treści/)).toBeVisible();
  await page.getByRole("button", { name: "Dodaj stronę" }).click();
  await page.getByRole("button", { name: "Nowa strona" }).click();
  await expect(page.getByRole("combobox", { name: /Podgl/ })).toHaveValue(
    "Nowa strona",
  );
  await page.getByLabel("Etykieta", { exact: true }).fill("Dla rodziny");
  await expect(
    page.getByRole("button", { name: "Dla rodziny", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Adres URL strony", { exact: true }),
  ).toHaveCount(0);
});
test("main page cannot be removed or reordered", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("tab", { name: "Strony", exact: true }).click();

  await expect(page.getByRole("button", { name: /Główna/ })).toBeVisible();
  await page.getByRole("button", { name: /Główna/ }).click();
  await expect(
    page.getByRole("button", { name: /Usuń stronę/ }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: /Przeciągnij/ })).toHaveCount(
    0,
  );
});
test("page editor supports dragging ordered references", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("tab", { name: "Strony", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj stronę" }).click();
  await page.getByRole("button", { name: /Nowa strona/ }).click();
  const handle = page
    .getByRole("button", { name: "Przeciągnij Ceremonia" })
    .first();
  await handle.focus();
  await handle.press("Space");
  await expect(page.locator(".reference-drag-ghost")).toBeVisible();
  await handle.press("Escape");
  await expect(page.locator(".reference-drag-ghost")).toBeHidden();
  await page.getByRole("button", { name: "Ukryj: Ceremonia" }).first().click();
  await expect(page.locator(".reference-row-hidden")).toHaveCount(1);
});
test("editor opens the current invitation in a full-screen preview", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${adminUrl}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page.getByRole("button", { name: "Powiększ podgląd" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .frameLocator("iframe")
      .getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("combobox", { name: "Szerokość ekranu" }).click();
  await page.getByRole("option", { name: "768", exact: true }).click();
  await expect(dialog.locator(".expanded-preview-frame > div")).toHaveCSS(
    "width",
    "768px",
  );
  await dialog.getByRole("combobox", { name: "Podgląd wariantu" }).click();
  await page.getByRole("option", { name: "Główna", exact: true }).click();
  await dialog.getByRole("button", { name: "Zamknij podgląd" }).click();
  await expect(dialog).toBeHidden();
});
test("anonymous API access is denied when services are not configured", async ({
  request,
}) => {
  const response = await request.get(`${adminUrl}/api/sites`);
  expect([401, 503]).toContain(response.status());
  const forged = await request.post(`${adminUrl}/api/sites`, {
    headers: { Origin: "https://attacker.example" },
    data: { name: "forged" },
  });
  expect(forged.status()).toBe(403);
});
