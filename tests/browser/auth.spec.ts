import { expect, test } from "@playwright/test";
import { verifyBrowserEmail } from "./auth-fixture.js";

test("a user can create an account, access it, and sign out", async ({
  page,
}) => {
  const email = `browser-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Browser User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Check your email",
  );
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "The credentials could not be accepted.",
  );
  await verifyBrowserEmail(page, email);
  await expect(page.getByRole("status")).toContainText(
    "Your email is verified",
  );
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Account" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Sign in" }),
  ).toHaveCount(0);

  await page.getByLabel("Current password").fill("incorrect-password");
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-browser-password");
  await page.getByLabel("Confirm new password").fill("new-browser-password");
  const invalid = page.waitForResponse(
    (response) =>
      response.url().endsWith("/account/password") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Change password" }).click();
  expect((await invalid).status()).toBe(400);
  await expect(page.getByRole("alert")).toContainText(
    "Check your current password",
  );

  await page
    .getByLabel("Current password")
    .fill("correct-horse-battery-staple");
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-browser-password");
  await page.getByLabel("Confirm new password").fill("new-browser-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your password has been changed",
  );

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Account" }),
  ).toHaveCount(0);
});
