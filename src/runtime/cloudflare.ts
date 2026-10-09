import { drizzle } from "drizzle-orm/d1";
import { createApp } from "../app.js";
import { createAuth } from "../auth/create-auth.js";
import * as schema from "../db/schema.js";
import type { SendEmail as EmailSender } from "../email/send-email.js";
import { parseRuntimeConfig } from "./config.js";

interface Bindings {
  AUTH_RATE_LIMITER: RateLimit;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DB: D1Database;
  EMAIL: SendEmail;
  EMAIL_FROM: string;
  TRUSTED_ORIGINS?: string;
}

export function createCloudflareEmailSender(
  binding: SendEmail,
  from: string,
): EmailSender {
  if (!binding || typeof binding.send !== "function") {
    throw new Error("EMAIL binding is required in production");
  }
  return async (message) => {
    await binding.send({ from, ...message });
  };
}

export default {
  async fetch(
    request: Request,
    env: Bindings,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    const database = drizzle(env.DB, { schema });
    const config = parseRuntimeConfig(
      {
        BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: env.BETTER_AUTH_URL,
        EMAIL_FROM: env.EMAIL_FROM,
        TRUSTED_ORIGINS: env.TRUSTED_ORIGINS,
      },
      true,
    );
    if (!config.emailFrom) {
      throw new Error("Production email configuration is unavailable");
    }
    const sendEmail = createCloudflareEmailSender(env.EMAIL, config.emailFrom);
    const auth = createAuth(database, {
      baseURL: config.authURL,
      production: true,
      scheduleTask: (promise) => executionContext.waitUntil(promise),
      secret: config.secret,
      sendEmail,
      trustedOrigins: config.trustedOrigins,
      ipAddressHeaders: ["cf-connecting-ip"],
    });
    return createApp({
      assets: { css: "/assets/app.css", script: "/assets/app.js" },
      auth,
      authClientAddress: (request) =>
        request.headers.get("CF-Connecting-IP") ?? "local-worker",
      authRateLimiter: async (key) => {
        const result = await env.AUTH_RATE_LIMITER.limit({ key });
        return { allowed: result.success, retryAfter: 60 };
      },
      healthCheck: async () => {
        await env.DB.prepare("select 1").first();
      },
    }).fetch(request, env);
  },
};
