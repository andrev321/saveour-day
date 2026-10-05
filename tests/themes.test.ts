import { test } from "node:test";
import assert from "node:assert/strict";
import {
  themes,
  themeNames,
  parseSiteConfig,
  invitationLocales,
  themePalettes,
  applyTheme,
  applyThemePalette,
  matchingThemePalette,
  contrastRatio,
  textOnColor,
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

test("all twenty palettes have readable text on both surfaces and accent bands", () => {
  assert.equal(themeNames.flatMap((theme) => themePalettes[theme]).length, 20);
  for (const theme of themeNames) {
    assert.equal(new Set(themePalettes[theme].map((p) => p.id)).size, 4);
    for (const { design } of themePalettes[theme]) {
      for (const background of [design.paper, design.surface]) {
        assert.ok(contrastRatio(design.ink, background) >= 4.5);
        assert.ok(contrastRatio(design.accent, background) >= 4.5);
      }
      assert.ok(
        contrastRatio(textOnColor(design.accent), design.accent) >= 4.5,
      );
    }
  }
});

test("every occasion and locale survives changing designs and palettes, including JSON roundtrip", () => {
  for (const locale of invitationLocales) {
    for (const id of templateIds) {
      const original = createTemplate(id, "test", locale);
      for (const theme of themeNames) {
        const themed = applyTheme(original, theme);
        for (const palette of themePalettes[theme]) {
          const changed = applyThemePalette(themed, palette.id);
          const saved = parseSiteConfig(JSON.parse(JSON.stringify(changed)));
          assert.deepEqual(saved, changed);
          assert.deepEqual(changed, { ...themed, design: palette.design });
          assert.deepEqual(changed.identity, original.identity);
          assert.deepEqual(changed.sections, original.sections);
          assert.deepEqual(changed.events, original.events);
          assert.deepEqual(changed.variants, original.variants);
          assert.equal(
            matchingThemePalette(theme, saved.design)?.id,
            palette.id,
          );
        }
      }
    }
  }
});

test("custom colors survive reopening and reselecting the active design", () => {
  const config = createTemplate("birthday", "test");
  config.design = {
    paper: "#ffffff",
    surface: "#eeeeee",
    ink: "#181818",
    accent: "#404040",
  };
  assert.equal(matchingThemePalette(config.theme, config.design), undefined);
  assert.equal(applyTheme(config, config.theme), config);
  assert.deepEqual(
    parseSiteConfig(JSON.parse(JSON.stringify(config))).design,
    config.design,
  );
  assert.throws(() => applyThemePalette(config, "missing"));
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
