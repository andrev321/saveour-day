import { test, expect } from "@playwright/test";
import { createDemo } from "../../packages/domain/src/demo";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";
test("autosave preserves edits made during a request and undo restores the previous edit", async ({
  page,
}) => {
  const id = "20000000-0000-4000-8000-000000000001",
    config = createDemo();
  config.id = id;
  let stored = structuredClone(config),
    revision = 1,
    requests = 0,
    release: () => void = () => {};
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.addInitScript(() =>
    localStorage.setItem("wedding-panel-language", "pl"),
  );
  await page.route(`**/api/sites/${id}`, async (route) => {
    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON();
      requests++;
      if (requests === 1) await blocked;
      expect(body.revision).toBe(revision);
      stored = body.config;
      revision++;
      return route.fulfill({ json: { revision } });
    }
    return route.fulfill({
      json: {
        site: { id, name: "Test", published_release_id: null },
        draft: { config: stored, revision },
        publishedConfig: null,
        releases: [],
        snapshots: [],
        media: [],
        urls: {},
      },
    });
  });
  await page.goto(`${admin}/sites/${id}`);
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  const heading = page.getByLabel("Główny napis", { exact: true });
  await heading.fill("First edit");
  await expect.poll(() => requests).toBe(1);
  await heading.fill("Second edit");
  release();
  await expect.poll(() => stored.identity.displayName).toBe("Second edit");
  await expect(heading).toHaveValue("Second edit");
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  await expect(heading).toHaveValue("First edit");
  await page.getByRole("button", { name: "Ponów", exact: true }).click();
  await expect(heading).toHaveValue("Second edit");
});
test("guest questions are localized and dirty refresh requires confirmation", async ({
  page,
}) => {
  const config = createDemo();
  config.locale = "en-GB";
  config.events = config.events.slice(0, 1);
  const guest = "40000000-0000-4000-8000-000000000001";
  let details = {};
  let reads = 0;
  await page.route("**/api/guest/i/questions", async (route) => {
    if (route.request().method() === "POST") {
      details = route.request().postDataJSON().payload.details;
      return route.fulfill({ json: { revision: 1 } });
    }
    reads++;
    return route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        config,
        questions: { diet: true, lodging: true, transport: true },
        invitation: {
          label: "Family",
          guests: [{ id: guest, name: "Maria" }],
          revision: 0,
          note: "",
          answers: [],
          details,
        },
      },
    });
  });
  await page.goto("/i/questions");
  await expect(page.getByLabel("Diet or allergies (optional)")).toBeVisible();
  const readsBeforeEdit = reads;
  await page.getByLabel("Diet or allergies (optional)").fill("Vegan");
  await page
    .getByRole("button", { name: "Refresh responses", exact: true })
    .click();
  await expect(
    page.getByText(
      "Refreshing will replace unsaved changes with responses from the server.",
    ),
  ).toBeVisible();
  expect(reads).toBe(readsBeforeEdit);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Diet or allergies (optional)")).toHaveValue(
    "Vegan",
  );
  await page
    .getByRole("group", { name: "Maria" })
    .getByRole("combobox")
    .first()
    .selectOption("true");
  await page
    .getByRole("button", { name: "Save responses", exact: true })
    .click();
  expect(details).toEqual({ [guest]: { diet: "Vegan" } });
  await expect(page.getByRole("status")).toContainText("saved");
});
