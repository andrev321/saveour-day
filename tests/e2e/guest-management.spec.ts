import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";

test("organizer creates group links, edits recipients and changes access settings", async ({
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
    group_name: string | null;
    variant_id: string;
    guests: { id: string; kind: "named" | "companion"; name: string | null }[];
    revoked: boolean;
    version: number;
    rsvp_revision: number;
    note: string;
    short_code: string;
    origin: "organizer";
    review_status: "approved";
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
          questions: [],
          questionAnswers: [],
          locale: "pl-PL",
          displayName: "Wesele",
          url: "https://example.test/s/wesele",
        },
      });
    const { action, payload } = route.request().postDataJSON();
    if (action === "create") {
      expect(payload.guests.map((g: { name: string }) => g.name)).toEqual([
        "Maria",
        "Adam",
      ]);
      invitations.push({
        id: "30000000-0000-4000-8000-000000000001",
        group_name: payload.groupName ?? null,
        variant_id: payload.variantId,
        guests: payload.guests.map(
          (
            g: { kind: "named" | "companion"; name: string | null },
            n: number,
          ) => ({
            id: `guest-${n}`,
            kind: g.kind,
            name: g.name,
          }),
        ),
        revoked: false,
        version: 1,
        rsvp_revision: 0,
        note: "",
        short_code: "KOW123",
        origin: "organizer",
        review_status: "approved",
        events: config.events,
      });
      return route.fulfill({
        json: {
          url: "https://example.test/i/family-token",
          shortCode: "KOW123",
        },
      });
    }
    if (action === "update") {
      invitations[0]!.group_name = payload.groupName ?? null;
      invitations[0]!.guests = payload.guests.map(
        (
          g: { id?: string; kind: "named" | "companion"; name: string | null },
          n: number,
        ) => ({
          id: g.id || `guest-${n}`,
          kind: g.kind,
          name: g.name,
        }),
      );
      invitations[0]!.version++;
    }
    if (action === "settings") {
      expect(payload.version).toBe(1);
      site.access_mode = payload.mode;
      site.access_version++;
    }
    if (action === "revoke") invitations[0]!.revoked = true;
    return route.fulfill({ json: { saved: true } });
  });
  await page.goto(
    `${process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000"}/sites/${id}`,
  );
  await page.getByRole("tab", { name: "Goście", exact: true }).click();
  await page
    .getByRole("button", { name: "Nowe zaproszenie", exact: true })
    .click();
  await page.getByText("Grupa", { exact: true }).click();
  await page.getByLabel("Nazwa grupy (opcjonalnie)").fill("Rodzina Kowalskich");
  await page.getByLabel("Osoba 1").fill("Maria");
  await page
    .getByRole("button", { name: "+ Dodaj osobę", exact: true })
    .click();
  await page.getByLabel("Osoba 2").fill("Adam");
  await page.getByRole("button", { name: "Utwórz zaproszenie i link" }).click();
  const shareDialog = page.getByRole("dialog", {
    name: "Zaproszenie utworzone",
  });
  await expect(shareDialog).toBeVisible();
  await expect(
    shareDialog.getByText("https://example.test/i/family-token"),
  ).toBeVisible();
  await expect(shareDialog.getByText("Rodzina Kowalskich")).toBeVisible();
  await shareDialog
    .getByRole("button", { name: "Zamknij", exact: true })
    .last()
    .click();
  await expect(shareDialog).not.toBeVisible();
  await expect(page.getByText("Rodzina Kowalskich")).toBeVisible();

  await page.getByRole("button", { name: "Akcje", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Edytuj zaproszenie", exact: true })
    .click();
  await page
    .getByLabel("Nazwa grupy (opcjonalnie)")
    .fill("Rodzina Kowalskich (edycja)");
  await page
    .getByRole("button", { name: "Zapisz zaproszenie", exact: true })
    .click();
  await expect(page.getByText("Rodzina Kowalskich (edycja)")).toBeVisible();

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

  await page.getByRole("button", { name: "Akcje", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Cofnij dostęp", exact: true })
    .click();
  await page.getByRole("button", { name: "Potwierdź", exact: true }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Goście" })
      .getByText("Cofnięte", { exact: true }),
  ).toBeVisible();
});

test("organizer adds a companion slot in invitation editor", async ({
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
    group_name: null as string | null,
    variant_id: config.defaultVariant,
    guests: [{ id: "guest-1", kind: "named" as const, name: "Jan Nowak" }] as {
      id: string;
      kind: "named" | "companion";
      name: string | null;
    }[],
    revoked: false,
    version: 1,
    rsvp_revision: 0,
    note: "",
    short_code: "NOW456",
    origin: "organizer" as const,
    review_status: "approved" as const,
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
          questions: [],
          questionAnswers: [],
          locale: "pl-PL",
          displayName: "Wesele",
          url: "https://example.test/s/wesele",
        },
      });
    }
    const { action, payload } = route.request().postDataJSON();
    if (action === "update") {
      expect(payload.guests).toHaveLength(2);
      expect(payload.guests[1].kind).toBe("companion");
      invitation.guests = payload.guests.map(
        (
          g: { id?: string; kind: "named" | "companion"; name: string | null },
          n: number,
        ) => ({
          id: g.id || `guest-${n + 1}`,
          kind: g.kind,
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
  await page.getByRole("button", { name: "Akcje", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Edytuj zaproszenie", exact: true })
    .click();
  await page.getByLabel("Może przyjść z osobą towarzyszącą").check();
  await page
    .getByRole("button", { name: "Zapisz zaproszenie", exact: true })
    .click();
  await expect(page.getByText("Jan Nowak + 1")).toBeVisible();
});
