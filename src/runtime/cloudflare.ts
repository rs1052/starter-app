import { drizzle } from "drizzle-orm/d1";
import { createApp } from "../app.js";
import { createAuth } from "../auth/create-auth.js";
import * as schema from "../db/schema.js";
import { createResendEmailSender } from "../email/send-email.js";
import { parseRuntimeConfig } from "./config.js";

interface Bindings {
  AUTH_RATE_LIMITER: RateLimit;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  DB: D1Database;
  EMAIL_FROM: string;
  RESEND_API_KEY: string;
  TRUSTED_ORIGINS?: string;
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
        RESEND_API_KEY: env.RESEND_API_KEY,
        TRUSTED_ORIGINS: env.TRUSTED_ORIGINS,
      },
      true,
    );
    if (!config.resendApiKey || !config.emailFrom) {
      throw new Error("Production email configuration is unavailable");
    }
    const sendEmail = createResendEmailSender({
      apiKey: config.resendApiKey,
      from: config.emailFrom,
    });
    const auth = createAuth(database, {
      baseURL: config.authURL,
      production: true,
      scheduleTask: (promise) => executionContext.waitUntil(promise),
      secret: config.secret,
      sendEmail,
      trustedOrigins: config.trustedOrigins,
    });
    return createApp({
      assets: { css: "/assets/app.css", script: "/assets/app.js" },
      auth,
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
