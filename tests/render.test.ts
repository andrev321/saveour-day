import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createAccentPalette,
  Invitation,
} from "../packages/renderer/src/index.tsx";
import { createDemo } from "../packages/domain/src/demo.ts";
import { themeDesigns } from "../packages/domain/src/index.ts";
test("render descriptions, contacts and optional-map reception for every theme", () => {
  for (const theme of ["ivory", "sage", "wine"] as const) {
    const config = { ...createDemo(), theme, design: themeDesigns[theme] };
    config.venues[1].description = "Widoczny opis przyjęcia";
    const html = renderToStaticMarkup(createElement(Invitation, { config }));
    assert.match(html, /Widoczny opis przyjęcia/);
    assert.match(html, /Parking dla gości/);
    assert.match(html, /tel:\+48000000000/);
    assert.doesNotMatch(html, /<iframe/);
  }
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
  config.couple.firstName = "<script>alert(1)</script>";
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
