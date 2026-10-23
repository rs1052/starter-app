import { Hono } from "hono";
import { expect, it, vi } from "vite-plus/test";
import type { AppEnv } from "../../src/app-types.js";
import { pageAction, pageLoader } from "../../src/http/page.js";
import { applicationErrorBoundary } from "../../src/http/handler.js";
import { requestLog as requestLogMiddleware } from "../../src/middleware/application.js";

it("sanitizes page loader and action failures before framework error rendering", async () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  const requestLog = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("requestId", "page-error-test");
      await next();
    });
    app.use("*", requestLogMiddleware);
    const fail = () => {
      throw new Error("private database details");
    };
    app.get("/", pageLoader(fail));
    app.post("/", pageAction(fail));
    for (const method of ["GET", "POST"]) {
      errorLog.mockClear();
      requestLog.mockClear();
      const response = await app.request("/", { method });
      expect(response.status).toBe(500);
      expect(await response.text()).toBe(
        "Something went wrong. Reference: page-error-test",
      );
      expect(errorLog).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(errorLog.mock.calls[0]?.[0]))).toMatchObject({
        event: "request.error",
        requestId: "page-error-test",
      });
      expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
        "private database details",
      );
      expect(requestLog).toHaveBeenCalledTimes(1);
      expect(JSON.parse(String(requestLog.mock.calls[0]?.[0]))).toMatchObject({
        event: "request.completed",
        requestId: "page-error-test",
        method,
        status: 500,
      });
    }
  } finally {
    errorLog.mockRestore();
    requestLog.mockRestore();
  }
});

it("normalizes framework-handled server failures but preserves intentional 4xx responses", async () => {
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  const requestLog = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("requestId", "render-error-test");
      await next();
    });
    app.use("*", requestLogMiddleware);
    app.use("*", applicationErrorBoundary);
    // Like Void's renderer, Hono's onError consumes downstream exceptions.
    app.onError((error, c) =>
      c.req.path === "/rejected"
        ? c.text("Deliberate rejection", 403)
        : c.text(error.message, 500),
    );
    app.get("*", () => {
      throw new Error("private renderer details");
    });

    const failed = await app.request("/render");
    expect(failed.status).toBe(500);
    expect(await failed.text()).toBe(
      "Something went wrong. Reference: render-error-test",
    );
    expect(failed.headers.get("cache-control")).toBe("no-store");
    expect(errorLog).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(errorLog.mock.calls[0]?.[0]))).toMatchObject({
      event: "request.error",
      requestId: "render-error-test",
    });
    expect(requestLog).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(requestLog.mock.calls[0]?.[0]))).toMatchObject({
      event: "request.completed",
      requestId: "render-error-test",
      status: 500,
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      "private renderer details",
    );
    const rejected = await app.request("/rejected");
    expect(rejected.status).toBe(403);
    expect(await rejected.text()).toBe("Deliberate rejection");
  } finally {
    errorLog.mockRestore();
    requestLog.mockRestore();
  }
});
