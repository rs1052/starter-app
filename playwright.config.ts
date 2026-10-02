import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "DATABASE_PATH=data/test-browser.db BETTER_AUTH_SECRET=browser-test-secret-at-least-32-characters BETTER_AUTH_URL=http://127.0.0.1:4173 TRUSTED_ORIGINS=http://127.0.0.1:4173 pnpm dev --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173/health",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
