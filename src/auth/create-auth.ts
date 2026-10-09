import { drizzleAdapter, type DB } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import * as schema from "../db/schema.js";
import type { SendEmail } from "../email/send-email.js";

export interface AuthConfig {
  baseURL: string;
  production: boolean;
  scheduleTask: (promise: Promise<unknown>) => void;
  secret: string;
  sendEmail: SendEmail;
  trustedOrigins: string[];
  ipAddressHeaders?: string[];
}

export function createAuth(database: DB, config: AuthConfig) {
  const sendAuthEmail: SendEmail = async (message) => {
    config.scheduleTask(
      config.sendEmail(message).catch(() => {
        console.error("Transactional email delivery failed.");
      }),
    );
  };

  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(database, {
      provider: "sqlite",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: "Reset your password",
          text: `Use this link to reset your password: ${url}\n\nThis link expires in one hour. If you did not request it, you can ignore this email.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        await sendAuthEmail({
          to: user.email,
          subject: "Verify your email",
          text: `Use this link to verify ownership of your email address: ${url}\n\nThis link expires in one hour. If you did not create this account, you can ignore this email.`,
        });
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: config.ipAddressHeaders },
      backgroundTasks: { handler: config.scheduleTask },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.production,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
