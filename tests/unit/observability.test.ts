import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test";
import {
  closeAppFixture,
  createAppFixture,
  type AppFixture,
} from "./app-fixture.js";

let fixture: AppFixture;

beforeEach(() => {
  fixture = createAppFixture();
});

afterEach(() => closeAppFixture(fixture));

it("logs correlated requests and reports health failures safely", async () => {
  const sessionLookup = vi
    .spyOn(fixture.auth.api, "getSession")
    .mockRejectedValue(new Error("session database unavailable"));
  const healthy = await fixture.app.request("/health");
  expect(healthy.status).toBe(200);
  expect(sessionLookup).not.toHaveBeenCalled();
  const requestId = healthy.headers.get("x-request-id");
  expect(requestId).toBeTruthy();
  const completions = fixture.info.mock.calls
    .map(
      (call: unknown[]) =>
        JSON.parse(String(call[0])) as Record<string, unknown>,
    )
    .filter(
      (record: Record<string, unknown>) => record.event === "request.completed",
    );
  expect(completions).toEqual([
    expect.objectContaining({ requestId, route: "/health", status: 200 }),
  ]);

  closeAppFixture(fixture);
  fixture = createAppFixture({
    healthCheck: async () => {
      throw new Error("database details");
    },
  });
  const failedSessionLookup = vi
    .spyOn(fixture.auth.api, "getSession")
    .mockRejectedValue(new Error("session database unavailable"));
  const unavailable = await fixture.app.request("/health");
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({ status: "unavailable" });
  const secondUnavailable = await fixture.app.request("/health");
  expect(await secondUnavailable.text()).not.toContain("database details");
  expect(failedSessionLookup).not.toHaveBeenCalled();
});

it("returns and logs a correlation ID for uncaught errors", async () => {
  const failure = new Error("forced failure");
  vi.spyOn(fixture.auth.api, "getSession").mockRejectedValueOnce(failure);
  const errorLog = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  const response = await fixture.app.request("/");
  const requestId = response.headers.get("x-request-id");
  const body = await response.text();
  expect(response.status).toBe(500);
  expect(requestId).toBeTruthy();
  expect(body).toBe(`Something went wrong. Reference: ${requestId}`);
  expect(body).not.toContain("forced failure");

  expect(errorLog).toHaveBeenCalledTimes(1);
  const record = JSON.parse(String(errorLog.mock.calls[0]?.[0])) as {
    event: string;
    requestId: string;
  };
  expect(record.event).toBe("request.error");
  expect(record.requestId).toBe(requestId);
  expect(errorLog.mock.calls[0]?.[0]).not.toContain("forced failure");
  const completions = fixture.info.mock.calls
    .map(
      (call: unknown[]) =>
        JSON.parse(String(call[0])) as Record<string, unknown>,
    )
    .filter(
      (record: Record<string, unknown>) => record.event === "request.completed",
    );
  expect(completions).toEqual([
    expect.objectContaining({ requestId, status: 500 }),
  ]);
});
