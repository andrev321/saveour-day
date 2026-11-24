import { test, expect, type Page } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
const id = "20000000-0000-4000-8000-000000000001";
test.use({ hasTouch: true });

async function openGuests(page: Page, width: number) {
  const config = createDemo();
  config.id = id;
  const site = {
    id,
    name: "Bardzo długa nazwa naszego wspólnego zaproszenia",
    access_mode: "public",
    public_variant_id: config.defaultVariant,
    access_version: 1,
    rsvp_deadline: null,
    published_release_id: "release",
  };
  const invitations = ["Kowalskich", "Nowaków"].map((family, n) => ({
    id: `invitation-${n}`,
    group_name: `Rodzina ${family}`,
    variant_id: config.defaultVariant,
    guests: [{ id: `guest-${n}`, kind: "named", name: `Anna ${family}` }],
    revoked: false,
    version: 1,
    rsvp_revision: 0,
    note: "",
    short_code: `KOD${n}23`,
    origin: "organizer",
    review_status: "approved",
    events: config.events,
  }));
  await page.setViewportSize({ width, height: 844 });
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
        invitations,
        variants: config.variants,
        answers: [],
        url: "https://example.test/s/wesele",
      },
    }),
  );
  await page.goto(`${admin}/sites/${id}`);
  if (width < 1100) {
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Goście", exact: true })
      .click();
  } else await page.getByRole("tab", { name: "Goście", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Lista zaproszeń i RSVP" }),
  ).toBeVisible();
}

