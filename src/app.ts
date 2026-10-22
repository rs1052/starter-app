import { Hono } from "hono";
import type { AppEnv, AppOptions } from "./app-types.js";
import { registerApplicationMiddleware } from "./middleware/application.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerErrorHandlers } from "./routes/errors.js";
import { registerExampleRoutes } from "./routes/examples.js";
import { registerHomeRoutes } from "./routes/home.js";

// In-process test harness. Void's routes/ and middleware/ own the Worker runtime.
export function createApp(options: AppOptions) {
  const app = new Hono<AppEnv>();
  app.use("*", async (c, next) => {
    c.set("options", options);
    await next();
  });
  registerApplicationMiddleware(app, options.auth);
  registerHomeRoutes(app);
  registerAuthRoutes(app);
  registerExampleRoutes(app);
  registerErrorHandlers(app);
  return app;
}
