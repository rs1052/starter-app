import type { Hono } from "hono";
import type { Auth } from "./auth/create-auth.js";
import type { PageAssetPaths } from "./views/layouts/app.js";
import type { Bindings } from "./runtime/cloudflare.js";
import type { CloudEnv } from "void";

export type AuthRateLimiter = (key: string) => Promise<{
  allowed: boolean;
  retryAfter?: number;
}>;

export interface AppOptions {
  assets: PageAssetPaths;
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
  }
}

export type App = Hono<AppEnv>;
