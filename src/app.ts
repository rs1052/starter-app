import { Hono } from "hono";
import type { AppEnv, AppOptions } from "./app-types.js";
import { registerApplicationMiddleware } from "./middleware/application.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerErrors } from "./routes/errors.js";
import { registerExampleRoutes } from "./routes/examples.js";
import { registerHomeRoutes } from "./routes/home.js";

export function createApp(options: AppOptions) {
  const app = new Hono<AppEnv>();
  registerApplicationMiddleware(app, options.auth);
  registerHomeRoutes(app, options);
  registerAuthRoutes(app, options);
  registerExampleRoutes(app, options.assets);
  registerErrors(app, options.assets);
  return app;
}
