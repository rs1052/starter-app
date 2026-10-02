import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
  const healthy = await fixture.app.request("/health");
  const requestId = healthy.headers.get("x-request-id");
  expect(requestId).toBeTruthy();
  expect(
    fixture.info.mock.calls.some((call: unknown[]) => {
      const record = JSON.parse(String(call[0])) as Record<string, unknown>;
      return (
        record.event === "request.completed" &&
        record.requestId === requestId &&
        record.route === "/health" &&
        record.status === 200
      );
    }),
  ).toBe(true);

  closeAppFixture(fixture);
  fixture = createAppFixture({
    healthCheck: async () => {
      throw new Error("database details");
    },
  });
  const unavailable = await fixture.app.request("/health");
  expect(unavailable.status).toBe(503);
  expect(await unavailable.json()).toEqual({ status: "unavailable" });
  const secondUnavailable = await fixture.app.request("/health");
  expect(await secondUnavailable.text()).not.toContain("database details");
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

  const record = JSON.parse(String(errorLog.mock.calls[0]?.[0])) as {
    event: string;
    requestId: string;
  };
  expect(record.event).toBe("request.error");
  expect(record.requestId).toBe(requestId);
  expect(errorLog.mock.calls[0]?.[0]).not.toContain("forced failure");
  expect(
    fixture.info.mock.calls.some((call: unknown[]) => {
      const completion = JSON.parse(String(call[0])) as Record<string, unknown>;
      return completion.requestId === requestId && completion.status === 500;
    }),
  ).toBe(true);
});
