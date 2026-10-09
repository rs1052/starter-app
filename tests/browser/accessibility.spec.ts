import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { verifyBrowserEmail } from "./auth-fixture.js";

for (const path of [
  "/",
  "/sign-up",
  "/sign-in",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/examples",
]) {
  test(`@a11y ${path} has no detectable violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("@a11y authenticated account has no detectable violations", async ({
  page,
}) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Accessible User");
  const email = `axe-${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await verifyBrowserEmail(page, email);
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
