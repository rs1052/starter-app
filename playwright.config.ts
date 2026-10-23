import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  // Local D1 is one SQLite file; parallel workers can collide and return 500s.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "vp dev --host 127.0.0.1 --port 4173 --strictPort",
    env: {
      LOCAL_D1_STATE: "data/browser-d1",
      BETTER_AUTH_SECRET: "browser-test-secret-at-least-32-characters",
      BETTER_AUTH_URL: "http://127.0.0.1:4173",
      TRUSTED_ORIGINS: "http://127.0.0.1:4173",
      EMAIL_FROM: "",
    },
    url: "http://127.0.0.1:4173/health",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
