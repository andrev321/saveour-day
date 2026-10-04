import { test, expect } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 900 },
  isMobile: true,
  hasTouch: true,
});

test("touch handle reorders sections while the rest of the list still scrolls", async ({
  page,
}) => {
  const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
  await page.goto(admin + "/demo");
  await page.getByRole("button", { name: "Otwórz gotowy przykład" }).click();
  const form = page.locator('[data-ui="workspace-form"]');
  const handle = page.getByTestId("drag-handle-timeline");
  await expect(handle).toHaveCSS("touch-action", "none");
  await expect(
    page.getByRole("button", { name: /Przesuń sekcję/ }),
  ).toHaveCount(0);
  await handle.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await expect(handle).toBeInViewport();
  await expect(page.getByTestId("drag-handle-ceremony")).toBeInViewport();
  const source = await handle.boundingBox();
  const target = await page.getByTestId("drag-handle-ceremony").boundingBox();
  expect(source!.width).toBeGreaterThanOrEqual(44);
  const beforeScroll = await form.evaluate((el) => el.scrollTop);
  const session = await page.context().newCDPSession(page);
  const x = source!.x + source!.width / 2;
  const startY = source!.y + source!.height / 2;
  const endY = target!.y + target!.height / 2;
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
    touchPoints: [point(startY)],
  });
  await page.waitForTimeout(200);
  for (let step = 1; step <= 8; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [point(startY + ((endY - startY) * step) / 8)],
    });
    await page.waitForTimeout(16);
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const order = () =>
    page
      .locator('[data-testid^="section-"]')
      .evaluateAll((rows) => rows.map((r) => r.getAttribute("data-testid")));
  await expect
    .poll(order)
    .toEqual([
      "section-ceremony",
      "section-timeline",
      "section-party",
      "section-parking",
      "section-contact",
    ]);
  expect(await form.evaluate((el) => el.scrollTop)).toBe(beforeScroll);

  const row = await page.getByTestId("section-timeline").boundingBox();
  const scrollPoint = (y: number) => ({
    x: row!.x + row!.width / 2,
    y,
    id: 2,
    radiusX: 6,
    radiusY: 6,
    force: 1,
  });
  const scrollY = row!.y + row!.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [scrollPoint(scrollY)],
  });
  for (let step = 1; step <= 8; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [scrollPoint(scrollY - step * 15)],
    });
    await page.waitForTimeout(16);
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => form.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(beforeScroll);
  await expect
    .poll(order)
    .toEqual([
      "section-ceremony",
      "section-timeline",
      "section-party",
      "section-parking",
      "section-contact",
    ]);
  await session.detach();
});
