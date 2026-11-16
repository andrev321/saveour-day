import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";
import { guestContent } from "../../packages/domain/src/guest";

test.use({ locale: "pl-PL" });

// Browser contract tests use a deterministic HTTP fixture. SQL authorization is
// covered separately in guest-database.test.ts; SMTP is a staging acceptance step.
test("code gate hides content, then a family submits and corrects RSVP", async ({
  page,
}) => {
  const config = createDemo();
  config.variants.push({
    ...config.variants[0],
    id: "limited",
    slug: "limited",
    eventIds: ["ceremony"],
    sections: config.variants[0].sections.map((p) => ({
      ...p,
      visible: p.sectionId !== "party",
    })),
  });
  const visible = guestContent(config, "limited");
  let authorized = false,
    revision = 0,
    note = "";
  let answers: { guest_id: string; event_id: string; attending: boolean }[] =
    [];
  let conflict = false;
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "language", { value: "pl-PL" }),
  );
  await page.route("**/api/guest/i/test-token", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: authorized
          ? {
              authorized,
              mode: "code",
              config: visible,
              invitation: {
                label: "Rodzina Kowalskich",
                guests: [
                  { id: "40000000-0000-4000-8000-000000000001", name: "Maria" },
                  { id: "40000000-0000-4000-8000-000000000002", name: "Adam" },
                ],
                revision,
                note,
                answers,
              },
              deadline: "2030-06-01T18:00:00Z",
              closed: false,
            }
          : { authorized, mode: "code" },
      });
    const body = route.request().postDataJSON();
    if (body.action === "code") {
      if (body.payload.code !== "family-2026")
        return route.fulfill({
          status: 401,
          json: { error: "Nieprawidłowy kod dostępu" },
        });
      authorized = true;
      return route.fulfill({ json: { ok: true } });
    }
    expect(body.action).toBe("rsvp");
    if (!authorized)
      return route.fulfill({ status: 401, json: { error: "Dostęp wygasł" } });
    expect(
      body.payload.answers.every(
        (a: { eventId: string }) => a.eventId === "ceremony",
      ),
    ).toBe(true);
    if (conflict)
      return route.fulfill({
        status: 409,
        json: {
          error: "Odpowiedź zmieniła się w innej sesji. Odśwież stronę.",
        },
      });
    expect(body.payload.revision).toBe(revision);
    answers = body.payload.answers.map(
      (a: { guestId: string; eventId: string; attending: boolean }) => ({
        guest_id: a.guestId,
        event_id: a.eventId,
        attending: a.attending,
      }),
    );
    note = body.payload.note;
    revision++;
    return route.fulfill({ json: { revision } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/i/test-token");
  await expect(page.getByLabel("Kod dostępu")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Kod dostępu").fill("wrong-code");
  await page.getByRole("button", { name: "Otwórz zaproszenie" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Nieprawidłowy kod",
  );
  await page.getByLabel("Kod dostępu").fill("family-2026");
  await page.getByRole("button", { name: "Otwórz zaproszenie" }).click();
  await expect(
    page.getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Przykładowe miejsce przyjęcia", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("group", { name: "Maria" })
    .getByRole("combobox")
    .selectOption("true");
  await page
    .getByRole("group", { name: "Adam" })
    .getByRole("combobox")
    .selectOption("false");
  await page.getByLabel("Uwagi").fill("Dziękujemy!");
  await page.getByRole("button", { name: "Zapisz odpowiedzi" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Odpowiedzi zostały zapisane",
  );
  expect(answers.map((a) => a.attending)).toEqual([true, false]);
  await page.screenshot({
    path: "test-results/guest-rsvp-mobile.png",
    fullPage: true,
  });
  conflict = true;
  await page.getByRole("button", { name: "Zapisz odpowiedzi" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "innej sesji" }),
  ).toContainText("innej sesji");
  await page.getByRole("button", { name: "Odśwież odpowiedzi" }).click();
  await expect(page.getByLabel("Uwagi")).toHaveValue("Dziękujemy!");
  authorized = false;
  await page.getByRole("button", { name: "Zapisz odpowiedzi" }).click();
  await expect(page.getByLabel("Kod dostępu")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toHaveCount(0);
});

test("public site supports guest lookup, collision disambiguation, and info-only mode", async ({
  page,
}) => {
  const demo = createDemo();
  demo.identity.displayName = "Anna & Jan";
  demo.hero.title = "Anna & Jan";
  demo.events = [{ id: "ceremony", title: "Ceremonia", date: "2027-07-01" }];
  demo.variants[0].eventIds = ["ceremony"];
  const config = guestContent(demo, demo.defaultVariant);
  let matched = false;
  await page.route("**/api/guest/s/wedding", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        json: {
          authorized: true,
          mode: "public",
          rsvpEnabled: true,
          allowSelfRegistration: false,
          canResetLookup: matched,
          config,
          invitation: matched
            ? {
                label: "Rodzina Kowalskich",
                guests: [{ id: "g1", name: "Anna Kowalska" }],
                allowPlusOne: false,
                plusOne: null,
                revision: 0,
                note: "",
                answers: [],
              }
            : null,
        },
      });
    }
    const body = route.request().postDataJSON();
    if (body.action === "lookup" && !body.payload.disambiguator) {
      return route.fulfill({ json: { status: "ambiguous" } });
    }
    matched = true;
    return route.fulfill({ json: { status: "matched" } });
  });
  await page.goto("/s/wedding");
  await page
    .getByLabel("Wpisz imię i nazwisko lub kod zaproszenia")
    .fill("Anna Kowalska");
  await page.getByRole("button", { name: "Szukaj zaproszenia" }).click();
  await page
    .getByLabel("Kod zaproszenia lub imię drugiej osoby")
    .fill("KOW123");
  await page.getByRole("button", { name: "Potwierdź" }).click();
  await expect(page.getByText("Anna Kowalska")).toBeVisible();
});

