import type { Handler } from "hono";
import { defineHandler } from "void";
import type { AppEnv } from "../app-types.js";
import { applicationError } from "../routes/errors.js";

// Catch application failures before Void's development error renderer can expose details.
export function applicationHandler(handler: Handler<AppEnv>) {
  return defineHandler(async (c) => {
    try {
      return await handler(c, async () => {});
    } catch (error) {
      return applicationError(
        error instanceof Error ? error : new Error("Unhandled failure"),
        c,
      );
    }
  });
}
