import type { Hono } from "hono";
import type { Auth } from "./auth/create-auth.js";
import type { Assets } from "./views/layouts/app.js";

export type AuthRateLimiter = (key: string) => Promise<{
  allowed: boolean;
  retryAfter?: number;
}>;

export interface AppOptions {
  assets: Assets;
  auth: Auth;
  authRateLimiter: AuthRateLimiter;
  authClientAddress: (request: Request) => string;
  healthCheck: () => Promise<void>;
}

type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export type AppEnv = {
  Variables: { requestId: string; session: Session };
};

export type App = Hono<AppEnv>;
