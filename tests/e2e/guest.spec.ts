import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";
import { guestContent } from "../../packages/domain/src/guest";

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
    hiddenEventIds: ["party"],
    hiddenSectionIds: ["party"],
  });
  const visible = guestContent(config, "limited");
  let authorized = false,
    revision = 0,
    note = "";
  let answers: { guest_id: string; event_id: string; attending: boolean }[] =
    [];
  let conflict = false;
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
  await expect(page.getByRole("status")).toContainText("Nieprawidłowy kod");
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
  await expect(page.getByRole("status")).toContainText("innej sesji");
  await page.getByRole("button", { name: "Odśwież odpowiedzi" }).click();
  await expect(page.getByLabel("Uwagi")).toHaveValue("Dziękujemy!");
  authorized = false;
  await page.getByRole("button", { name: "Zapisz odpowiedzi" }).click();
  await expect(page.getByLabel("Kod dostępu")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Anna & Jan", exact: true }),
  ).toHaveCount(0);
});

test("email gate requests OTP and displays only returned household links", async ({
  page,
}) => {
  await page.route("**/api/guest/s/wedding", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { authorized: false, mode: "email" } });
    const body = route.request().postDataJSON();
    expect(body.payload.email).toBe("family@example.com");
    return route.fulfill({
      json:
        body.action === "otp-send"
          ? {
              ok: true,
              message: "Jeżeli adres ma dostęp, otrzyma kod logowania.",
            }
          : {
              ok: true,
              links: [
                {
                  href: "/v/30000000-0000-4000-8000-000000000001",
                  label: "Rodzina",
                },
              ],
            },
    });
  });
  await page.goto("/s/wedding");
  await page.getByLabel("Adres e-mail").fill("family@example.com");
  await page.getByRole("button", { name: "Wyślij kod", exact: true }).click();
  await page.getByLabel("Kod z wiadomości e-mail").fill("123456");
  await page.getByRole("button", { name: "Potwierdź dostęp" }).click();
  await expect(page.getByRole("link", { name: "Rodzina" })).toHaveAttribute(
    "href",
    "/v/30000000-0000-4000-8000-000000000001",
  );
  await expect(page.getByLabel("Adres e-mail")).toHaveCount(0);
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
  await expect(page.getByRole("status")).toHaveText(
    "Zaproszenie jest niedostępne",
  );
  await expect(
    page.getByRole("button", { name: "Zapisz odpowiedzi" }),
  ).toHaveCount(0);
});
