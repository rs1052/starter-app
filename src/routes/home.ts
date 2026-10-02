import type { App, AppOptions } from "../app-types.js";
import { page } from "../http/page.js";
import { HomePage } from "../views/pages/home.js";

export function registerHomeRoutes(app: App, options: AppOptions) {
  app.get("/health", async (c) => {
    try {
      await options.healthCheck();
      return c.json({ status: "ok" });
    } catch {
      return c.json({ status: "unavailable" }, 503);
    }
  });
  app.get("/", (c) => page(c, options.assets, "Home", HomePage()));
}
