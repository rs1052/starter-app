import type { App } from "../app-types.js";
import type { Context } from "hono";
import type { AppEnv } from "../app-types.js";
import { applicationError } from "../http/handler.js";
import { renderPage } from "../http/page.js";

export function registerErrorHandlers(app: App) {
  app.notFound(notFoundPage);
  app.onError(applicationError);
}

export function notFoundPage(c: Context<AppEnv>) {
  return renderPage(c, "Not found", {}, 404);
}
