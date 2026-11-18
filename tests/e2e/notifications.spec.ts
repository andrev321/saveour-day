import { test, expect } from "@playwright/test";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("notices can be dismissed without bypassing validation and return for new errors", async ({
  page,
}) => {
  await page.goto(`${admin}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  const close = (text: string) =>
    page
      .getByRole("alert")
      .filter({ hasText: text })
      .getByRole("button", { name: "Zamknij powiadomienie" })
      .click();
  await close("Demonstracja lokalna");
  await expect(page.getByText("Demonstracja lokalna")).not.toBeVisible();

  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  const heading = page.getByLabel("Główny napis", { exact: true });
  await heading.fill("");
  await page.keyboard.press("Escape");
  await close("Uzupełnij główny napis");
  await expect(
    page.getByRole("button", { name: "Symuluj publikację" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await heading.fill("Spotkanie");
  await page.keyboard.press("Escape");

  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  const url = page.getByLabel("Link wydarzenia (opcjonalny)", { exact: true });
  await url.fill("f");
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Uzupełnij główny napis", { exact: false }),
  ).not.toBeVisible();
  await close("Popraw konfigurację");
  await expect(page.getByText("Popraw konfigurację")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Zapisz szkic", exact: true }),
  ).toBeDisabled();
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  await url.fill("https://example.com");
  await url.fill("f");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Popraw konfigurację")).toBeVisible();
  await page
    .getByTestId("section-timeline")
    .getByRole("button", { name: /Plan naszego dnia/ })
    .click();
  await page.getByRole("button", { name: "Ceremonia", exact: true }).click();
  await url.fill("https://example.com");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
  const toastMessage = page.getByText(
    "Szkic zapisany. Publikacja wymaga osobnego zatwierdzenia.",
  );
  await expect(toastMessage).toBeVisible();
  await page
    .locator(".mantine-Notification-root")
    .filter({ has: toastMessage })
    .locator(".mantine-Notification-closeButton")
    .click();
  await expect(toastMessage).not.toBeVisible();
});
