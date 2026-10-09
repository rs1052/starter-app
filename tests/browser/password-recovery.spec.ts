import { expect, test } from "@playwright/test";
import Database from "better-sqlite3";
import { verifyBrowserEmail } from "./auth-fixture.js";

test("a user can reset a forgotten password", async ({ page }) => {
  const email = `reset-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Reset User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("old-password-value");
  await page.getByRole("button", { name: "Create account" }).click();
  await verifyBrowserEmail(page, email);

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Reset link requested",
  );

  const database = new Database("data/test-browser.db", { readonly: true });
  database.pragma("foreign_keys = ON");
  const result = database
    .prepare(
      "select identifier from verification where identifier like 'reset-password:%' order by created_at desc limit 1",
    )
    .get() as { identifier: string } | undefined;
  database.close();
  const token = result?.identifier.replace("reset-password:", "");
  expect(token).toBeTruthy();

  await page.goto(
    `/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent("/reset-password")}`,
  );
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-password-value");
  await page.getByLabel("Confirm new password").fill("new-password-value");
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your password has been reset",
  );

  await page.locator("main").getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("new-password-value");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
});
