import type { Context } from "hono";
import type { App, AppEnv } from "../app-types.js";
import { renderPage } from "../http/page.js";
import { boundedBody, sameOrigin } from "../middleware/request-security.js";
import { ExampleStatus, ExamplesPage } from "../views/pages/examples.js";

export function registerExampleRoutes(app: App) {
  app.use("/examples/refresh", boundedBody);
  app.get("/examples", examplesPage);
  app.post("/examples/refresh", sameOrigin, refreshExample);
}

export function examplesPage(c: Context<AppEnv>) {
  return renderPage(
    c,
    c.get("options").assets,
    "Examples",
    ExamplesPage(c.req.query("updated") === "1"),
  );
}

export function refreshExample(c: Context<AppEnv>) {
  if (c.req.header("HX-Request") === "true") return c.html(ExampleStatus(true));
  return c.redirect("/examples?updated=1", 303);
}
