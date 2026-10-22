import { Hono } from "hono";
import { expect, it, vi } from "vitest";
import type { AppEnv } from "../../src/app-types.js";
import { pageAction, pageLoader } from "../../src/http/page.js";

it("sanitizes page loader and action failures before framework error rendering", async () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  const requestLog = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("requestId", "page-error-test");
      await next();
    });
    const fail = () => {
      throw new Error("private database details");
    };
    app.get("/", pageLoader(fail));
    app.post("/", pageAction(fail));
    for (const method of ["GET", "POST"]) {
      const response = await app.request("/", { method });
      expect(response.status).toBe(500);
      expect(await response.text()).toBe(
        "Something went wrong. Reference: page-error-test",
      );
    }
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      "private database details",
    );
  } finally {
    errorLog.mockRestore();
    requestLog.mockRestore();
  }
});
