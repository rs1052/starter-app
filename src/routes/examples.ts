import type { App } from "../app-types.js";
import { page } from "../http/page.js";
import { boundedBody, sameOrigin } from "../middleware/request-security.js";
import type { Assets } from "../views/layouts/app.js";
import { ExampleStatus, ExamplesPage } from "../views/pages/examples.js";

export function registerExampleRoutes(app: App, assets: Assets) {
  app.use("/examples/refresh", boundedBody);
  app.get("/examples", (c) =>
    page(c, assets, "Examples", ExamplesPage(c.req.query("updated") === "1")),
  );
  app.post("/examples/refresh", sameOrigin, (c) => {
    if (c.req.header("HX-Request") === "true")
      return c.html(ExampleStatus(true));
    return c.redirect("/examples?updated=1", 303);
  });
}
