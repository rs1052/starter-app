import { expect, test } from "@playwright/test";

test("navigation, examples, and assets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Build server-rendered",
  );
  await expect(page.locator(".header-inner")).toHaveCSS("display", "flex");

  await page.goto("/examples");
  await page.getByRole("button", { name: "Refresh from server" }).click();
  await expect(
    page.getByText("The server rendered a fresh fragment."),
  ).toBeVisible();
  const disclosure = page.getByText(
    "This state stays entirely in the browser.",
  );
  await expect(disclosure).toBeHidden();
  await page.getByText("Toggle details", { exact: true }).click();
  await expect(disclosure).toBeVisible();
});
