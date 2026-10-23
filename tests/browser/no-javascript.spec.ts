import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("ordinary example form works without JavaScript", async ({ page }) => {
  await page.goto("/examples");
  await page.getByRole("button", { name: "Refresh from server" }).click();
  await expect(page).toHaveURL(/\/examples\?updated=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Small browser interactions",
  );
  await expect(page.getByText("The server refresh completed.")).toBeVisible();
  await page.getByText("Toggle details", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("This state stays entirely in the browser."),
  ).toBeVisible();
});

test("authentication forms preserve errors without JavaScript", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("no-javascript@example.com");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  const invalid = page.waitForResponse(
    (response) =>
      response.url().endsWith("/sign-in") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await invalid).status()).toBe(400);
  await expect(page.getByRole("alert")).toHaveText(
    "The credentials could not be accepted.",
  );
  await expect(page.getByLabel("Email")).toHaveValue(
    "no-javascript@example.com",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
});
