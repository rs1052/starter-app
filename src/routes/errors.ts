import type { App } from "../app-types.js";
import type { Context } from "hono";
import type { AppEnv } from "../app-types.js";
import { renderPage } from "../http/page.js";
import { logRequest } from "../middleware/application.js";
import type { PageAssetPaths } from "../views/layouts/app.js";
import { NotFoundPage } from "../views/pages/not-found.js";

export function registerErrorHandlers(app: App, assets: PageAssetPaths) {
  app.notFound((c) => notFoundPage(c, assets));
  app.onError(applicationError);
}

export function notFoundPage(
  c: Context<AppEnv>,
  assets = c.get("options").assets,
) {
  return renderPage(c, assets, "Not found", NotFoundPage(), 404);
}

export function applicationError(error: Error, c: Context<AppEnv>) {
  const requestId = c.get("requestId");
  console.error(
    JSON.stringify({
      event: "request.error",
      requestId,
      error: {
        type: "UnhandledError",
        stack: error.stack
          ?.split("\n")
          .filter((line) => line.trimStart().startsWith("at "))
          .join("\n"),
      },
    }),
  );
  logRequest(c, undefined, 500);
  return c.text(`Something went wrong. Reference: ${requestId}`, 500);
}
