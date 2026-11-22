import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  applyTheme,
  applyThemePalette,
  mediaSchema,
  type SiteConfig,
} from "../../packages/domain/src/index";
import { createDemo } from "../../packages/domain/src/demo";
import { guestContent } from "../../packages/domain/src/guest";

type SampleImages = {
  gathering: Buffer;
  garden: Buffer;
  evening: Buffer;
};

let cachedImages: Promise<SampleImages> | null = null;

function loadSampleImages(): Promise<SampleImages> {
  if (!cachedImages) {
    cachedImages = Promise.all([
      readFile("assets/theme-redesign/media/gathering.png"),
      readFile("assets/theme-redesign/media/garden.png"),
      readFile("assets/theme-redesign/media/evening.png"),
    ]).then(([gathering, garden, evening]) => ({ gathering, garden, evening }));
  }
  return cachedImages;
}

async function mockRedesignInvitation(
  page: Page,
  config: SiteConfig,
  options?: { withRsvp?: boolean },
) {
  const images = await loadSampleImages();
  await page.route("**/api/media/i/redesign-check/*.png", (route) => {
    const url = route.request().url();
    const body = url.includes("evening")
      ? images.evening
      : url.includes("garden")
        ? images.garden
        : images.gathering;
    return route.fulfill({ contentType: "image/png", body });
  });
  await page.route("**/api/guest/i/redesign-check", (route) =>
    route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        rsvpEnabled: Boolean(options?.withRsvp),
        config: guestContent(config, config.defaultVariant),
        ...(options?.withRsvp
          ? {
              invitation: {
                groupName: "Rodzina Kowalskich",
                guests: [
                  {
                    id: "00000000-0000-4000-8000-000000000011",
                    kind: "named",
                    name: "Anna Kowalska",
                  },
                ],
                revision: 1,
                note: "",
                answers: [],
                questionAnswers: [],
              },
            }
          : {}),
      },
    }),
  );
}

test("classic theme centers text heading tightly, keeps contact prose left-aligned, and renders sharp RSVP cards at 1440px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const config = applyTheme(createDemo("redesign-check"), "classic");
  config.sections.unshift({
    id: "story",
    type: "text",
    title: "Nasza historia",
    body: "Cieszymy się, że możemy wspólnie świętować ten dzień w gronie bliskich.",
  });
  config.variants[0].sections.unshift({ sectionId: "story", visible: true });

  await mockRedesignInvitation(page, config, { withRsvp: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/i/redesign-check");

  await expect(page.locator('[data-ui="invitation"]')).toHaveAttribute(
    "data-theme",
    "classic",
  );
  await page.evaluate(() => document.fonts.ready);

  const textSection = page.locator(
    '[data-ui="invitation-section"][data-kind="text"]',
  );
  await textSection.scrollIntoViewIfNeeded();
  const numSpan = textSection.getByText("01 /", { exact: true });
  const heading = textSection.locator("h2");
  await expect(numSpan).toBeVisible();
  await expect(heading).toBeVisible();

  const [numRect, h2Rect] = await Promise.all([
    numSpan.evaluate((el) => el.getBoundingClientRect()),
    heading.evaluate((el) => el.getBoundingClientRect()),
  ]);
  expect(h2Rect.x - numRect.right).toBeGreaterThanOrEqual(0);
  expect(h2Rect.x - numRect.right).toBeLessThan(40);

  const contactProse = page.locator(
    '[data-ui="invitation-section"][data-kind="contact"] [data-ui="invitation-prose"]',
  );
  await expect(contactProse).toBeVisible();
  const proseLayout = await contactProse.evaluate((el) => {
    const style = getComputedStyle(el);
    const sectionRect = el
      .closest('[data-ui="invitation-section"]')!
      .getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      textAlign: style.textAlign,
      offsetFromSectionLeft: rect.left - sectionRect.left,
    };
  });
  expect(["left", "start"]).toContain(proseLayout.textAlign);
  expect(proseLayout.offsetFromSectionLeft).toBeLessThan(80);

  const rsvpCard = page
    .locator('[data-ui="invitation-response"] fieldset')
    .first();
  await expect(rsvpCard).toBeVisible();
  await expect(rsvpCard).toHaveCSS("border-radius", "0px");
  expect(errors).toEqual([]);
});

test("editorial DateBand aligns with InvitationMain inner content edge with zero horizontal overflow at 1920px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const config = applyTheme(createDemo("redesign-check"), "editorial");
  config.media = [
    mediaSchema.parse({
      id: "editorial-hero",
      src: "/media/redesign-gathering.png",
      alt: "Przyjęcie w nowoczesnej przestrzeni",
      width: 1536,
      height: 1024,
    }),
  ];
  config.hero.mediaId = "editorial-hero";

  await mockRedesignInvitation(page, config);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/i/redesign-check");

  await expect(page.locator('[data-ui="invitation"]')).toHaveAttribute(
    "data-theme",
    "editorial",
  );
  await expect(page.locator('[data-ui="invitation-date-band"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const metrics = await page.evaluate(() => {
    const band = document.querySelector<HTMLElement>(
      '[data-ui="invitation-date-band"]',
    )!;
    const main = document.querySelector<HTMLElement>(
      '[data-ui="invitation"] main',
    )!;
    const bandRect = band.getBoundingClientRect();
    const mainRect = main.getBoundingClientRect();
    return {
      bandInnerLeft:
        bandRect.left + Number.parseFloat(getComputedStyle(band).paddingLeft),
      mainInnerLeft:
        mainRect.left + Number.parseFloat(getComputedStyle(main).paddingLeft),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });

  expect(
    Math.abs(metrics.bandInnerLeft - metrics.mainInnerLeft),
  ).toBeLessThanOrEqual(2);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  expect(errors).toEqual([]);
});

