import { bodyLimit } from "hono/body-limit";
import type { Context } from "hono";

const FORM_LIMIT = 64 * 1024;

export async function sameOrigin(c: Context, next: () => Promise<void>) {
  if (c.req.method === "GET") return next();
  const origin = c.req.header("Origin");
  if (!origin || origin !== new URL(c.req.url).origin) {
    return c.text("Invalid request origin.", 403);
  }
  return next();
}

export const boundedBody = bodyLimit({
  maxSize: FORM_LIMIT,
  onError: (c) => c.text("Request body is too large.", 413),
});
