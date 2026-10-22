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
import { applicationError } from "../src/http/handler.js";
import { boundedBody, sameOrigin } from "../src/middleware/request-security.js";
import { authRequestSecurity } from "../src/routes/auth.js";

const initialize: MiddlewareHandler<AppEnv> = async (c, next) => {
  const options = cloudflareOptions(c.env, c.executionCtx);
  c.set("options", options);
  c.set("shared", { signedIn: false });
  // An external stylesheet works before hydration and under the strict CSP.
  c.set("headDefaults", {
    link: [
      {
        rel: "stylesheet",
        href: import.meta.env.DEV
          ? "/resources/css/app.css"
          : "/assets/app.css",
      },
    ],
  });
  await sessionLookup(options.auth)(c, next);
  // Void 1.2.0 rebuilds rendered page responses with status 200.
  const status = c.get("pageStatus");
  if (status && c.res.status === 200) {
    c.res = new Response(c.res.body, { status, headers: c.res.headers });
  }
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
