import { test, expect } from "@playwright/test";

test("invitation styles and content are delivered by the server without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${baseURL}/demo/pelna`);
    expect(await response!.text()).toContain("data-styled");
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
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
      await expect(
        page.locator('[data-ui="invitation-section"]').last(),
      ).toHaveCSS("opacity", "1");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  } finally {
    await context.close();
  }
});
