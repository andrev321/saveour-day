import { test, expect } from "@playwright/test";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("panel theme persists and works in editor across desktop and mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${admin}/demo`);
  await expect(page.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "light",
  );
  await page.getByRole("button", { name: "Wygląd panelu" }).click();
  await page
    .getByRole("menuitemradio", { name: "Ciemny", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "dark",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "dark",
  );
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  await expect(page.locator('[data-ui="workspace-form"]')).toHaveCSS(
    "background-color",
    "rgb(28, 39, 57)",
  );
  await expect(
    page.frameLocator("iframe").locator('[data-ui="invitation"]'),
  ).not.toHaveCSS("background-color", "rgb(28, 39, 57)");
  await page.getByRole("button", { name: "Zwiń nawigację" }).click();
  const footer = page.locator('[data-ui="workspace-nav-footer"]');
  await expect(async () => {
    const boxes = await footer.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const { x, width, height } = button.getBoundingClientRect();
        return { x, width, height };
      }),
    );
    expect(boxes).toHaveLength(2);
    for (const box of boxes) {
      expect(box.width).toBe(44);
      expect(box.height).toBe(44);
      expect(box.x).toBe(boxes[0].x);
    }
  }).toPass({ timeout: 2000 });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("button", { name: "Opcje projektu" }).click();
  await page.getByRole("button", { name: "Wygląd panelu" }).click();
  await page
    .getByRole("menuitemradio", { name: "Systemowy", exact: true })
    .click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "light",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "dark",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("appearance synchronizes across tabs and keeps explicit choice", async ({
  page,
  context,
}) => {
  await page.goto(`${admin}/demo`);
  const other = await context.newPage();
  await other.goto(`${admin}/account`);
  await expect(
    other.getByRole("button", { name: "Wygląd panelu" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wygląd panelu" }).click();
  await page
    .getByRole("menuitemradio", { name: "Ciemny", exact: true })
    .click();
  await expect(other.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "dark",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute(
    "data-mantine-color-scheme",
    "dark",
  );
  await other.close();
});
