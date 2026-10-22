import type { Context, Handler } from "hono";
import { defineHandler, type TypedHandler, type ValidatorSlots } from "void";
import type { AppEnv } from "../app-types.js";
import { logRequest } from "../middleware/application.js";

type ApplicationHandler<T> = TypedHandler<
  ValidatorSlots,
  Exclude<Awaited<T>, Response>
> &
  Handler<AppEnv>;

// Catch application failures before Void's development error renderer can expose details.
export function applicationHandler<T>(
  handler: (c: Context<AppEnv>) => T | Promise<T>,
): ApplicationHandler<T> {
  return defineHandler(async (c) => {
    try {
      return await handler(c);
    } catch (error) {
      return applicationError(
        error instanceof Error ? error : new Error("Unhandled failure"),
        c,
      );
    }
  }) as ApplicationHandler<T>;
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
