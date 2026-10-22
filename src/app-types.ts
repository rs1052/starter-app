import type { Hono } from "hono";
import type { Auth } from "./auth/create-auth.js";
import type { PageData } from "./http/page.js";
import type { Bindings } from "./runtime/cloudflare.js";
import type { CloudEnv } from "void";

export type AuthRateLimiter = (key: string) => Promise<{
  allowed: boolean;
  retryAfter?: number;
}>;

export interface AppOptions {
  auth: Auth;
  authRateLimiter: AuthRateLimiter;
  authClientAddress: (request: Request) => string;
  healthCheck: () => Promise<void>;
}

type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;

export type AppEnv = CloudEnv;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Void's extension point for custom bindings.
  interface VoidGeneratedEnvBindings extends Bindings {}
}

declare module "void" {
  interface CloudContextVariables {
    requestId: string;
    appSession: Session;
    options: AppOptions;
    pageStatus?: 400 | 404;
    pageData?: PageData;
  }
}

export type App = Hono<AppEnv>;
