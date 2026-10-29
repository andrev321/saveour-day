import { test, expect } from "@playwright/test";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

for (const width of [390, 1440]) {
  test(`panel theme persists and works in editor at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
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
    if (width >= 1100) {
      await expect(
        page.frameLocator("iframe").locator('[data-ui="invitation"]'),
      ).not.toHaveCSS("background-color", "rgb(28, 39, 57)");
      await page.getByRole("button", { name: "Zwiń nawigację" }).click();
      const footer = page.locator('[data-ui="workspace-nav-footer"]');
      const boxes = await footer.getByRole("button").evaluateAll((buttons) =>
        buttons.map((button) => {
          const { x, width, height } = button.getBoundingClientRect();
          return { x, width, height };
        }),
      );
      expect(boxes).toHaveLength(3);
      for (const box of boxes) {
        expect(box.width).toBe(44);
        expect(box.height).toBe(44);
        expect(box.x).toBe(boxes[0].x);
      }
    }
    if (width < 1100)
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
    await page.screenshot({ path: `test-results/panel-dark-${width}.png` });
  });
}

test("appearance synchronizes across tabs and keeps explicit choice", async ({
  page,
  context,
}) => {
  await page.goto(`${admin}/demo`);
  const other = await context.newPage();
  await other.goto(`${admin}/account`);
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
