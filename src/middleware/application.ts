import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { App, AppEnv } from "../app-types.js";
import type { Auth } from "../auth/create-auth.js";
import type { Context } from "hono";

export function registerApplicationMiddleware(app: App, auth: Auth) {
  app.use("*", requestId());
  app.use("*", async (c, next) => {
    const started = performance.now();
    await next();
    logRequest(c, started);
  });
  app.use(
    "*",
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        objectSrc: ["'none'"],
        formAction: ["'self'"],
      },
      referrerPolicy: "strict-origin-when-cross-origin",
    }),
  );

  app.use("*", async (c, next) => {
    if (c.req.path === "/health" || c.req.path.startsWith("/api/auth/")) {
      c.set("session", null);
      return next();
    }
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    c.set("session", session);
    await next();
  });
}

export function logRequest(
  c: Context<AppEnv>,
  started?: number,
  status = c.res.status,
) {
  console.info(
    JSON.stringify({
      event: "request.completed",
      requestId: c.get("requestId"),
      method: c.req.method,
      route: c.req.routePath,
      status,
      ...(started === undefined
        ? {}
        : { durationMs: Math.round(performance.now() - started) }),
    }),
  );
}
