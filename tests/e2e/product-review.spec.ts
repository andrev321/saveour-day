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
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Cofnij", exact: true }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await expect(heading).toHaveValue("First edit");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ponów", exact: true }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await expect(heading).toHaveValue("Second edit");
});
test("guest questions are localized and dirty refresh requires confirmation", async ({
  page,
}) => {
  const config = createDemo();
  config.locale = "en-GB";
  config.events = config.events.slice(0, 1);
  const guest = "40000000-0000-4000-8000-000000000001";
  const questionId = "50000000-0000-4000-8000-000000000001";
  let questionAnswers: {
    questionId: string;
    guestId: string | null;
    value: { text: string };
  }[] = [];
  let reads = 0;
  await page.route("**/api/guest/i/questions", async (route) => {
    if (route.request().method() === "POST") {
      questionAnswers = route.request().postDataJSON().payload.questionAnswers;
      return route.fulfill({ json: { revision: 1 } });
    }
    reads++;
    return route.fulfill({
      json: {
        authorized: true,
        mode: "public",
        config,
        questions: [
          {
            id: questionId,
            position: 0,
            scope: "guest",
            type: "text",
            label: "Diet or allergies",
            help: "",
            required: false,
            allowOther: false,
            options: [],
            variantIds: [],
            presetKey: "diet",
          },
        ],
        invitation: {
          groupName: "Family",
          guests: [{ id: guest, kind: "named", name: "Maria" }],
          revision: 0,
          note: "",
          answers: [],
          questionAnswers,
        },
      },
    });
  });
  await page.goto("/i/questions");
  await page
    .getByRole("group", { name: "Maria" })
    .getByRole("radio", { name: "Attending", exact: true })
    .check();
  await expect(page.getByLabel("Diet or allergies")).toBeVisible();
  const readsBeforeEdit = reads;
  await page.getByLabel("Diet or allergies").fill("Vegan");
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
  await expect(page.getByLabel("Diet or allergies")).toHaveValue("Vegan");
  await page
    .getByRole("button", { name: "Save responses", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("saved");
  expect(questionAnswers).toEqual([
    { questionId, guestId: guest, value: { text: "Vegan" } },
  ]);
});
