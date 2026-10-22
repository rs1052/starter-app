import { expect, test } from "@playwright/test";

test("Vue SSR, hydration, navigation history, and form errors", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "warning" ||
      (message.type() === "error" &&
        !message.location().url.endsWith("/favicon.ico"))
    )
      errors.push(message.text());
  });
  const response = await page.goto("/");
  expect(await response!.text()).toContain("Build server-rendered");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Examples" })
    .click();
  await expect(page).toHaveURL(/\/examples$/);
  // SSR is immediately actionable. Wait for Vue before testing its enhanced
  // refresh rather than accidentally exercising the ordinary form fallback.
  await page.waitForFunction(() =>
    Boolean(
      (
        document.getElementById("app") as
          (HTMLElement & { __vue_app__?: unknown }) | null
      )?.__vue_app__,
    ),
  );
  await page.getByRole("button", { name: "Refresh from server" }).click();
  await expect(page.locator("#server-status")).toContainText("fresh fragment");
  await expect(page).toHaveURL(/\/examples$/);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Build server-rendered",
  );
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Small browser interactions",
  );
  await page.getByText("Toggle details", { exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("This state stays entirely in the browser."),
  ).toBeVisible();
  const invalid = await request.post("/sign-in", {
    headers: { Origin: "http://127.0.0.1:4173" },
    form: { email: "", password: "" },
  });
  expect(invalid.status()).toBe(400);
  expect(await invalid.text()).toContain("Check each field and try again.");
  expect(invalid.headers()["content-security-policy"]).toContain(
    "script-src 'self'",
  );
  expect(invalid.headers()["cache-control"]).toBe("no-store");
  expect(errors).toEqual([]);
});

test("preserves input typed before hydration", async ({ page }) => {
  await page.route(/void-pages-client/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });
  await page.goto("/forgot-password");
  expect(
    await page.evaluate(() =>
      Boolean(
        (
          document.getElementById("app") as
            (HTMLElement & { __vue_app__?: unknown }) | null
        )?.__vue_app__,
      ),
    ),
  ).toBe(false);
  await page.getByLabel("Email").fill("typed@example.com");
  await page.waitForFunction(() =>
    Boolean(
      (
        document.getElementById("app") as
          (HTMLElement & { __vue_app__?: unknown }) | null
      )?.__vue_app__,
    ),
  );
  await expect(page.getByLabel("Email")).toHaveValue("typed@example.com");
});
