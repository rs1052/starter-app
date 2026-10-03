import { expect, test } from "@playwright/test";

test.use({ javaScriptEnabled: false });

test("ordinary example form works without JavaScript", async ({ page }) => {
  await page.goto("/examples");
  await page.getByRole("button", { name: "Refresh from server" }).click();
  await expect(page).toHaveURL(/\/examples\?updated=1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Small browser interactions",
  );
  await expect(
    page.getByText("The server rendered a fresh fragment."),
  ).toBeVisible();
});
