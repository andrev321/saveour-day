import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
const id = "20000000-0000-4000-8000-000000000001";
function editorData() {
  const config = createDemo();
  config.id = id;
  return {
    site: { id, name: "Loading test", published_release_id: null },
    draft: { config, revision: 1 },
    publishedConfig: null,
    releases: [],
    snapshots: [],
    media: [],
    urls: {},
  };
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

test("editor loading preserves layout and offers retry after a failed request", async ({
  page,
}) => {
  const pending = gate();
  let recovered = false;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.route(`**/api/sites/${id}`, async (route) => {
    if (!recovered) {
      await pending.promise;
      await route.fulfill({ status: 503, json: { error: "Offline" } });
    } else await route.fulfill({ json: editorData() });
  });
  await page.goto(`${admin}/sites/${id}`);
  const status = page.getByRole("status", {
    name: "Otwieramy Twoje zaproszenie…",
  });
  await expect(status).toBeVisible();
  await expect(status.locator(".sod-front")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.screenshot({ path: "test-results/editor-loading.png" });
  pending.release();
  await expect(
    page.getByRole("alert").filter({ hasText: "Offline" }),
  ).toContainText("Offline");
  await expect(
    page.getByRole("link", { name: "Wróć do logowania i projektów" }),
  ).toHaveAttribute("href", "/");
  recovered = true;
  await page
    .getByRole("button", { name: "Spróbuj ponownie", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Zapisz szkic", exact: true }),
  ).toBeVisible();
});

test("upload only marks its own action pending and resets after failure", async ({
  page,
}) => {
  const pending = gate();
  let requests = 0;
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.route(`**/api/sites/${id}`, (route) =>
    route.fulfill({ json: editorData() }),
  );
  await page.route(`**/api/sites/${id}/media`, async (route) => {
    requests++;
    await pending.promise;
    await route.fulfill({ status: 503, json: { error: "Upload unavailable" } });
  });
  await page.goto(`${admin}/sites/${id}`);
  await page.getByRole("tab", { name: /Zdjęcia/ }).click();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvKkAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await expect(
    page.getByRole("button", { name: "Dodajemy zdjęcie…", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Zapisz szkic", exact: true }),
  ).not.toHaveAttribute("aria-busy", "true");
  expect(requests).toBe(1);
  pending.release();
  await expect(
    page.getByText("Upload unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dodaj zdjęcie", exact: true }),
  ).toBeEnabled();
});

test("guest code submission explains pending state and prevents duplicate requests", async ({
  page,
}) => {
  const pending = gate();
  let requests = 0;
  await page.route("**/api/guest/s/loading", async (route) => {
    if (route.request().method() === "POST") {
      requests++;
      await pending.promise;
      return route.fulfill({ status: 403, json: { error: "Invalid code" } });
    }
    return route.fulfill({
      json: { authorized: false, mode: "code", locale: "pl-PL" },
    });
  });
  await page.goto("/s/loading");
  await page.locator("input").first().fill("test-code");
  await page.locator("form button").first().click();
  await expect(
    page.getByRole("button", { name: "Sprawdzamy kod…", exact: true }),
  ).toBeDisabled();
  expect(requests).toBe(1);
  pending.release();
  await expect(page.locator("form button").first()).toBeEnabled();
  await expect(page.locator('main [role="alert"]')).toHaveText(
    "Nie udało się wykonać operacji. Spróbuj ponownie.",
  );
});

test("project load error offers direct navigation to sign-in and projects", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.route(`**/api/sites/${id}`, (route) =>
    route.fulfill({ status: 401, json: { error: "Session expired" } }),
  );
  await page.goto(`${admin}/sites/${id}`);
  await page
    .getByRole("link", { name: "Wróć do logowania i projektów" })
    .click();
  await expect(page).toHaveURL(`${admin}/`);
  await expect(page.getByText("Session expired", { exact: true })).toHaveCount(
    0,
  );
});
