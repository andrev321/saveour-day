import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mapEmbedUrl,
  navigationUrl,
  siteConfigSchema,
  parseSiteConfig,
  themeDesigns,
} from "../packages/domain/src/index.ts";
import {
  createDemo,
  isUnmodifiedTemplate,
} from "../packages/domain/src/demo.ts";

test("two independent configurations use the same schema", () => {
  const first = createDemo(),
    second = createDemo("demo-botanical");
  assert.notDeepEqual(first.identity, second.identity);
  assert.notEqual(first.theme, second.theme);
  assert.equal(parseSiteConfig(first).schemaVersion, 3);
  assert.equal(parseSiteConfig(second).schemaVersion, 3);
});
test("provides localized initial templates and detects a customized template", () => {
  const polish = createDemo("client", "pl-PL");
  const english = createDemo("client", "en-GB");
  const german = createDemo("client", "de-DE");

  assert.equal(polish.identity.displayName, "Anna & Jan");
  assert.equal(english.identity.displayName, "Emma & Liam");
  assert.equal(german.identity.displayName, "Lena & Jonas");
  assert.equal(german.venues[0].address, "Adresse ergänzen");
  assert.equal(isUnmodifiedTemplate(english), true);
  assert.equal(
    isUnmodifiedTemplate({
      ...english,
      hero: { ...english.hero, title: "A custom title" },
    }),
    false,
  );
});
test("accepts custom color tokens and supplies a preset for older configurations", () => {
  const legacy = structuredClone(createDemo("demo-botanical")) as Record<
    string,
    unknown
  >;
  delete legacy.design;
  assert.deepEqual(parseSiteConfig(legacy).design, themeDesigns.botanical);

  const config = createDemo();
  const custom = { ...config, design: { ...config.design, accent: "#123456" } };
  assert.equal(parseSiteConfig(custom).design.accent, "#123456");
  assert.throws(
    () =>
      parseSiteConfig({
        ...config,
        design: { ...config.design, accent: "blue" },
      }),
    /design.accent/,
  );
  assert.throws(
    () =>
      parseSiteConfig({
        ...config,
        design: { ...config.design, ink: "#faf7f1" },
      }),
    /design.ink/,
  );
});
test("reject malformed JSON shape and dangerous URLs with field names", () => {
  assert.throws(() => parseSiteConfig(null));
  const config = createDemo();
  config.events[0].url = "javascript:alert(1)";
  assert.throws(() => parseSiteConfig(config), /events.0.url/);
  config.events[0].url = "https://user:password@example.com";
  assert.equal(siteConfigSchema.safeParse(config).success, false);
});
test("incomplete URLs produce field errors instead of throwing while editing", () => {
  for (const value of ["d", "https:", "https://", "https://[", "example.com"]) {
    const config = createDemo();
    config.events[0].url = value;
    const result = siteConfigSchema.safeParse(config);
    assert.equal(result.success, false, `event: ${value}`);
    if (!result.success) {
      assert.ok(
        result.error.issues.some(
          (issue) =>
            JSON.stringify(issue.path) === JSON.stringify(["events", 0, "url"]),
        ),
      );
    }
  }
  const config = createDemo();
  config.events[0].url = "https://example.com/event";
  assert.equal(siteConfigSchema.safeParse(config).success, true);
  config.events[0].url = "";
  assert.equal(siteConfigSchema.safeParse(config).success, true);
});

test("reject cross references, duplicate IDs and duplicate route slugs", () => {
  const config = createDemo();
  (
    config.sections[1] as Extract<
      (typeof config.sections)[number],
      { type: "venue" }
    >
  ).venueId = "missing";
  assert.throws(() => parseSiteConfig(config), /venueId/);
  (
    config.sections[1] as Extract<
      (typeof config.sections)[number],
      { type: "venue" }
    >
  ).venueId = "ceremony";
  config.variants.push({
    ...config.variants[0],
    id: "additional",
    slug: "additional",
  });
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
test("every variant has independent explicit references", () => {
  const config = createDemo();
  config.variants[0].eventIds = ["party"];
  config.variants.push({
    ...structuredClone(config.variants[0]),
    id: "limited",
    slug: "limited",
    eventIds: ["ceremony"],
  });
  const parsed = parseSiteConfig(config);
  assert.deepEqual(parsed.variants[0].eventIds, ["party"]);
  assert.deepEqual(parsed.variants[1].eventIds, ["ceremony"]);
  config.variants[1].eventIds = ["missing"];
  assert.throws(() => parseSiteConfig(config), /eventIds/);
  config.variants[1].eventIds = ["ceremony", "ceremony"];
  assert.throws(() => parseSiteConfig(config), /Powt/);
});
test("derives navigation and embed URLs from venue text and showMap", () => {
  const venue = {
    id: "ceremony",
    name: "Dwór Oliwski",
    address: "ul. Bytowska 4, Gdańsk",
    description: "",
    showMap: true,
  };
  assert.equal(
    navigationUrl(venue),
    "https://www.google.com/maps/search/?api=1&query=Dw%C3%B3r%20Oliwski%2C%20ul.%20Bytowska%204%2C%20Gda%C5%84sk",
  );
  assert.equal(
    mapEmbedUrl(venue),
    "https://www.google.com/maps?q=Dw%C3%B3r%20Oliwski%2C%20ul.%20Bytowska%204%2C%20Gda%C5%84sk&output=embed",
  );
  assert.equal(mapEmbedUrl({ ...venue, showMap: false }), null);
  assert.equal(mapEmbedUrl({ ...venue, address: "   " }), null);
});
test("reject paths escaping media directory and legacy venue URL fields", () => {
  const config = createDemo();
  const withLegacyUrl = structuredClone(config) as Record<string, unknown>;
  (withLegacyUrl.venues as Record<string, unknown>[])[0].mapUrl =
    "https://www.google.com/maps/embed?pb=test";
  assert.throws(() => parseSiteConfig(withLegacyUrl));
  config.media = [
    {
      id: "photo",
      src: "/media/../secret.webp",
      width: 10,
      height: 10,
      alt: "",

      variants: [],
    },
  ];
  assert.throws(() => parseSiteConfig(config), /media.0.src/);
});
test("optional maps and descriptions do not disable sections", () => {
  const config = createDemo();
  config.venues[1].showMap = false;
  config.venues[1].description = "";
  const parsed = parseSiteConfig(config);
  assert.equal(
    parsed.variants[0].sections.find((p) => p.sectionId === "party")!.visible,
    true,
  );
});
test("unknown fields cannot smuggle executable configuration", () => {
  assert.equal(
    siteConfigSchema.safeParse({ ...createDemo(), script: "alert(1)" }).success,
    false,
  );
});
test("public site and invitation URL helpers format routes and classify UUID vs legacy slug keys", async () => {
  const {
    publicSitePath,
    publicSiteUrl,
    invitationTokenPath,
    invitationTokenUrl,
    isSiteUuidKey,
  } = await import("../packages/domain/src/index.ts");
  const siteId = "20000000-0000-4000-8000-000000000001";
  assert.equal(publicSitePath(siteId), `/s/${siteId}`);
  assert.equal(
    publicSiteUrl(siteId, "https://invite.example.com"),
    `https://invite.example.com/s/${siteId}`,
  );
  assert.equal(invitationTokenPath("tok-123"), "/i/tok-123");
  assert.equal(
    invitationTokenUrl("tok-123", "https://invite.example.com/"),
    "https://invite.example.com/i/tok-123",
  );
  assert.equal(isSiteUuidKey(siteId), true);
  assert.equal(isSiteUuidKey(`anna-i-jan-${siteId}`), false);
});
