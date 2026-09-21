import { test } from "node:test";
import assert from "node:assert/strict";
import {
  siteConfigSchema,
  parseSiteConfig,
} from "../packages/domain/src/index.ts";
import { createDemo } from "../packages/domain/src/demo.ts";
import { importLegacy } from "../packages/domain/src/legacy.ts";

test("two independent configurations use the same schema", () => {
  const first = createDemo(),
    second = createDemo("demo-sage");
  assert.notDeepEqual(first.couple, second.couple);
  assert.notEqual(first.theme, second.theme);
  assert.equal(parseSiteConfig(first).schemaVersion, 1);
  assert.equal(parseSiteConfig(second).schemaVersion, 1);
});
test("reject malformed JSON shape and dangerous URLs with field names", () => {
  assert.throws(() => parseSiteConfig(null));
  const config = createDemo();
  config.events[0].url = "javascript:alert(1)";
  assert.throws(() => parseSiteConfig(config), /events.0.url/);
  config.events[0].url = "https://user:password@example.com";
  assert.equal(siteConfigSchema.safeParse(config).success, false);
});
test("reject cross references, duplicate IDs and duplicate route slugs", () => {
  const config = createDemo();
  config.sections[1].venueId = "missing";
  assert.throws(() => parseSiteConfig(config), /venueId/);
  config.sections[1].venueId = "ceremony";
  config.variants[1].slug = config.variants[0].slug;
  assert.throws(() => parseSiteConfig(config), /slug/);
  config.variants[1].slug = "obiad";
  config.events.push(config.events[0]);
  assert.throws(() => parseSiteConfig(config), /Powtórzony/);
});
test("reject invalid date and time, normalize telephone", () => {
  const config = createDemo();
  config.events[0].date = "2027-02-30";
  assert.throws(() => parseSiteConfig(config), /date/);
  config.events[0].date = "2028-02-29";
  config.events[0].time = "25:00";
  assert.throws(() => parseSiteConfig(config), /time/);
  config.events[0].time = "00:00";
  config.contacts[0].phone = "+48 (123) 456-789";
  assert.equal(parseSiteConfig(config).contacts[0].phone, "+48123456789");
});
test("only allow trusted Google embeds; reject paths escaping media directory", () => {
  const config = createDemo();
  config.venues[0].mapUrl = "https://www.google.com.evil.example/maps/embed";
  assert.throws(() => parseSiteConfig(config), /mapUrl/);
  config.venues[0].mapUrl = "https://www.google.com/maps/embed?pb=test";
  assert.doesNotThrow(() => parseSiteConfig(config));
  config.media = [
    {
      id: "photo",
      src: "/media/../secret.webp",
      width: 10,
      height: 10,
      alt: "",
      focalX: 50,
      focalY: 50,
      mobileFocalX: 50,
      mobileFocalY: 50,
      variants: [],
    },
  ];
  assert.throws(() => parseSiteConfig(config), /media.0.src/);
});
test("optional maps and descriptions do not disable sections", () => {
  const config = createDemo();
  config.venues[1].mapUrl = "";
  config.venues[1].description = "";
  const parsed = parseSiteConfig(config);
  assert.equal(parsed.sections.find((s) => s.id === "party")!.enabled, true);
});
test("legacy import rejects null and numeric text fields without logging values", () => {
  for (const value of ["null", '{"venueName":123}', "{broken"])
    assert.throws(
      () =>
        importLegacy(
          { VITE_CONFIG_COMMON: value },
          { firstName: "Test", secondName: "Test" },
        ),
      /VITE_CONFIG_COMMON/,
    );
});
test("legacy import preserves descriptions and all variants without hardcoded identity", () => {
  const config = importLegacy(
    {
      VITE_CONFIG_COMMON: JSON.stringify({
        description: "Opis ceremonii",
        weddingDate: "Test",
        phone: "+48000000000",
      }),
      VITE_CONFIG_SLUB: JSON.stringify({ description: "Opis przyjęcia" }),
      VITE_CONFIG_PARKING: JSON.stringify({ description: "Opis parkingu" }),
    },
    { firstName: "Nowa", secondName: "Para" },
  );
  assert.equal(config.couple.firstName, "Nowa");
  assert.deepEqual(
    config.variants.map((v) => v.slug),
    ["slub", "obiad", "grill"],
  );
  assert.equal(
    config.venues.find((v) => v.id === "reception")!.description,
    "Opis przyjęcia",
  );
  assert.equal(
    config.venues.find((v) => v.id === "parking")!.description,
    "Opis parkingu",
  );
});
test("unknown fields cannot smuggle executable configuration", () => {
  assert.equal(
    siteConfigSchema.safeParse({ ...createDemo(), script: "alert(1)" }).success,
    false,
  );
});
