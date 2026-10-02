import type { App } from "../app-types.js";
import { page } from "../http/page.js";
import { logRequest } from "../middleware/application.js";
import type { Assets } from "../views/layouts/app.js";
import { NotFoundPage } from "../views/pages/not-found.js";

export function registerErrors(app: App, assets: Assets) {
  app.notFound((c) => page(c, assets, "Not found", NotFoundPage(), 404));
  app.onError((error, c) => {
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
  });
}
