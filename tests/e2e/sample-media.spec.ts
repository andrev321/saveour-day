import { test, expect } from "@playwright/test";
import {
  createTemplate,
  templateIds,
} from "../../packages/domain/src/templates";
import { guestContent } from "../../packages/domain/src/guest";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("starter sample loads, can be removed from the project and restored with undo", async ({
  page,
}) => {
  await page.goto(`${admin}/demo`);
  await page
    .getByRole("button", { name: "Utwórz zaproszenie", exact: true })
    .click();
  await page.getByLabel("Nazwa nowego zaproszenia").fill("Przykładowe zdjęcie");
  await page
    .getByRole("combobox", { name: "Szablon startowy", exact: true })
    .click();
  await page.getByRole("option", { name: "Urodziny", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Utwórz zaproszenie", exact: true })
    .click();
  const photo = page
    .frameLocator("iframe")
    .locator('[data-ui="invitation-hero-photo"] img');
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await page.getByRole("tab", { name: "Zdjęcia", exact: true }).click();
  const tile = page.getByRole("button", {
    name: "Podgląd i opis: Przykładowe zdjęcie — spotkanie przy stole",
    exact: true,
  });
  await tile.click();
  await expect(page.getByRole("dialog")).toContainText(
    "Możesz wykorzystać ją w swoim zaproszeniu",
  );
  await expect(
    page.getByRole("button", { name: "Usuń plik z biblioteki", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Usuń z zaproszenia", exact: true })
    .click();
  await expect(tile).toHaveCount(0);
  await expect(photo).toHaveCount(0);
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  await expect(tile).toBeVisible();
  await expect(photo).toBeVisible();
  await page.screenshot({
    path: "test-results/template-sample-photo.png",
    fullPage: true,
  });
});

test("every starter renders its real sample on the guest site without private media requests", async ({
  page,
}) => {
  let current = createTemplate("birthday", "sample-test");
  const privateRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/media/"))
      privateRequests.push(request.url());
  });
  await page.route("**/api/guest/i/sample-test", (route) =>
    route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        config: guestContent(current, current.defaultVariant),
      },
    }),
  );
  for (const template of templateIds) {
    current = createTemplate(template, "sample-test");
    await page.goto("/i/sample-test");
    const photo = page.locator('[data-ui="invitation-hero-photo"] img');
    if (template === "blank") {
      await expect(
        page.getByText(
          "Puste zaproszenie. Dodaj główny napis i treść w edytorze.",
        ),
      ).toBeVisible();
      await expect(photo).toHaveCount(0);
    } else {
      await expect(photo).toBeVisible();
      await expect
        .poll(() =>
          photo.evaluate((el) => (el as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    }
  }
  expect(privateRequests).toEqual([]);
});
