import { test, expect } from "@playwright/test";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("notices can be dismissed without bypassing validation and return for new errors", async ({
  page,
}) => {
  await page.goto(`${admin}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  const close = (text: string) =>
    page
      .getByRole("alert")
      .filter({ hasText: text })
      .getByRole("button", { name: "Zamknij powiadomienie" })
      .click();
  await close("Demonstracja lokalna");
  await expect(page.getByText("Demonstracja lokalna")).not.toBeVisible();

  const heading = page.getByLabel("Główny napis", { exact: true });
  await heading.fill("");
  await close("Uzupełnij główny napis");
  await expect(
    page.getByRole("button", { name: "Symuluj publikację" }),
  ).toBeDisabled();
  await heading.fill("Spotkanie");

  await page.getByRole("button", { name: "Wszystkie sekcje" }).click();
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  const url = page.getByLabel("Link wydarzenia (opcjonalny)", { exact: true });
  await url.fill("f");
  await expect(
    page.getByText("Uzupełnij główny napis", { exact: false }),
  ).not.toBeVisible();
  await close("Popraw konfigurację");
  await expect(page.getByText("Popraw konfigurację")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zapisz szkic", exact: true }),
  ).toBeDisabled();
  await url.fill("https://example.com");
  await url.fill("f");
  await expect(page.getByText("Popraw konfigurację")).toBeVisible();
  await url.fill("https://example.com");
  await page.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
  await page
    .getByRole("status")
    .getByRole("button", { name: "Zamknij powiadomienie" })
    .click();
  await expect(page.getByRole("status")).not.toBeVisible();
});
