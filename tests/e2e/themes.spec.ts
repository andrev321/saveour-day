import { test, expect } from "@playwright/test";
import {
  themeNames,
  themes,
  themePalettes,
} from "../../packages/domain/src/themes";
import { createDemo } from "../../packages/domain/src/demo";
import { mediaSchema, parseSiteConfig } from "../../packages/domain/src/index";
import sharp from "sharp";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("all palette controls update actual colors without changing event content", async ({
  page,
}) => {
  await page.goto(`${admin}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await page
    .getByLabel("Główny napis", { exact: true })
    .fill("Spotkanie zespołu");
  await page.getByRole("tab", { name: "Wygląd", exact: true }).click();
  const preview = page.frameLocator("iframe");
  for (const theme of themeNames) {
    await page
      .getByRole("button", { name: themes[theme].labels.pl, exact: true })
      .click();
    for (const palette of themePalettes[theme]) {
      const option = page.getByRole("button", {
        name: palette.labels.pl,
        exact: true,
      });
      await option.click();
      await expect(option).toHaveAttribute("aria-pressed", "true");
      await expect(preview.locator("h1")).toHaveText("Spotkanie zespołu");
      await expect(preview.locator(".title-ampersand")).toHaveCount(0);
      await expect
        .poll(() =>
          preview
            .locator('[data-ui="invitation"]')
            .evaluate((el) => el.style.getPropertyValue("--paper")),
        )
        .toBe(palette.design.paper);
    }
  }
  await page.getByLabel("Kolor akcentu", { exact: true }).fill("#502030");
  await expect(page.locator('[data-ui="selected-palette"]')).toHaveText(
    "Własne kolory",
  );
  await page
    .getByRole("button", { name: themes.celebration.labels.pl, exact: true })
    .click();
  await expect(page.getByLabel("Kolor akcentu", { exact: true })).toHaveValue(
    "#502030",
  );
  await page.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
  await page.getByRole("tab", { name: "Treść", exact: true }).click();
  await expect(page.getByLabel("Główny napis", { exact: true })).toHaveValue(
    "Spotkanie zespołu",
  );
});

test("five themes render on desktop and mobile without overflow or runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const theme of themeNames) {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/demo/glowna?theme=${theme}`);
      await expect(
        page.getByRole("heading", { name: "Anna & Jan", exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(`[data-ui="invitation"][data-theme="${theme}"]`),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/theme-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  }
  expect(errors).toEqual([]);
});

test("photo frames and galleries remain visible in every theme and hero layout", async ({
  page,
}) => {
  const image = await sharp({
    create: { width: 800, height: 1000, channels: 3, background: "#a6b99b" },
  })
    .png()
    .toBuffer();
  await page.route("**/media/theme-test.png", (route) =>
    route.fulfill({ contentType: "image/png", body: image }),
  );
  await page.goto(`${admin}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  const preview = page.frameLocator("iframe");
  await expect(preview.locator("h1")).toBeVisible();
  const config = createDemo();
  config.media = [
    mediaSchema.parse({
      id: "photo",
      src: "/media/theme-test.png",
      alt: "Zdjęcie testowe",
      width: 800,
      height: 1000,
    }),
  ];
  config.hero.mediaId = "photo";
  config.variants[0].sections.push({ sectionId: "gallery", visible: true });
  config.sections.push({
    id: "gallery",
    type: "gallery",
    title: "Galeria",
    body: "",
    crops: {},
    mediaIds: ["photo"],
  });
  for (const theme of themeNames) {
    for (const layout of ["split", "overlay"] as const) {
      config.theme = theme;
      config.design = themes[theme].design;
      config.appearance = themes[theme].appearance;
      config.hero.layout = layout;
      await page.evaluate(
        (config) =>
          document
            .querySelector("iframe")!
            .contentWindow!.postMessage(
              { type: "preview-config", config, urls: {} },
              location.origin,
            ),
        parseSiteConfig(config),
      );
      await expect(preview.locator('[data-ui="invitation"]')).toHaveAttribute(
        "data-theme",
        theme,
      );
      await expect(
        preview.locator('[data-ui="invitation-hero"]'),
      ).toHaveAttribute("data-layout", layout);
      const photo = preview.locator('[data-ui="invitation-hero-photo"] img');
      await expect(photo).toBeVisible();
      expect(
        await photo.evaluate((el) => (el as HTMLImageElement).naturalWidth),
      ).toBe(800);
      const gallery = preview.locator('[data-kind="gallery"] img');
      await gallery.scrollIntoViewIfNeeded();
      await expect(gallery).toBeVisible();
      const bounds = await gallery.boundingBox();
      expect(bounds!.height).toBeGreaterThan(100);
      await expect(preview.locator("h1")).toHaveCSS(
        "font-family",
        themes[theme].headingFont,
      );
    }
  }
});

test("theme picker updates preview, preserves content and toggles ornaments and icons", async ({
  page,
}) => {
  await page.goto(`${admin}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await page
    .getByLabel("Główny napis", { exact: true })
    .fill("Aleksandra & Konstanty");
  await page.getByRole("tab", { name: "Wygląd", exact: true }).click();
  await page
    .getByRole("button", { name: "Radosne świętowanie", exact: true })
    .click();
  const preview = page.frameLocator("iframe");
  await expect(preview.locator('[data-ui="invitation"]')).toHaveAttribute(
    "data-theme",
    "celebration",
  );
  await expect(
    preview.getByRole("heading", {
      name: "Aleksandra & Konstanty",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("switch", { name: "Ikony modułów" }).uncheck();
  await page.getByRole("combobox", { name: "Dekoracje", exact: true }).click();
  await page.getByRole("option", { name: "Brak", exact: true }).click();
  await expect(preview.locator('[data-ui="invitation"]')).toHaveAttribute(
    "data-decorations",
    "none",
  );
  await expect(preview.locator('[data-ui="invitation"] svg')).toHaveCount(0);
  await page.screenshot({
    path: "test-results/theme-picker.png",
    fullPage: true,
  });
});
