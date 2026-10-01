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
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
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
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await page.getByRole("tab", { name: "Wygląd", exact: true }).click();
  await page.getByLabel("Kolor akcentu", { exact: true }).fill("#123456");
  await expect(
    page.frameLocator("iframe").locator("[data-ui=invitation]"),
  ).toHaveCSS("--accent", "#123456");
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
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
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
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
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
async function content(page: import("@playwright/test").Page) {
  await page.goto(`${adminUrl}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
}
test("sections reorder with keyboard and visibility changes the preview", async ({
  page,
}) => {
  await content(page);
  const row = page.getByTestId("section-parking");
  await row.getByRole("button", { name: "Przesuń sekcję wyżej" }).click();
  const ids = await page
    .locator('[data-testid^="section-"]')
    .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-testid")));
  expect(ids.indexOf("section-parking")).toBeLessThan(
    ids.indexOf("section-party"),
  );
  const handle = page.getByTestId("drag-handle-parking");
  await handle.focus();
  await handle.press("Space");
  await handle.press("ArrowUp");
  await handle.press("Space");
  await row.getByRole("button", { name: "Ukryj sekcję" }).click();
  await expect(
    page.frameLocator("iframe").getByRole("heading", { name: "Jak dojechać" }),
  ).toHaveCount(0);
  await row.getByRole("button", { name: "Pokaż sekcję" }).click();
  await expect(
    page.frameLocator("iframe").getByRole("heading", { name: "Jak dojechać" }),
  ).toBeVisible();
});
test("new typed sections appear in preview", async ({ page }) => {
  await content(page);
  await page.getByRole("button", { name: "Dodaj sekcję", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Tekst", exact: true })
    .click();
  await page.getByLabel("Tytuł sekcji", { exact: true }).fill("Nasza historia");
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Nasza historia" }),
  ).toBeVisible();
});
test("variants share content but keep independent section visibility", async ({
  page,
}) => {
  await content(page);
  await page.getByRole("button", { name: "Warianty", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Dodaj wariant na podstawie tego" })
    .click();
  await dialog.getByLabel("Nazwa wariantu", { exact: true }).fill("Rodzina");
  await dialog.getByRole("button", { name: "Gotowe", exact: true }).click();
  await page
    .getByTestId("section-party")
    .getByRole("button", { name: "Ukryj sekcję" })
    .click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Przyjęcie", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("combobox", { name: "Wariant zaproszenia" }).click();
  await page.getByRole("option", { name: "Główna", exact: true }).click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Przyjęcie", exact: true }),
  ).toBeVisible();
  expect(
    await page.getByRole("combobox", { name: "Wariant zaproszenia" }).count(),
  ).toBe(1);
});
test("program edits events and places without leaving the section", async ({
  page,
}) => {
  await content(page);
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  await page.getByLabel("Nazwa wydarzenia", { exact: true }).fill("Powitanie");
  await page.getByLabel("Nazwa miejsca", { exact: true }).fill("Ogród");
  await expect(
    page.frameLocator("iframe").getByText("Powitanie", { exact: true }),
  ).toBeVisible();
  await expect(
    page.frameLocator("iframe").getByText("Ogród", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dodaj nowy element" }).click();
  await page.getByLabel("Nazwa wydarzenia", { exact: true }).fill("Toast");
  await expect(
    page.frameLocator("iframe").getByText("Toast", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
});
test("preview selection opens the corresponding section editor", async ({
  page,
}) => {
  await content(page);
  await page
    .frameLocator("iframe")
    .locator('[data-kind="contact"]')
    .getByRole("button", { name: /Edytuj/ })
    .click();
  await page
    .getByRole("button", { name: "Kontakt do organizatorów", exact: true })
    .click();
  await page.getByLabel("Imię / nazwa", { exact: true }).fill("Organizator");
  await expect(
    page.frameLocator("iframe").getByText("Organizator", { exact: true }),
  ).toBeVisible();
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
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await page.getByRole("button", { name: "Powiększ podgląd" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .frameLocator("iframe")
      .getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Tablet", exact: true }).click();
  await expect(dialog.locator("iframe")).toHaveCSS("width", "768px");
  await expect(
    dialog.getByRole("combobox", { name: "Podgląd wariantu" }),
  ).toHaveCount(0);
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
