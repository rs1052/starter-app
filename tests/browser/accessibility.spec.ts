import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of [
  "/",
  "/sign-up",
  "/sign-in",
  "/forgot-password",
  "/reset-password",
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
  await page.getByLabel("Email").fill(`axe-${Date.now()}@example.com`);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
