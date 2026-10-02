import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createApp } from "../app.js";
import type { AuthRateLimiter } from "../app-types.js";
import { createAuth } from "../auth/create-auth.js";
import * as schema from "../db/schema.js";
import {
  createResendEmailSender,
  type SendEmail,
} from "../email/send-email.js";
import { parseRuntimeConfig } from "./config.js";

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const databasePath = resolve(process.env.DATABASE_PATH ?? "data/app.db");
mkdirSync(dirname(databasePath), { recursive: true });

const client = new Database(databasePath);
client.pragma("journal_mode = WAL");
const database = drizzle(client, { schema });
const config = parseRuntimeConfig(
  process.env,
  process.env.NODE_ENV === "production",
);
const sendEmail = createEmailSender();
const auth = createAuth(database, {
  baseURL: config.authURL,
  production: config.production,
  scheduleTask: (promise) => {
    void promise.catch((error: unknown) =>
      console.error("Background task failed.", error),
    );
  },
  secret: config.secret,
  sendEmail,
  trustedOrigins: config.trustedOrigins,
});
const authRateLimiter = createMemoryRateLimiter(5, 60);

export const app = createApp({
  assets: config.production
    ? { css: "/assets/app.css", script: "/assets/app.js" }
    : { css: "/resources/css/app.css", script: "/resources/js/app.ts" },
  auth,
  authRateLimiter,
  healthCheck: async () => {
    client.prepare("select 1").get();
  },
});

function createMemoryRateLimiter(
  maximum: number,
  windowSeconds: number,
): AuthRateLimiter {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  return async (key) => {
    const now = Date.now();
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return { allowed: true };
    }
    if (current.count >= maximum) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }
    current.count += 1;
    return { allowed: true };
  };
}

function createEmailSender(): SendEmail {
  if (config.resendApiKey && config.emailFrom) {
    return createResendEmailSender({
      apiKey: config.resendApiKey,
      from: config.emailFrom,
    });
  }

  return async ({ subject, text }) => {
    console.info(`[Development email] ${subject}\n${text}`);
  };
}
