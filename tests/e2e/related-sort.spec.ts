import { test, expect, type Page, type Locator } from "@playwright/test";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
const order = (section: Locator) =>
  section
    .locator('[data-ui="reference-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-testid")));
const sections = (page: Page) =>
  page
    .locator('[data-testid^="section-"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-testid")));
async function drag(page: Page, from: Locator, to: Locator, touch = false) {
  await from.scrollIntoViewIfNeeded();
  const source = (await from.boundingBox())!;
  const target = (await to.boundingBox())!;
  const x = source.x + source.width / 2;
  const start = source.y + source.height / 2;
  const end = target.y + target.height / 2;
  if (!touch) {
    await page.mouse.move(x, start);
    await page.mouse.down();
    await page.mouse.move(x, end, { steps: 12 });
    await page.mouse.up();
    return;
  }
  const session = await page.context().newCDPSession(page);
  const point = (y: number) => ({
    x,
    y,
    id: 1,
    radiusX: 6,
    radiusY: 6,
    force: 1,
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point(start)],
  });
  await page.waitForTimeout(200);
  for (let step = 1; step <= 12; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [point(start + ((end - start) * step) / 12)],
    });
    await page.waitForTimeout(16);
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await session.detach();
}

for (const touch of [false, true]) {
  test.describe(touch ? "touch item sorting" : "mouse item sorting", () => {
    test.use(
      touch
        ? {
            viewport: { width: 390, height: 1000 },
            isMobile: true,
            hasTouch: true,
          }
        : { viewport: { width: 1440, height: 1000 } },
    );
    test("programme and contacts reorder independently from sections", async ({
      page,
    }) => {
      await page.goto(admin + "/demo");
      await page
        .getByRole("button", { name: "Otwórz gotowy przykład" })
        .click();
      const beforeSections = await sections(page);
      const timeline = page.getByTestId("section-timeline");
      await timeline.getByRole("button", { name: /Plan naszego dnia/ }).click();
      await expect(
        page.getByRole("button", { name: /Przesuń wyżej|Przesuń niżej/ }),
      ).toHaveCount(0);
      const handle = page.getByTestId("related-handle-ceremony");
      await expect(handle).toHaveCSS("touch-action", "none");
      await drag(page, handle, page.getByTestId("related-handle-party"), touch);
      await expect
        .poll(() => order(timeline))
        .toEqual(["related-item-party", "related-item-ceremony"]);
      await expect.poll(() => sections(page)).toEqual(beforeSections);
      // Selection remains attached to the same event when its position changes.
      await timeline
        .getByTestId("related-item-ceremony")
        .getByRole("button", { name: "Ceremonia", exact: true })
        .click();
      const title = timeline.getByLabel("Nazwa wydarzenia", { exact: true });
      await expect(title).toHaveValue("Ceremonia");
      await drag(page, page.getByTestId("related-handle-party"), handle, touch);
      await expect
        .poll(() => order(timeline))
        .toEqual(["related-item-ceremony", "related-item-party"]);
      await expect(title).toHaveValue("Ceremonia");
      const contact = page.getByTestId("section-contact");
      await contact.getByRole("button", { name: /Dajcie znać/ }).click();
      await contact.getByRole("button", { name: "Dodaj nowy element" }).click();
      await contact
        .getByLabel("Imię / nazwa", { exact: true })
        .fill("Drugi kontakt");
      const before = await order(contact);
      await drag(
        page,
        contact.locator('[data-testid^="related-handle-"]').first(),
        contact.locator('[data-testid^="related-handle-"]').last(),
        touch,
      );
      await expect.poll(() => order(contact)).toEqual([...before].reverse());
      await expect(
        contact.getByLabel("Imię / nazwa", { exact: true }),
      ).toHaveValue("Drugi kontakt");
      await expect.poll(() => sections(page)).toEqual(beforeSections);
    });
  });
}

test("gallery items reorder with keyboard and keep photo selection", async ({
  page,
}) => {
  await page.route("**/media/library-demo.webp", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#a6b99b"/></svg>',
    }),
  );
  await page.goto(admin + "/demo/photos");
  await page.getByRole("tab", { name: "Zdjęcia", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Podgląd i opis: Zdjęcie z biblioteki",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Dodaj do zaproszenia", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Gotowe", exact: true }).click();
  await page.getByRole("tab", { name: "Treść", exact: true }).click();
  const gallery = page.getByTestId("section-gallery");
  await gallery.getByRole("button", { name: /^Galeria/ }).click();
  await gallery.getByLabel("Dodaj istniejący", { exact: true }).click();
  await page.getByRole("option", { name: /Zdjęcie z biblioteki/ }).click();
  await gallery.getByRole("button", { name: "Dodaj", exact: true }).click();
  const beforeSections = await sections(page);
  const handle = page.getByTestId("related-handle-saved");
  await handle.scrollIntoViewIfNeeded();
  await handle.focus();
  await handle.press("Space", { delay: 100 });
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await handle.press("ArrowUp", { delay: 100 });
  await handle.press("Space", { delay: 100 });
  await expect
    .poll(() => order(gallery))
    .toEqual(["related-item-saved", "related-item-photo"]);
  await expect.poll(() => sections(page)).toEqual(beforeSections);
  await expect(
    gallery.getByRole("combobox", {
      name: "Zdjęcie dla wybranego urządzenia",
      exact: true,
    }),
  ).toHaveValue("Zdjęcie z biblioteki");
  await expect
    .poll(() =>
      page
        .frameLocator("iframe")
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.map((img) => img.getAttribute("alt")).slice(-2),
        ),
    )
    .toEqual(["Zdjęcie z biblioteki", "Zdjęcie testowe"]);
  await expect(
    page.getByRole("button", { name: /Przesuń wyżej|Przesuń niżej/ }),
  ).toHaveCount(0);
});
