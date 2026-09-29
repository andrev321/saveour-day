import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";
import { mediaSchema } from "../../packages/domain/src/index";
import sharp from "sharp";

const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("preview retries a failed photo when signed URLs arrive and when another photo is selected", async ({
  page,
}) => {
  const image = await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#a6b99b" },
  })
    .webp()
    .toBuffer();
  await page.route("**/media/upload.webp", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.route("**/media/signed.webp*", (route) =>
    route.fulfill({ contentType: "image/webp", body: image }),
  );
  await page.goto(`${admin}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  const preview = page.frameLocator("iframe");
  await expect(preview.locator("h1")).toBeVisible();
  const config = createDemo();
  config.media = [
    mediaSchema.parse({
      id: "uploaded",
      src: "/media/upload.webp",
      alt: "Dodane zdjęcie",
      width: 800,
      height: 600,
    }),
  ];
  config.hero.mediaId = "uploaded";
  const send = (urls: Record<string, string>) =>
    page.evaluate(
      ({ config, urls }) => {
        document
          .querySelector("iframe")!
          .contentWindow!.postMessage(
            { type: "preview-config", config, urls },
            location.origin,
          );
      },
      { config, urls },
    );
  await send({});
  const photo = preview.locator('[data-ui="invitation-hero-photo"] img');
  await expect(
    preview.getByRole("img", { name: "Dodane zdjęcie" }),
  ).toBeVisible();
  await expect(photo).toHaveCount(0);
  await send({ "/media/upload.webp": "/media/signed.webp?token=fresh" });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(800);
  await send({});
  await expect(photo).toHaveCount(0);
  config.media = [
    mediaSchema.parse({
      id: "replacement",
      src: "/media/signed.webp",
      alt: "Nowe zdjęcie",
      width: 800,
      height: 600,
    }),
  ];
  config.hero.mediaId = "replacement";
  await send({});
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(800);
});
