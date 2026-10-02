import { expect, test } from "@playwright/test";

test("a user can create an account, access it, and sign out", async ({
  page,
}) => {
  const email = `browser-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Browser User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in$/);
});
