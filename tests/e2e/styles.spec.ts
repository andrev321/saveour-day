import { test, expect } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`invitation styles are delivered by the server without JavaScript at ${width}px`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    try {
      const response = await page.goto(`${baseURL}/demo/pelna`);
      expect(await response!.text()).toContain("data-styled");
      const invitation = page.locator("[data-ui=invitation]");
      await expect(invitation).toHaveCSS(
        "background-color",
        "rgb(248, 245, 239)",
      );
      const hero = page.locator("[data-ui=invitation-hero]");
      await expect(hero).toHaveCSS("display", "flex");
      await expect(hero).toHaveCSS("flex-direction", "column");
      await expect(
        page.locator("[data-ui=invitation-hero-photo]"),
      ).toBeHidden();
      await expect(
        page.getByRole("heading", { name: "Anna & Jan", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      await context.close();
    }
  });
}
