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
  applyTheme,
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
    }),
  );
  config.hero.crops = { tablet: { x: 25, y: 75 } };
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
test("renders responsive variant srcSet on device sources, tighter gallery sizes, and LQIP blur placeholder", () => {
  const config = createDemo();
  const blurDataUrl =
    "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=";
  config.media = [
    mediaSchema.parse({
      id: "hero-desktop",
      src: "/media/hero-desktop/1920.webp",
      width: 1920,
      height: 1280,
      variants: [
        { src: "/media/hero-desktop/320.webp", width: 320 },
        { src: "/media/hero-desktop/640.webp", width: 640 },
        { src: "/media/hero-desktop/1920.webp", width: 1920 },
      ],
      blurDataUrl,
    }),
    mediaSchema.parse({
      id: "hero-mobile",
      src: "/media/hero-mobile/1280.webp",
      width: 1280,
      height: 1600,
      variants: [
        { src: "/media/hero-mobile/320.webp", width: 320 },
        { src: "/media/hero-mobile/640.webp", width: 640 },
        { src: "/media/hero-mobile/1280.webp", width: 1280 },
      ],
    }),
  ];
  config.hero.mediaId = "hero-desktop";
  config.hero.mobileMediaId = "hero-mobile";
  config.sections.push({
    id: "gallery-1",
    type: "gallery",
    title: "Galeria",
    body: "",
    mediaIds: ["hero-desktop"],
    crops: {},
  });
  config.variants[0].sections.push({ sectionId: "gallery-1", visible: true });
  const html = renderToStaticMarkup(createElement(Invitation, { config }));
  assert.match(
    html,
    /media="\(max-width: 47.99em\)" srcSet="\/media\/hero-mobile\/320\.webp 320w, \/media\/hero-mobile\/640\.webp 640w, \/media\/hero-mobile\/1280\.webp 1280w" sizes="100vw"/,
  );
  assert.match(
    html,
    /sizes="\(max-width: 30em\) 100vw, \(max-width: 64em\) 50vw, 480px"/,
  );
  assert.match(html, /decoding="async"/);
  assert.ok(html.includes(`--blur:url(${blurDataUrl})`));
  assert.ok(html.includes("--mobile-blur:none"));
  assert.doesNotMatch(html, /<picture[^>]*><span/);

  config.hero.layout = "overlay";
  const overlayHtml = renderToStaticMarkup(
    createElement(Invitation, { config }),
  );
  assert.match(overlayHtml, /sizes="100vw"/);
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
    assert.equal(html.match(/<iframe\b/g)?.length ?? 0, 1);
    assert.doesNotMatch(html, /Pokaż mapę/);
    assert.ok(html.includes(`data-theme="${theme}"`));
  }
});
test("venue map renders immediately when showMap is enabled and hides when disabled", () => {
  const config = createDemo();
  config.venues[0].showMap = true;
  config.venues[0].address = "ul. Przykładowa 1, Warszawa";
  config.venues[1].showMap = false;
  config.venues[1].address = "ul. Druga 2, Warszawa";
  const withMapHtml = renderToStaticMarkup(
    createElement(Invitation, { config }),
  );
  assert.doesNotMatch(withMapHtml, /Pokaż mapę/);
  assert.match(withMapHtml, /<iframe[^>]*data-ui="invitation-map"/);
  assert.match(withMapHtml, /output=embed/);
  assert.equal(withMapHtml.match(/<iframe\b/g)?.length ?? 0, 1);

  config.venues[0].showMap = false;
  const withoutMapHtml = renderToStaticMarkup(
    createElement(Invitation, { config }),
  );
  assert.doesNotMatch(withoutMapHtml, /Pokaż mapę/);
  assert.doesNotMatch(withoutMapHtml, /<iframe\b/);
  assert.match(withoutMapHtml, /maps\/search\/\?api=1&amp;query=/);
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
    sections: ["timeline", "ceremony", "parking", "contact"].map(
      (sectionId) => ({ sectionId, visible: true }),
    ),
  });
  const html = renderToStaticMarkup(
    createElement(Invitation, { config, variantId: "limited" }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /Przykładowe miejsce przyjęcia/);
});
test("renders subtle admin promo link in footer when createHref is provided", () => {
  const config = createDemo();
  const withoutPromo = renderToStaticMarkup(
    createElement(Invitation, { config }),
  );
  assert.doesNotMatch(withoutPromo, /invitation-footer-promo/);

  const withPromo = renderToStaticMarkup(
    createElement(Invitation, {
      config,
      createHref: "https://admin.saveour.day",
    }),
  );
  assert.match(withPromo, /data-ui="invitation-footer-promo"/);
  assert.match(
    withPromo,
    /href="https:\/\/admin\.saveour\.day"[^>]*>Stwórz swoje zaproszenie<\/a>/,
  );

  const emptyFooterConfig = {
    ...createDemo(),
    copy: { ...config.copy, footer: "" },
  };
  const emptyFooterHtml = renderToStaticMarkup(
    createElement(Invitation, {
      config: emptyFooterConfig,
      createHref: "https://admin.saveour.day",
    }),
  );
  assert.match(emptyFooterHtml, /Stwórz swoje zaproszenie/);

  const enConfig = { ...createDemo("demo", "en-GB") };
  const enHtml = renderToStaticMarkup(
    createElement(Invitation, {
      config: enConfig,
      createHref: "https://admin.saveour.day",
    }),
  );
  assert.match(enHtml, /Create your invitation/);

  const focusedFooterHtml = renderToStaticMarkup(
    createElement(Invitation, {
      config: emptyFooterConfig,
      focusSection: "footer",
      createHref: "https://admin.saveour.day",
    }),
  );
  assert.doesNotMatch(focusedFooterHtml, /invitation-footer-promo/);
});

