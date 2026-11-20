import { test, expect, type Locator } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
const id = "20000000-0000-4000-8000-000000000099";

async function assertStickyInModal(dialog: Locator) {
  const body = dialog.locator(".mantine-Modal-body");
  const topBar = dialog.locator('[data-ui="modal-sticky-top"]');
  const footer = dialog.locator('[data-ui="modal-sticky-footer"]');

  await expect(body).toBeVisible();
  await expect(topBar).toBeVisible();
  await expect(footer).toBeVisible();

  // Wait for Mantine modal open transition to finish before measuring positions.
  await dialog.evaluate(async (el) => {
    const root = el.closest(".mantine-Modal-root") ?? el;
    await Promise.allSettled(
      root.getAnimations({ subtree: true }).map((a) => a.finished),
    );
  });
  await expect
    .poll(async () => {
      const a = await topBar.boundingBox();
      await dialog
        .page()
        .evaluate(() => new Promise((r) => requestAnimationFrame(r)));
      const b = await topBar.boundingBox();
      return a && b ? Math.abs(a.y - b.y) : Infinity;
    })
    .toBeLessThan(0.5);

  const metrics = await body.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.scrollWidth - metrics.clientWidth).toBeLessThanOrEqual(1);

  const bodyBox = (await body.boundingBox())!;
  const initialTopBox = (await topBar.boundingBox())!;
  const initialFooterBox = (await footer.boundingBox())!;

  expect(initialTopBox.y).toBeGreaterThanOrEqual(bodyBox.y - 1);
  expect(initialFooterBox.y + initialFooterBox.height).toBeLessThanOrEqual(
    bodyBox.y + bodyBox.height + 1,
  );

  // Scroll to the middle of the modal body.
  await body.evaluate((el) => {
    el.scrollTop = Math.floor((el.scrollHeight - el.clientHeight) / 2);
  });
  const midTopBox = (await topBar.boundingBox())!;
  const midFooterBox = (await footer.boundingBox())!;
  expect(Math.abs(midTopBox.y - initialTopBox.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(midFooterBox.y - initialFooterBox.y)).toBeLessThanOrEqual(2);

  // Scroll all the way to the bottom of the modal body.
  await body.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const endTopBox = (await topBar.boundingBox())!;
  const endFooterBox = (await footer.boundingBox())!;
  expect(Math.abs(endTopBox.y - initialTopBox.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(endFooterBox.y - initialFooterBox.y)).toBeLessThanOrEqual(2);
}

test("section edit modal keeps top tab switcher and bottom Done button sticky on scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.goto(`${admin}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();

  const dialog = page.getByRole("dialog", { name: "Początek zaproszenia" });
  await expect(dialog).toBeVisible();
  await assertStickyInModal(dialog);

  // Switching to Podgląd while scrolled works and keeps footer visible.
  await dialog.getByText("Podgląd", { exact: true }).click();
  await expect(
    dialog.getByRole("button", { name: "Gotowe", exact: true }),
  ).toBeVisible();
});

test("invitation editor modal keeps mode tabs and action buttons sticky on scroll", async ({
  page,
}) => {
  const config = createDemo();
  config.id = id;
  const site = {
    id,
    name: "Testowe zaproszenie",
    access_mode: "public",
    public_variant_id: config.defaultVariant,
    access_version: 1,
    rsvp_deadline: null,
    published_release_id: "release",
  };
  await page.setViewportSize({ width: 390, height: 640 });
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.route(`**/api/sites/${id}`, (route) =>
    route.fulfill({
      json: {
        site,
        draft: { config, revision: 1 },
        releases: [],
        snapshots: [],
        media: [],
        urls: {},
      },
    }),
  );
  await page.route(`**/api/sites/${id}/guests`, (route) =>
    route.fulfill({
      json: {
        site,
        invitations: [],
        variants: config.variants,
        answers: [],
        url: "https://example.test/s/wesele",
      },
    }),
  );

  await page.goto(`${admin}/sites/${id}`);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Goście", exact: true })
    .click();
  await page.getByRole("button", { name: "Nowe zaproszenie" }).click();

  const dialog = page.getByRole("dialog", { name: "Nowe zaproszenie" });
  await expect(dialog).toBeVisible();
  await dialog.getByText("Grupa", { exact: true }).click();

  const addPerson = dialog.getByRole("button", { name: "+ Dodaj osobę" });
  for (let i = 0; i < 6; i++) {
    await addPerson.click();
  }

  await assertStickyInModal(dialog);
});