test("botanical tablet hero photo stays wider than tall and event times use lining tabular numerals at 768px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const config = applyTheme(createDemo("redesign-check"), "botanical");
  config.media = [
    mediaSchema.parse({
      id: "botanical-hero",
      src: "/media/redesign-garden.png",
      alt: "Ogród na spotkanie",
      width: 1536,
      height: 1024,
    }),
  ];
  config.hero.mediaId = "botanical-hero";

  await mockRedesignInvitation(page, config);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/i/redesign-check");

  await expect(page.locator('[data-ui="invitation"]')).toHaveAttribute(
    "data-theme",
    "botanical",
  );
  await page.evaluate(() => document.fonts.ready);

  const heroPhoto = page.locator('[data-ui="invitation-hero-photo"]');
  const heroImg = heroPhoto.locator("img");
  await expect(heroImg).toBeVisible();
  await expect
    .poll(() => heroImg.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  const photoBox = await heroPhoto.boundingBox();
  expect(photoBox).not.toBeNull();
  expect(photoBox!.width / photoBox!.height).toBeGreaterThan(1);

  const eventTime = page.locator(".event-time").first();
  await expect(eventTime).toBeVisible();
  const fontVariantNumeric = await eventTime.evaluate(
    (el) => getComputedStyle(el).fontVariantNumeric,
  );
  expect(fontVariantNumeric).toContain("lining-nums");
  expect(fontVariantNumeric).toContain("tabular-nums");
  expect(errors).toEqual([]);
});

test("evening Pearl overlay hero avoids dark sidebars and masks at 1920px, and calendar button meets 44px target at 390px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const config = applyThemePalette(
    applyTheme(createDemo("redesign-check"), "evening"),
    "pearl",
  );
  config.media = [
    mediaSchema.parse({
      id: "evening-hero",
      src: "/media/redesign-evening.png",
      alt: "Wieczorna kolacja",
      width: 1536,
      height: 1024,
    }),
  ];
  config.hero.mediaId = "evening-hero";

  await mockRedesignInvitation(page, config);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/i/redesign-check");

  const invitation = page.locator('[data-ui="invitation"]');
  await expect(invitation).toHaveAttribute("data-theme", "evening");
  await expect(invitation).toHaveAttribute("data-color-scheme", "light");

  const hero = page.locator('[data-ui="invitation-hero"]');
  await expect(hero).toHaveAttribute("data-layout", "overlay");
  await expect(hero).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const heroPhoto = page.locator('[data-ui="invitation-hero-photo"]');
  await expect(heroPhoto).toHaveCSS("mask-image", "none");

  await page.setViewportSize({ width: 390, height: 844 });
  const calendarButton = page.locator(
    '[data-ui="invitation-header"] button[data-calendar]',
  );
  await expect(calendarButton).toBeVisible();
  const box = await calendarButton.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(errors).toEqual([]);
});

test("adaptive 3-photo gallery displays all images visibly and supports accessible keyboard Lightbox at 1440px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const config = createDemo("redesign-check");
  config.media = [
    mediaSchema.parse({
      id: "gallery-1",
      src: "/media/redesign-gathering.png",
      alt: "Stół weselny",
      width: 1536,
      height: 1024,
    }),
    mediaSchema.parse({
      id: "gallery-2",
      src: "/media/redesign-garden.png",
      alt: "Ogród",
      width: 1536,
      height: 1024,
    }),
    mediaSchema.parse({
      id: "gallery-3",
      src: "/media/redesign-evening.png",
      alt: "Wieczorne światła",
      width: 1536,
      height: 1024,
    }),
  ];
  config.sections.push({
    id: "gallery",
    type: "gallery",
    title: "Galeria",
    body: "",
    mediaIds: ["gallery-1", "gallery-2", "gallery-3"],
    crops: {},
  });
  config.variants[0].sections.push({ sectionId: "gallery", visible: true });

  await mockRedesignInvitation(page, config);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/i/redesign-check");

  const gallerySection = page.locator(
    '[data-ui="invitation-section"][data-kind="gallery"]',
  );
  await gallerySection.scrollIntoViewIfNeeded();
  await expect(gallerySection.locator('[data-count="3"]')).toBeVisible();

  const images = gallerySection.locator("img");
  await expect(images).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) {
    const img = images.nth(i);
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(img).toHaveCSS("opacity", "1");
  }

  await gallerySection.locator('[data-ui="gallery-item"]').first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("1 / 3");

  await page.keyboard.press("ArrowRight");
  await expect(dialog).toContainText("2 / 3");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("frosted sticky header updates scroll telemetry and RSVP card marks confirmed on Będę click at 1440px", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const config = createDemo("redesign-check");
  await mockRedesignInvitation(page, config, { withRsvp: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/i/redesign-check");

  const invitation = page.locator('[data-ui="invitation"]');
  const header = page.locator('[data-ui="invitation-header"]');
  await expect(header).toBeVisible();
  await expect(header).not.toHaveAttribute("data-scrolled", "true");

  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-scrolled", "true");
  await expect
    .poll(async () =>
      Number(
        await invitation.evaluate((el) =>
          el.style.getPropertyValue("--scroll-progress"),
        ),
      ),
    )
    .toBeGreaterThan(0);

  const guestCard = page
    .locator('[data-ui="invitation-response"] fieldset')
    .first();
  await guestCard.scrollIntoViewIfNeeded();
  await expect(guestCard).not.toHaveAttribute("data-confirmed", "true");

  await guestCard
    .locator('[data-choice="yes"]', { hasText: "Będę" })
    .first()
    .click();
  await expect(guestCard).toHaveAttribute("data-confirmed", "true");
  expect(errors).toEqual([]);
});
