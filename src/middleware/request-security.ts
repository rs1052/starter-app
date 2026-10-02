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

export async function boundedBody(c: Context, next: () => Promise<void>) {
  if (c.req.method === "GET") return next();
  const contentLength = Number(c.req.header("Content-Length") ?? 0);
  if (contentLength > FORM_LIMIT)
    return c.text("Request body is too large.", 413);
  const body = await c.req.arrayBuffer();
  if (body.byteLength > FORM_LIMIT)
    return c.text("Request body is too large.", 413);
  return next();
}
