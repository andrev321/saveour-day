import { test, expect, type Page } from "@playwright/test";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
async function open(page: Page) {
  await page.goto(admin + "/demo");
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  const mobile = (page.viewportSize()?.width || 1440) < 1100;
  if (mobile)
    await page.getByRole("button", { name: "Podgląd", exact: true }).click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
  if (mobile)
    await page.getByRole("button", { name: "Edycja", exact: true }).click();
}
for (const width of [390, 1440])
  test(`contextual editor overview stays readable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page);
    await page.screenshot({
      path: `/tmp/contextual-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByTestId("section-contact")
      .getByRole("button", { name: /Dajcie znać/ })
      .click();
    await page.getByRole("button", { name: "Dodaj nowy element" }).click();
    await page.getByLabel("Imię / nazwa", { exact: true }).fill("Nowa osoba");
    await page
      .getByRole("textbox", { name: "Telefon", exact: true })
      .fill("+48123456789");
    if (width < 1100)
      await page.getByRole("button", { name: "Podgląd", exact: true }).click();
    await expect(
      page.frameLocator("iframe").getByText("Nowa osoba", { exact: true }),
    ).toBeVisible();
    if (width < 1100) {
      await page
        .frameLocator("iframe")
        .locator('[data-kind="contact"]')
        .getByRole("button", { name: /Edytuj/ })
        .click();
      await expect(
        page.getByRole("button", { name: "Wszystkie sekcje" }),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
test("shared section copy isolates titles and unlinking preserves other variants", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Warianty", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Dodaj wariant na podstawie tego" })
    .click();
  await dialog.getByLabel("Nazwa wariantu", { exact: true }).fill("Rodzina");
  await dialog.getByRole("button", { name: "Gotowe", exact: true }).click();
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await expect(
    page.getByText("Wspólna treść: 2 użycia. Zmiana zaktualizuje wszystkie.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Utwórz niezależną kopię" }).click();
  await page
    .getByLabel("Tytuł sekcji", { exact: true })
    .fill("Program dla rodziny");
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Program dla rodziny", exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Wariant zaproszenia" }).click();
  await page.getByRole("option", { name: "Główna", exact: true }).click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Plan naszego dnia", exact: true }),
  ).toBeVisible();
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Usuń sekcję z wariantu" }).click();
  await page
    .getByRole("alert")
    .getByRole("button", { name: "Usuń", exact: true })
    .click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Plan naszego dnia", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("combobox", { name: "Wariant zaproszenia" }).click();
  await page.getByRole("option", { name: "Rodzina", exact: true }).click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Program dla rodziny", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
});
