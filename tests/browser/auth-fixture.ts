import type { Page } from "@playwright/test";
import { createEmailVerificationToken } from "better-auth/api";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// Exercise the real verification endpoint without delivering email in browser tests.
export async function verifyBrowserEmail(page: Page, email: string) {
  const token = await createEmailVerificationToken(
    "browser-test-secret-at-least-32-characters",
    email,
  );
  await page.goto(
    `/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent("/sign-in?verified=1")}`,
  );
}

export function browserD1Query(sql: string) {
  const require = createRequire(import.meta.url);
  const cli = join(
    dirname(require.resolve("wrangler/package.json")),
    "wrangler-dist/cli.js",
  );
  const output = execFileSync(
    process.execPath,
    [
      cli,
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/ssr/wrangler.json",
      "--persist-to",
      "data/browser-d1",
      "--command",
      sql,
      "--json",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );
  return JSON.parse(output) as Array<{
    results: Array<{ identifier: string }>;
  }>;
}
