import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { vi } from "vitest";
import { createApp } from "../../src/app.js";
import type { AuthRateLimiter } from "../../src/app-types.js";
import { createAuth, type Auth } from "../../src/auth/create-auth.js";
import * as schema from "../../src/db/schema.js";
import type { EmailMessage } from "../../src/email/send-email.js";

export const origin = "http://localhost";

export interface AppFixture {
  app: ReturnType<typeof createApp>;
  auth: Auth;
  client: Database.Database;
  info: ReturnType<typeof vi.spyOn>;
  messages: EmailMessage[];
}

export function createAppFixture(
  overrides: {
    authRateLimiter?: AuthRateLimiter;
    healthCheck?: () => Promise<void>;
  } = {},
): AppFixture {
  const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
  const client = new Database(":memory:");
  migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const database = drizzle(client, { schema });
  const messages: EmailMessage[] = [];
  const auth = createAuth(database, {
    baseURL: origin,
    production: false,
    scheduleTask: (promise) => void promise,
    secret: "unit-test-secret-that-is-at-least-32-characters",
    sendEmail: async (message) => void messages.push(message),
    trustedOrigins: [origin],
  });
  const app = createApp({
    assets: { css: "/assets/app.css", script: "/assets/app.js" },
    auth,
    authRateLimiter:
      overrides.authRateLimiter ?? (async () => ({ allowed: true })),
    healthCheck: overrides.healthCheck ?? (async () => undefined),
  });
  return { app, auth, client, info, messages };
}

export function closeAppFixture(fixture: AppFixture) {
  fixture.client.close();
  vi.restoreAllMocks();
}

export function formRequest(
  app: AppFixture["app"],
  path: string,
  values: Record<string, string>,
) {
  return app.request(path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin },
    body: new URLSearchParams(values),
  });
}
