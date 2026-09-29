import { test, expect } from "@playwright/test";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
const site = {
  id: "20000000-0000-4000-8000-000000000001",
  name: "Ślub Anny i Jana",
  created_at: "2026-09-28T12:00:00Z",
  published_release_id: "release",
  canDelete: true,
};

test("pending authentication shows skeletons, not login; network failures can be retried", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let retry = false;
  await page.route("**/api/sites", async (route) => {
    if (!retry) {
      await gate;
      await route.fulfill({
        status: 503,
        json: { error: "Temporarily unavailable" },
      });
    } else await route.fulfill({ json: { sites: [site], admin: false } });
  });
  await page.goto(`${admin}/demo/projects`);
  await expect(
    page.getByRole("status", { name: "Wczytujemy Twoje realizacje…" }),
  ).toBeVisible();
  await expect(page.getByLabel("Hasło", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: "test-results/dashboard-loading.png",
    fullPage: true,
  });
  release();
  await expect(
    page.getByText("Nie udało się wczytać realizacji", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Hasło", { exact: true })).toHaveCount(0);
  retry = true;
  await page
    .getByRole("button", { name: "Spróbuj ponownie", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: site.name })).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Wczytujemy Twoje realizacje…" }),
  ).toHaveCount(0);
});
test("401 reveals login only after the session check finishes", async ({
  page,
}) => {
  await page.route("**/api/sites", (route) =>
    route.fulfill({ status: 401, json: { error: "Zaloguj się ponownie" } }),
  );
  await page.goto(`${admin}/demo/projects`);
  await expect(page.getByLabel("Hasło", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Utwórz zaproszenie", exact: true }),
  ).toHaveCount(0);
});
test("deletion needs confirmation, keeps the card on failure and removes it after success", async ({
  page,
}) => {
  await page.route("**/api/sites", (route) =>
    route.fulfill({ json: { sites: [site], admin: false } }),
  );
  let calls = 0;
  await page.route(`**/api/sites/${site.id}`, (route) => {
    expect(route.request().method()).toBe("DELETE");
    calls++;
    return route.fulfill(
      calls === 1
        ? { status: 503, json: { error: "Spróbuj ponownie" } }
        : { json: { deletedAt: new Date().toISOString() } },
    );
  });
  await page.goto(`${admin}/demo/projects`);
  await page
    .getByRole("button", { name: `Usuń ${site.name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Anuluj", exact: true }).click();
  expect(calls).toBe(0);
  await page
    .getByRole("button", { name: `Usuń ${site.name}`, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "ponad miesiąc wcześniej",
  );
  await page
    .getByRole("button", { name: "Usuń realizację", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: site.name })).toBeVisible();
  await page
    .getByRole("button", { name: "Usuń realizację", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: site.name })).toHaveCount(0);
  await expect(
    page.getByText("Realizacja została usunięta z panelu.", { exact: true }),
  ).toBeVisible();
});
for (const width of [390, 1440])
  test(`projects stay readable and searchable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.route("**/api/sites", (route) =>
      route.fulfill({
        json: {
          sites: [
            site,
            {
              ...site,
              id: "second",
              name: "Urodziny Zofii",
              published_release_id: null,
            },
            {
              ...site,
              id: "third",
              name: "Spotkanie zespołu",
              canDelete: false,
            },
          ],
          admin: false,
        },
      }),
    );
    await page.goto(`${admin}/demo/projects`);
    await expect(page.getByRole("heading", { name: site.name })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Usuń Spotkanie zespołu", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("textbox", { name: "Szukaj realizacji" })
      .fill("Zofii");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Urodziny Zofii" }),
    ).toBeVisible();
  });
