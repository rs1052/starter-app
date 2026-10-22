import type { Context } from "hono";
import type { App, AppEnv } from "../app-types.js";
import { renderPage } from "../http/page.js";
import { HomePage } from "../views/pages/home.js";

export function registerHomeRoutes(app: App) {
  app.get("/health", health);
  app.get("/", homePage);
}

export async function health(c: Context<AppEnv>) {
  try {
    await c.get("options").healthCheck();
    return c.json({ status: "ok" });
  } catch {
    return c.json({ status: "unavailable" }, 503);
  }
}

export function homePage(c: Context<AppEnv>) {
  return renderPage(c, c.get("options").assets, "Home", HomePage());
}
