import { test, expect } from "@playwright/test";
for (const width of [320, 360, 390, 430, 768, 1024, 1440, 1920])
  test(`invitation reflows at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/obiad");
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
  for (const route of ["slub", "obiad", "grill"]) {
    await page.goto(`/${route}`);
    await page.reload();
    await expect(page.locator("main")).toBeVisible();
  }
});
test("admin demo edits and saves before simulated publication", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:3000/demo");
  await expect(
    page.getByText("Demonstracja lokalna", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Pierwsze imię", { exact: true }).fill("Zmieniona");
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
      .getByRole("heading", { name: "Zmieniona & Jan", exact: true }),
  ).toBeVisible();
});
test("anonymous API access is denied when services are not configured", async ({
  request,
}) => {
  const response = await request.get("http://127.0.0.1:3000/api/sites");
  expect([401, 503]).toContain(response.status());
  const forged = await request.post("http://127.0.0.1:3000/api/sites", {
    headers: { Origin: "https://attacker.example" },
    data: { name: "forged" },
  });
  expect(forged.status()).toBe(403);
});