async function expectContained(page: Page) {
  const form = page.locator('[data-ui="workspace-form"]');
  expect(
    await form.evaluate((el) => el.scrollWidth - el.clientWidth),
  ).toBeLessThanOrEqual(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

for (const width of [320, 768, 1280]) {
  test(`guest filters, family editor and QR fit the panel at ${width}px`, async ({
    page,
  }) => {
    await openGuests(page, width);
    const search = page.getByLabel("Szukaj osoby, grupy lub kodu");
    const responses = page.getByRole("combobox", {
      name: "Odpowiedzi",
      exact: true,
    });
    await search.scrollIntoViewIfNeeded();
    const a = (await search.boundingBox())!,
      b = (await responses.boundingBox())!;
    expect(a.width).toBeGreaterThan(200);
    expect(b.width).toBeGreaterThan(200);
    // Controls must either share a row without overlap, or form separate rows.
    expect(a.y + a.height <= b.y || a.x + a.width <= b.x).toBe(true);
    await search.fill("Kowalskich");
    await expect(page.getByText("Rodzina Nowaków")).toHaveCount(0);
    await expect(page.getByText("Rodzina Kowalskich")).toBeVisible();
    await search.fill("");
    await responses.click();
    await page.getByRole("option", { name: "Czekamy", exact: true }).click();
    await expect(responses).toHaveValue("Czekamy");
    await expectContained(page);
    await page.screenshot({ path: `test-results/mobile-guests-${width}.png` });
    await page
      .getByRole("button", { name: "Akcje", exact: true })
      .first()
      .click();
    await page
      .getByRole("menuitem", { name: "Edytuj zaproszenie", exact: true })
      .click();
    const member = page.getByRole("textbox", { name: "Osoba 1", exact: true });
    await expect(member).toHaveValue("Anna Kowalskich");
    expect((await member.boundingBox())!.width).toBeGreaterThan(180);
    await expectContained(page);
    await page.getByRole("button", { name: "Anuluj", exact: true }).click();
    await page
      .getByRole("button", { name: "Publikacja i dostęp", exact: true })
      .click();
    const qr = page.getByLabel("Podgląd kodu QR").locator("canvas");
    await expect(qr).toBeVisible();
    await qr.scrollIntoViewIfNeeded();
    const bounds = (await qr.boundingBox())!;
    expect(bounds.width).toBeLessThanOrEqual(280);
    expect(Math.abs(bounds.width - bounds.height)).toBeLessThan(1);
    await expectContained(page);
    await page.screenshot({ path: `test-results/mobile-qr-${width}.png` });
    if (width < 1100) {
      const nav = page.locator('[data-ui="workspace-mobile-nav"]');
      const header = page.locator('[data-ui="workspace-header"]');
      expect(
        await nav.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
      expect(
        await header.evaluate((el) => el.scrollWidth - el.clientWidth),
      ).toBeLessThanOrEqual(1);
      expect((await nav.boundingBox())!.height).toBeGreaterThanOrEqual(60);
      expect((await header.boundingBox())!.height).toBeGreaterThanOrEqual(56);
    }
  });
}

for (const width of [320, 390]) {
  test(`editor sections, project options popover and drawer fit a touch screen at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto(`${admin}/demo`);
    await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();

    await page.getByRole("button", { name: "Opcje projektu" }).click();
    const menu = page.locator('[data-ui="project-actions-menu"]');
    await expect(menu).toBeVisible();
    const menuBox = (await menu.boundingBox())!;
    expect(menuBox.x).toBeGreaterThanOrEqual(8);
    expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width - 8);
    for (const control of await menu
      .locator("button:visible, input:visible")
      .all()) {
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(menuBox.x);
      expect(box.x + box.width).toBeLessThanOrEqual(
        menuBox.x + menuBox.width + 1,
      );
      expect(box.x + box.width).toBeLessThanOrEqual(width - 8);
    }
    await page.screenshot({
      path: `test-results/mobile-options-${width}.png`,
    });
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const drawer = page.getByRole("dialog");
    const projectsLink = drawer.getByRole("link", {
      name: "Realizacje",
      exact: true,
    });
    const historyButton = drawer.getByRole("button", {
      name: "Historia publikacji",
      exact: true,
    });
    const projectsBox = (await projectsLink.boundingBox())!;
    const historyBox = (await historyButton.boundingBox())!;
    expect(projectsBox.y).toBeGreaterThan(historyBox.y);
    await page.screenshot({
      path: `test-results/mobile-drawer-${width}.png`,
    });
    await page.keyboard.press("Escape");

    for (const panel of [
      "Treść",
      "Wygląd",
      "Zdjęcia",
      "Ustawienia",
      "Historia publikacji",
    ]) {
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: panel, exact: true })
        .click();
      if (panel === "Treść") {
        await page
          .getByRole("button", { name: "Początek zaproszenia", exact: true })
          .click();
        await expect(
          page.getByLabel("Główny napis", { exact: true }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
      }
      await expectContained(page);
      await page.screenshot({
        path: `test-results/mobile-panel-${width}-${panel}.png`,
      });
    }
  });
}

test("project dashboard fits a 320px touch screen", async ({ page }) => {
  const width = 320;
  await page.setViewportSize({ width, height: 740 });
  await page.route("**/api/sites", (route) =>
    route.fulfill({
      json: {
        sites: [
          {
            id,
            name: "Długa nazwa naszego zaproszenia dla przyjaciół i rodziny",
            published_release_id: "release",
          },
        ],
        admin: false,
      },
    }),
  );
  await page.goto(`${admin}/demo/projects`);
  await expect(
    page.getByRole("heading", {
      name: "Długa nazwa naszego zaproszenia dla przyjaciół i rodziny",
    }),
  ).toBeVisible();
  const header = page.locator("header");
  for (const control of await header
    .locator("button:visible, input:visible")
    .all()) {
    const box = (await control.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 8);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: `test-results/mobile-dashboard-${width}.png`,
    fullPage: true,
  });
});

test("mobile Edycja and Podgląd slide horizontally, preserve scroll, and isolate off-screen panel", async ({
  page,
}) => {
  const width = 390;
  await page.setViewportSize({ width, height: 740 });
  await page.goto(`${admin}/demo`);
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();

  const workspace = page.locator('[data-ui="editor-workspace"]');
  const editPanel = page.locator("#workspace-edit");
  const previewPanel = page.locator("#workspace-preview");

  await expect(workspace).toHaveAttribute("data-view", "edit");
  await expect(editPanel).not.toHaveAttribute("inert", "");
  await expect(editPanel).not.toHaveAttribute("aria-hidden", "true");
  await expect(previewPanel).toHaveAttribute("inert", "");
  await expect(previewPanel).toHaveAttribute("aria-hidden", "true");

  const initialEditBox = (await editPanel.boundingBox())!;
  const initialPreviewBox = (await previewPanel.boundingBox())!;
  expect(initialEditBox.x).toBe(0);
  expect(initialEditBox.width).toBe(width);
  expect(initialPreviewBox.x).toBeGreaterThanOrEqual(width);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);

  const scrolled = await editPanel.evaluate((el) => {
    el.scrollTop = 180;
    return el.scrollTop;
  });
  expect(scrolled).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Podgląd", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-view", "preview");
  await expect(previewPanel).not.toHaveAttribute("inert", "");
  await expect(previewPanel).not.toHaveAttribute("aria-hidden", "true");
  await expect(editPanel).toHaveAttribute("inert", "");
  await expect(editPanel).toHaveAttribute("aria-hidden", "true");

  await expect.poll(async () => (await previewPanel.boundingBox())!.x).toBe(0);
  const activePreviewBox = (await previewPanel.boundingBox())!;
  const hiddenEditBox = (await editPanel.boundingBox())!;
  expect(activePreviewBox.width).toBe(width);
  expect(hiddenEditBox.x + hiddenEditBox.width).toBeLessThanOrEqual(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Edycja", exact: true }).click();
  await expect(workspace).toHaveAttribute("data-view", "edit");
  await expect.poll(async () => (await editPanel.boundingBox())!.x).toBe(0);
  expect(await editPanel.evaluate((el) => el.scrollTop)).toBe(scrolled);
  await expect(previewPanel).toHaveAttribute("inert", "");
  await expect(previewPanel).toHaveAttribute("aria-hidden", "true");

  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Zamknij nawigację" }).click();
  await expect(drawer).toHaveCount(0);
});
