import { test, expect } from "@playwright/test";
const admin = process.env.E2E_ADMIN_URL || "http://127.0.0.1:3000";

test("templates reset only on confirmation, blank starts empty and saved draft can be restored", async ({
  page,
}) => {
  await page.goto(`${admin}/demo`);
  await page
    .getByRole("button", { name: "Otwórz gotowy przykład", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  const heading = page.getByLabel("Główny napis", { exact: true });
  await expect(heading).toHaveValue("Anna & Jan");
  await heading.fill("Niezapisane zmiany");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("combobox", { name: "Szablon startowy", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Zmień szablon startowy" }).click();
  await expect(
    page.getByRole("button", { name: "Zastąp konfigurację" }),
  ).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Szablon startowy", exact: true })
    .click();
  await page.getByRole("option", { name: "Urodziny", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Niezapisane zmiany zostaną utracone",
  );
  await page.getByRole("button", { name: "Anuluj", exact: true }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await expect(heading).toHaveValue("Niezapisane zmiany");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Zmień szablon startowy" }).click();
  await page
    .getByRole("combobox", { name: "Szablon startowy", exact: true })
    .click();
  await page.getByRole("option", { name: "Urodziny", exact: true }).click();
  await page.getByRole("button", { name: "Zastąp konfigurację" }).click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Zofia", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await expect(heading).toHaveValue("Zofia");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ustawienia", exact: true }).click();
  await page.getByRole("button", { name: "Kopie szkicu", exact: true }).click();
  await page.getByRole("combobox", { name: "Kopia zapisanego szkicu" }).click();
  await page.getByRole("option", { name: /Rewizja 1/ }).click();
  await page.getByRole("button", { name: "Przywróć kopię szkicu" }).click();
  await page.getByRole("button", { name: "Zastąp konfigurację" }).click();
  await page.getByRole("tab", { name: "Treść", exact: true }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await expect(heading).toHaveValue("Anna & Jan");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Ustawienia", exact: true }).click();
  await page.getByRole("button", { name: "Zmień szablon startowy" }).click();
  await page
    .getByRole("combobox", { name: "Szablon startowy", exact: true })
    .click();
  await page
    .getByRole("option", { name: "Puste zaproszenie", exact: true })
    .click();
  await page.getByRole("button", { name: "Zastąp konfigurację" }).click();
  await expect(
    page.frameLocator("iframe").getByText("Anna", { exact: false }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Treść", exact: true }).click();
  await page
    .getByRole("button", { name: "Początek zaproszenia", exact: true })
    .click();
  await expect(heading).toHaveValue("");
  await heading.fill("Spotkanie zespołu");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Zapisz szkic", exact: true }).click();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("heading", { name: "Spotkanie zespołu", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/templates-editor.png",
    fullPage: true,
  });
});

for (const [label, heading] of [
  ["Urodziny", "Zofia"],
  ["Puste zaproszenie", ""],
]) {
  test(`a clean project requires choosing ${label} before opening the editor`, async ({
    page,
  }) => {
    await page.goto(`${admin}/demo`);
    await page
      .getByRole("button", { name: "Utwórz zaproszenie", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Wybierz szablon na początek" }),
    ).toBeVisible();
    await expect(page.getByLabel("Główny napis", { exact: true })).toHaveCount(
      0,
    );
    await page.getByLabel("Nazwa nowego zaproszenia").fill("Nowy projekt");
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Utwórz zaproszenie", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("combobox", { name: "Szablon startowy", exact: true })
      .click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Utwórz zaproszenie", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Początek zaproszenia", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Nowy projekt", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Główny napis", { exact: true })).toHaveValue(
      heading,
    );
    await expect(
      page.getByRole("combobox", { name: "Szablon startowy", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Wybierz szablon na początek" }),
    ).toHaveCount(0);
  });
}
