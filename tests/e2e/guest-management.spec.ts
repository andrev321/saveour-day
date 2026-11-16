import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";
test("organizer creates family links, edits recipients and changes access settings", async ({
  page,
}) => {
  const id = "20000000-0000-4000-8000-000000000001";
  const config = createDemo();
  config.id = id;
  const site = {
    id,
    name: "Wesele",
    access_mode: "public",
    public_variant_id: config.defaultVariant,
    access_version: 1,
    rsvp_deadline: null,
    published_release_id: "release",
  };
  const invitations: {
    id: string;
    label: string;
    variant_id: string;
    emails: string[];
    guests: { id: string; name: string }[];
    revoked: boolean;
    version: number;
    rsvp_revision: number;
    note: string;
    events: { id: string; title: string }[];
  }[] = [];
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.route(`**/api/sites/${id}`, (route) =>
    route.fulfill({
      json: {
        site,
        draft: { config, revision: 1 },
        releases: [],
        media: [],
        urls: {},
      },
    }),
  );
  await page.route(`**/api/sites/${id}/guests`, async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          site,
          invitations,
          variants: config.variants,
          answers: [],
          url: "https://example.test/s/wesele",
        },
      });
    const { action, payload } = route.request().postDataJSON();
    if (action === "create") {
      expect(payload.names).toEqual(["Maria", "Adam"]);
      invitations.push({
        id: "30000000-0000-4000-8000-000000000001",
        label: payload.label,
        variant_id: payload.variantId,
        emails: payload.emails,
        guests: payload.names.map((name: string, n: number) => ({
          id: `guest-${n}`,
          name,
        })),
        revoked: false,
        version: 1,
        rsvp_revision: 0,
        note: "",
        events: config.events,
      });
      return route.fulfill({
        json: { url: "https://example.test/i/family-token" },
      });
    }
    if (action === "update") {
      invitations[0].label = payload.label;
      invitations[0].guests = payload.guests.map(
        (g: { id?: string; name: string }, n: number) => ({
          id: g.id || `guest-${n}`,
          name: g.name,
        }),
      );
      invitations[0].version++;
    }
    if (action === "settings") {
      expect(payload.version).toBe(1);
      site.access_mode = payload.mode;
      site.access_version++;
    }
    if (action === "revoke") invitations[0].revoked = true;
    return route.fulfill({ json: { saved: true } });
  });
  await page.goto(
    `${process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000"}/sites/${id}`,
  );
  await page.getByRole("tab", { name: "Goście", exact: true }).click();
  await page.getByRole("button", { name: "Nowe zaproszenie", exact: true }).click();
  await page.getByLabel("Nazwa osoby lub rodziny").fill("Rodzina Kowalskich");
  await page
    .getByLabel("Goście — każda osoba w osobnym wierszu")
    .fill("Maria\nAdam");
  await page.getByRole("button", { name: "Utwórz zaproszenie i link" }).click();
  await expect(page.getByLabel("Wygenerowany link")).toHaveValue(
    "https://example.test/i/family-token",
  );
  await expect(
    page.getByRole("heading", { name: "Rodzina Kowalskich" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edytuj zaproszenie", exact: true })
    .click();
  await page
    .getByLabel("Nazwa osoby lub rodziny")
    .fill("Rodzina Kowalskich (edycja)");
  await page
    .getByRole("button", { name: "Zapisz zaproszenie", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rodzina Kowalskich (edycja)" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Publikacja i dostęp", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Dostęp do całej realizacji" })
    .click();
  await page
    .getByRole("option", { name: "Wspólny kod dostępu", exact: true })
    .click();
  await page.getByRole("button", { name: "Zapisz ustawienia dostępu" }).click();
  await expect(
    page.getByRole("combobox", { name: "Dostęp do całej realizacji" }),
  ).toHaveValue("Wspólny kod dostępu");
  await page.screenshot({
    path: "test-results/guest-management.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Cofnij dostęp", exact: true })
    .click();
  await page.getByRole("button", { name: "Potwierdź", exact: true }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Goście" })
      .getByText("Cofnięte", { exact: true }),
  ).toBeVisible();
});

test("organizer adds a guest member and enables plus-one in invitation editor", async ({
  page,
}) => {
  const id = "20000000-0000-4000-8000-000000000002";
  const config = createDemo();
  config.id = id;
  const site = {
    id,
    name: "Wesele",
    access_mode: "public",
    public_variant_id: config.defaultVariant,
    access_version: 1,
    rsvp_deadline: null,
    published_release_id: "release",
  };
  const invitation = {
    id: "30000000-0000-4000-8000-000000000002",
    label: "Jan Nowak",
    variant_id: config.defaultVariant,
    emails: [] as string[],
    guests: [{ id: "guest-1", name: "Jan Nowak" }],
    allow_plus_one: false,
    revoked: false,
    version: 1,
    rsvp_revision: 0,
    note: "",
    events: config.events,
  };
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.route(`**/api/sites/${id}`, (route) =>
    route.fulfill({
      json: {
        site,
        draft: { config, revision: 1 },
        releases: [],
        media: [],
        urls: {},
      },
    }),
  );
  await page.route(`**/api/sites/${id}/guests`, async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        json: {
          site,
          invitations: [invitation],
          variants: config.variants,
          answers: [],
          url: "https://example.test/s/wesele",
        },
      });
    }
    const { action, payload } = route.request().postDataJSON();
    if (action === "update") {
      expect(payload.allowPlusOne).toBe(true);
      expect(payload.guests).toHaveLength(2);
      invitation.allow_plus_one = payload.allowPlusOne;
      invitation.guests = payload.guests.map(
        (g: { id?: string; name: string }, n: number) => ({
          id: g.id || `guest-${n + 1}`,
          name: g.name,
        }),
      );
      invitation.version++;
    }
    return route.fulfill({ json: { saved: true } });
  });
  await page.goto(
    `${process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000"}/sites/${id}`,
  );
  await page.getByRole("tab", { name: "Goście", exact: true }).click();
  await page
    .getByRole("button", { name: "Edytuj zaproszenie", exact: true })
    .click();
  await page.getByRole("button", { name: "Dodaj osobę", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Gość 2", exact: true })
    .fill("Ewa Nowak");
  await page
    .getByRole("switch", { name: "Pozwól na osobę towarzyszącą (+1)" })
    .click();
  await page
    .getByRole("button", { name: "Zapisz zaproszenie", exact: true })
    .click();
  await expect(page.getByText("Ewa Nowak")).toBeVisible();
});
