import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createAccentPalette,
  Invitation,
} from "../packages/renderer/src/index.tsx";
import { createDemo } from "../packages/domain/src/demo.ts";
import {
  mediaSchema,
  parseSiteConfig,
  themeDesigns,
  themeNames,
  themes,
} from "../packages/domain/src/index.ts";
import { guestContent } from "../packages/domain/src/guest.ts";

test("tablet hero photo survives guest projection and renders independent responsive crop", () => {
  const config = createDemo();
  config.media = ["desktop", "tablet", "mobile"].map((id) =>
    mediaSchema.parse({
      id,
      src: `/media/${id}.webp`,
      width: 1200,
      height: 800,
      tabletFocalX: 25,
      tabletFocalY: 75,
    }),
  );
  config.hero.mediaId = "desktop";
  config.hero.tabletMediaId = "tablet";
  config.hero.mobileMediaId = "mobile";
  const guest = guestContent(parseSiteConfig(config), config.defaultVariant);
  assert.deepEqual(
    guest.media.map((photo) => photo.id),
    ["desktop", "tablet", "mobile"],
  );
  const html = renderToStaticMarkup(
    createElement(Invitation, { config: guest }),
  );
  assert.match(
    html,
    /media="\(min-width: 48em\) and \(max-width: 63.99em\)" srcSet="\/media\/tablet.webp"/,
  );
  assert.match(html, /--tablet-focal:25% 75%/);
  config.hero.tabletMediaId = "unknown-photo";
  assert.throws(() => parseSiteConfig(config), /tabletMediaId/);
});
test("render descriptions, contacts and optional-map reception for every theme", () => {
  for (const theme of themeNames) {
    const config = {
      ...createDemo(),
      theme,
      design: themeDesigns[theme],
      appearance: themes[theme].appearance,
    };
    config.venues[1].description = "Widoczny opis przyjęcia";
    const html = renderToStaticMarkup(createElement(Invitation, { config }));
    assert.match(html, /Widoczny opis przyjęcia/);
    assert.match(html, /Parking dla gości/);
    assert.match(html, /tel:\+48000000000/);
    assert.doesNotMatch(html, /<iframe/);
    assert.ok(html.includes(`data-theme="${theme}"`));
  }
});
test("decorations and section icons can be disabled independently", () => {
  const config = createDemo();
  config.appearance = { icons: false, decorations: "none" };
  const html = renderToStaticMarkup(createElement(Invitation, { config }));
  assert.doesNotMatch(html, /<svg/);
  assert.match(html, /Plan naszego dnia/);
});
test("builds a complete tonal scale from a custom accent", () => {
  const palette = createAccentPalette("#123456");
  assert.equal(palette.length, 10);
  assert.equal(palette[6], "#123456");
  assert.notEqual(palette[0], palette[9]);
  assert.equal(
    palette.every((color) => /^#[0-9a-f]{6}$/i.test(color)),
    true,
  );
});
test("React escapes user text and does not render excluded variant sections", () => {
  const config = createDemo();
  config.identity.displayName = "<script>alert(1)</script>";
  config.variants.push({
    ...config.variants[0],
    id: "limited",
    slug: "limited",
    label: "Limited",
    eventIds: ["ceremony"],
    sectionIds: ["timeline", "ceremony", "parking", "contact"],
  });
  const html = renderToStaticMarkup(
    createElement(Invitation, { config, variantId: "limited" }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /Przykładowe miejsce przyjęcia/);
});
