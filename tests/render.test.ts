import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Invitation } from "../packages/renderer/src/index.tsx";
import { createDemo } from "../packages/domain/src/demo.ts";
test("render descriptions, contacts and optional-map reception for every theme", () => {
  for (const theme of ["ivory", "sage", "wine"] as const) {
    const config = createDemo();
    config.theme = theme;
    config.venues[1].description = "Widoczny opis przyjęcia";
    const html = renderToStaticMarkup(
      createElement(Invitation, { config, variantId: "obiad" }),
    );
    assert.match(html, /Widoczny opis przyjęcia/);
    assert.match(html, /Parking dla gości/);
    assert.match(html, /tel:\+48000000000/);
    assert.doesNotMatch(html, /<iframe/);
  }
});
test("React escapes user text and does not render excluded variant sections", () => {
  const config = createDemo();
  config.couple.firstName = "<script>alert(1)</script>";
  const html = renderToStaticMarkup(
    createElement(Invitation, { config, variantId: "slub" }),
  );
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /Przykładowe miejsce przyjęcia/);
});