test("public site hides RSVP in info-only mode and supports self-registration after not_found", async ({
  page,
}) => {
  const demo = createDemo();
  demo.identity.displayName = "Anna & Jan";
  demo.hero.title = "Anna & Jan";
  demo.events = [{ id: "ceremony", title: "Ceremonia", date: "2027-07-01" }];
  demo.variants[0].eventIds = ["ceremony"];
  const config = guestContent(demo, demo.defaultVariant);

  await page.route("**/api/guest/s/info-only", (route) =>
    route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        rsvpEnabled: false,
        config,
      },
    }),
  );
  await page.goto("/s/info-only");
  await expect(
    page.getByRole("heading", { name: "Anna & Jan", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByLabel("Wpisz imię i nazwisko lub kod zaproszenia"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Zapisz odpowiedzi" }),
  ).toHaveCount(0);

  let registered = false;
  await page.route("**/api/guest/s/self-reg", async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        json: {
          authorized: true,
          mode: "public",
          rsvpEnabled: true,
          allowSelfRegistration: true,
          config,
          invitation: registered
            ? {
                label: "Piotr Zieliński",
                guests: [{ id: "g-self", name: "Piotr Zieliński" }],
                revision: 0,
                note: "",
                answers: [
                  {
                    guest_id: "g-self",
                    event_id: "ceremony",
                    attending: true,
                  },
                ],
              }
            : null,
        },
      });
    }
    const body = route.request().postDataJSON();
    if (body.action === "lookup") {
      return route.fulfill({ json: { status: "not_found" } });
    }
    if (body.action === "self-register") {
      expect(body.payload.name).toBe("Piotr Zieliński");
      registered = true;
      return route.fulfill({ json: { status: "registered" } });
    }
    return route.fulfill({ json: { saved: true } });
  });

  await page.goto("/s/self-reg");
  await page
    .getByLabel("Wpisz imię i nazwisko lub kod zaproszenia")
    .fill("Piotr Zieliński");
  await page.getByRole("button", { name: "Szukaj zaproszenia" }).click();
  await expect(
    page.getByText("Nie znaleźliśmy zaproszenia dla podanych danych."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Nie ma mnie na liście — wypełnij zgłoszenie" })
    .click();
  await expect(page.getByLabel("Twoje imię i nazwisko")).toHaveValue(
    "Piotr Zieliński",
  );
  await page.getByRole("radio", { name: "Tak", exact: true }).check();
  await page.getByRole("button", { name: "Wyślij zgłoszenie" }).click();
  await expect(page.getByTestId("saved-summary")).toBeVisible();
});

test("expired invitations show a recoverable message without content", async ({
  page,
}) => {
  await page.route("**/api/guest/i/expired", (route) =>
    route.fulfill({
      status: 404,
      json: { error: "Zaproszenie jest niedostępne" },
    }),
  );
  await page.goto("/i/expired");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Zaproszenie jest niedostępne",
  );
  await expect(
    page.getByRole("button", { name: "Zapisz odpowiedzi" }),
  ).toHaveCount(0);
});
