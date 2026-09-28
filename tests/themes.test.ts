import { test } from "node:test";
import assert from "node:assert/strict";
import {
  themes,
  themeNames,
  parseSiteConfig,
  invitationLocales,
} from "../packages/domain/src/index.ts";
import {
  createTemplate,
  templateIds,
  templateCatalog,
} from "../packages/domain/src/templates.ts";

test("all localized starters use their intended theme and preview palette", () => {
  const expected = [
    "classic",
    "evening",
    "botanical",
    "celebration",
    "editorial",
    "classic",
    "botanical",
    "celebration",
    "celebration",
    "editorial",
    "editorial",
  ];
  for (const locale of invitationLocales) {
    templateIds.forEach((id, i) => {
      const config = createTemplate(id, "test", locale);
      assert.equal(config.theme, expected[i]);
      const preview = templateCatalog(locale).find((t) => t.id === id)!.style;
      assert.deepEqual(config.design, preview.design);
      assert.deepEqual(config.appearance, preview.appearance);
      assert.equal(config.hero.layout, preview.layout);
    });
  }
});
test("every theme accepts existing content without changing its section order or variants", () => {
  const config = createTemplate("wedding-reception", "test");
  for (const theme of themeNames) {
    const changed = parseSiteConfig({
      ...config,
      theme,
      design: themes[theme].design,
      appearance: themes[theme].appearance,
    });
    assert.deepEqual(changed.sections, config.sections);
    assert.deepEqual(changed.variants, config.variants);
    assert.deepEqual(changed.identity, config.identity);
  }
  assert.throws(() => parseSiteConfig({ ...config, theme: "ivory" }));
  assert.throws(() =>
    parseSiteConfig({
      ...config,
      appearance: { icons: true, decorations: "invalid" },
    }),
  );
});