test("formats phone numbers for display while preserving raw tel and sms hrefs", () => {
  const config = createDemo();
  config.contacts[0].phone = "+48501234567";
  const html = renderToStaticMarkup(createElement(Invitation, { config }));
  assert.match(html, /href="tel:\+48501234567"[^>]*>\+48 501 234 567<\/a>/);
  assert.match(html, /href="sms:\+48501234567"/);
});

test("marks only trailing unpaired venue sections with data-span=full", () => {
  const sectionTag = (html: string, id: string) => {
    const match = html.match(
      new RegExp(`<section[^>]*id="section-${id}"[^>]*>`),
    );
    assert.ok(match, `Expected section-${id} in rendered markup`);
    return match[0];
  };

  const config = createDemo();
  const threeVenuesHtml = renderToStaticMarkup(
    createElement(Invitation, { config }),
  );
  assert.doesNotMatch(
    sectionTag(threeVenuesHtml, "ceremony"),
    /data-span="full"/,
  );
  assert.doesNotMatch(sectionTag(threeVenuesHtml, "party"), /data-span="full"/);
  assert.match(sectionTag(threeVenuesHtml, "parking"), /data-span="full"/);

  config.variants[0].sections = config.variants[0].sections.map((entry) =>
    entry.sectionId === "parking" ? { ...entry, visible: false } : entry,
  );
  const pairedVenuesHtml = renderToStaticMarkup(
    createElement(Invitation, { config }),
  );
  assert.doesNotMatch(pairedVenuesHtml, /data-span="full"/);
});

test("renders editorial bracketed indices and gallery data-count with zero svgs when disabled", () => {
  const config = applyTheme(createDemo(), "editorial");
  config.appearance = { icons: false, decorations: "none" };
  config.media = ["photo-1", "photo-2", "photo-3"].map((id) =>
    mediaSchema.parse({
      id,
      src: `/media/${id}.webp`,
      width: 1200,
      height: 800,
    }),
  );
  config.sections.push({
    id: "gallery-1",
    type: "gallery",
    title: "Galeria",
    body: "",
    mediaIds: ["photo-1", "photo-2", "photo-3"],
    crops: {},
  });
  config.variants[0].sections.push({ sectionId: "gallery-1", visible: true });

  const html = renderToStaticMarkup(createElement(Invitation, { config }));
  assert.match(html, />\[01\]<\/span>/);
  assert.doesNotMatch(html, />01 \/<\/span>/);
  assert.match(html, /data-count="3"/);
  assert.match(html, /data-ui="reading-progress"/);
  assert.doesNotMatch(html, /<svg/);
});
