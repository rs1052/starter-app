import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import type { App, AppEnv } from "../app-types.js";
import type { Auth } from "../auth/create-auth.js";
import type { Context } from "hono";

export function registerApplicationMiddleware(app: App, auth: Auth) {
  app.use("*", requestId(), requestLog, securityHeaders, sessionLookup(auth));
}

export async function requestLog(
  c: Context<AppEnv>,
  next: () => Promise<void>,
) {
  const started = performance.now();
  await next();
  logRequest(c, started);
}

export const securityHeaders = secureHeaders({
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
});

export function sessionLookup(auth: Auth) {
  return async (c: Context<AppEnv>, next: () => Promise<void>) => {
    if (c.req.path === "/health" || c.req.path.startsWith("/api/auth/")) {
      c.set("appSession", null);
      return next();
    }
    const { response: session, headers } = await auth.api.getSession({
      headers: c.req.raw.headers,
      returnHeaders: true,
    });
    c.set("appSession", session);
    c.set("shared", { signedIn: Boolean(session) });
    c.header("Cache-Control", "no-store");
    c.header("Vary", "X-VoidPages");
    await next();
    // Mutations can rotate or clear these cookies. Their values must win.
    const responseCookieNames = new Set(
      c.res.headers.getSetCookie().map((cookie) => cookie.split("=", 1)[0]),
    );
    for (const cookie of headers.getSetCookie()) {
      if (!responseCookieNames.has(cookie.split("=", 1)[0])) {
        c.header("Set-Cookie", cookie, { append: true });
      }
    }
  };
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
