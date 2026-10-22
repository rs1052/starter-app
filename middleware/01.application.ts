import { every } from "hono/combine";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../src/app-types.js";
import { requestId } from "hono/request-id";
import { defineMiddleware } from "void";
import {
  requestLog,
  securityHeaders,
  sessionLookup,
} from "../src/middleware/application.js";
import { cloudflareOptions } from "../src/runtime/cloudflare.js";
import { applicationError } from "../src/routes/errors.js";
import { boundedBody, sameOrigin } from "../src/middleware/request-security.js";
import { authRequestSecurity } from "../src/routes/auth.js";

const initialize: MiddlewareHandler<AppEnv> = async (c, next) => {
  const options = cloudflareOptions(c.env, c.executionCtx);
  c.set("options", options);
  await sessionLookup(options.auth)(c, next);
};

const requestSecurity: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.path === "/examples/refresh") {
    return every(boundedBody, sameOrigin)(c, next);
  }
  await next();
};

export default defineMiddleware(
  every(
    requestId(),
    requestLog,
    securityHeaders,
    async (c, next) => {
      try {
        await next();
      } catch (error) {
        return applicationError(
          error instanceof Error ? error : new Error("Unhandled failure"),
          c,
        );
      }
    },
    initialize,
    authRequestSecurity,
    requestSecurity,
  ),
);
