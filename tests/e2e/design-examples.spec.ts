import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  applyTheme,
  applyThemePalette,
  mediaSchema,
  themeNames,
  themePalettes,
} from "../../packages/domain/src/index";
import {
  createTemplate,
  type TemplateId,
} from "../../packages/domain/src/templates";
import { guestContent } from "../../packages/domain/src/guest";

const occasions: TemplateId[] = [
  "anniversary",
  "workshop",
  "corporate",
  "anniversary",
  "birthday",
];

test("selected designs support real photos, non-wedding copy and every palette at mobile and desktop widths", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const garden = await readFile("assets/theme-redesign/media/gathering.png");
  const evening = await readFile("assets/theme-redesign/media/evening.png");
  await page.route("**/api/media/i/design-example/design-*.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: route.request().url().includes("evening") ? evening : garden,
    }),
  );
  let current = createTemplate("birthday", "design-example");
  await page.route("**/api/guest/i/design-example", (route) =>
    route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        config: guestContent(current, current.defaultVariant),
      },
    }),
  );
  for (const [index, theme] of themeNames.entries()) {
    const config = applyTheme(
      createTemplate(occasions[index], "design-example"),
      theme,
    );
    if (theme === "editorial")
      config.identity.displayName = "Spotkanie ludzi z pomysłami";
    if (theme === "botanical")
      config.identity.displayName = "Przy wspólnym stole";
    config.hero.dateLabel = "20 czerwca 2027 · 18:00";
    config.variants[0].dateLabel = config.hero.dateLabel;
    if (theme !== "classic") {
      config.media = [
        mediaSchema.parse({
          id: "photo",
          src:
            theme === "evening"
              ? "/media/design-evening.png"
              : "/media/design-garden.png",
          alt: "Stół przygotowany na spotkanie",
          width: 1536,
          height: 1024,
        }),
      ];
      config.hero.mediaId = "photo";
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const [paletteIndex, palette] of themePalettes[theme].entries()) {
        current = applyThemePalette(config, palette.id);
        await page.goto("/i/design-example");
        await expect(page.locator('[data-ui="invitation"]')).toHaveAttribute(
          "data-theme",
          theme,
        );
        await expect
          .poll(() =>
            page
              .locator('[data-ui="invitation"]')
              .evaluate((el) => el.style.getPropertyValue("--paper")),
          )
          .toBe(palette.design.paper);
        await expect(page.locator("h1")).toHaveText(
          config.identity.displayName || config.hero.title,
        );
        await page.evaluate(() => document.fonts.ready);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (config.hero.mediaId) {
          const photo = page.locator('[data-ui="invitation-hero-photo"] img');
          await expect(photo).toBeVisible();
          await expect
            .poll(() =>
              photo.evaluate((el) => (el as HTMLImageElement).naturalWidth),
            )
            .toBeGreaterThan(0);
          if (width === 390 && config.hero.layout === "split") {
            const copy = await page
              .locator('[data-ui="invitation-hero-copy"]')
              .boundingBox();
            const picture = await photo.boundingBox();
            expect(picture!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height);
          }
        }
        if (paletteIndex === 0)
          await page.screenshot({
            path: `test-results/redesign-${theme}-${width}.png`,
            fullPage: true,
            style: "nextjs-portal { display: none; }",
          });
      }
    }
  }
  expect(errors).toEqual([]);
});
