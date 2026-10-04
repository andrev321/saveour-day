import { test, expect } from "@playwright/test";
import sharp from "sharp";
import type { SiteConfig } from "../../packages/domain/src/index";
// Dedicated staging account session; no credentials or token contents are logged.
test("real draft, storage, publication, access code, RSVP and calendar", async ({
  page,
  context,
}) => {
  const admin = process.env.STAGING_ADMIN_URL!,
    site = process.env.STAGING_SITE_URL!;
  const request = context.request;
  const created = await request.post(`${admin}/api/sites`, {
    data: {
      name: `Smoke ${Date.now()}`,
      templateId: "wedding",
      locale: "en-GB",
    },
  });
  expect(created.ok()).toBeTruthy();
  const { id } = await created.json();
  try {
    const endpoint = `${admin}/api/sites/${id}`;
    const loaded = await request.get(endpoint);
    expect(loaded.ok()).toBeTruthy();
    const data = await loaded.json();
    const config: SiteConfig = data.draft.config;
    config.identity.displayName = "Staging smoke";
    config.events.forEach((e) => {
      e.date = "2027-06-12";
      e.time = "15:30";
    });
    const image = await sharp({
      create: { width: 640, height: 400, channels: 3, background: "#c9b9a7" },
    })
      .jpeg()
      .toBuffer();
    const uploaded = await request.post(`${endpoint}/media`, {
      headers: { "content-type": "image/jpeg" },
      data: image,
    });
    expect(uploaded.ok()).toBeTruthy();
    const asset = await uploaded.json();
    config.media.push(asset);
    const patch = await request.patch(endpoint, {
      data: { revision: data.draft.revision, config },
    });
    expect(patch.ok()).toBeTruthy();
    const { revision } = await patch.json();
    const publication = await request.post(endpoint, {
      data: { action: "publish", payload: { revision } },
    });
    expect(publication.ok()).toBeTruthy();
    const settings = await request.post(`${endpoint}/guests`, {
      data: {
        action: "settings",
        payload: {
          mode: "code",
          code: "staging-smoke-only",
          variant: config.defaultVariant,
          deadline: null,
          version: data.site.access_version,
        },
      },
    });
    expect(settings.ok()).toBeTruthy();
    const invitation = await request.post(`${endpoint}/guests`, {
      data: {
        action: "create",
        payload: {
          label: "Smoke family",
          variantId: config.defaultVariant,
          names: ["Smoke guest"],
          emails: [],
        },
      },
    });
    expect(invitation.ok()).toBeTruthy();
    const { url } = await invitation.json();
    const family = new URL(url);
    family.host = new URL(site).host;
    // Guest receives a fresh context: organizer credentials cannot grant guest access.
    const guestContext = await context.browser()!.newContext();
    const guest = await guestContext.newPage();
    try {
      await guest.goto(family.href);
      await guest.getByLabel("Access code").fill("staging-smoke-only");
      await guest
        .getByRole("button", { name: "Open invitation", exact: true })
        .click();
      await expect(
        guest.getByRole("heading", { name: "Staging smoke", exact: true }),
      ).toBeVisible();
      for (const select of await guest
        .getByRole("group", { name: "Smoke guest" })
        .getByRole("combobox")
        .all())
        await select.selectOption("true");
      await guest
        .getByRole("button", { name: "Save responses", exact: true })
        .click();
      await expect(guest.getByRole("status")).toContainText("saved");
      const key = family.pathname.split("/").at(-1)!;
      const calendar = await guestContext.request.get(
        `${site}/api/guest/i/${key}/calendar`,
      );
      expect(calendar.ok()).toBeTruthy();
      expect(await calendar.text()).toContain("BEGIN:VEVENT");
      const result = await request.get(`${endpoint}/guests`);
      expect((await result.json()).answers.length).toBeGreaterThan(0);
      await page.goto(`${admin}/sites/${id}`);
      await expect(
        page.getByRole("tab", { name: /Guests|Goście/ }),
      ).toBeVisible();
    } finally {
      await guestContext.close();
    }
  } finally {
    const cleanup = await request.delete(`${admin}/api/sites/${id}`);
    expect(cleanup.ok()).toBeTruthy();
  }
});
