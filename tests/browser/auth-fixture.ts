import type { Page } from "@playwright/test";
import { createEmailVerificationToken } from "better-auth/api";

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
