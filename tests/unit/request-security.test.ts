import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  closeAppFixture,
  createAppFixture,
  formRequest,
  origin,
  type AppFixture,
} from "./app-fixture.js";

let fixture: AppFixture;

beforeEach(() => {
  fixture = createAppFixture();
});

it("stops reading an oversized stream and bounds Better Auth API bodies", async () => {
  let reads = 0;
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
    pull(controller) {
      reads += 1;
      controller.enqueue(new Uint8Array(16 * 1024));
      if (reads === 100) controller.close();
    },
  });
  const response = await fixture.app.fetch(
    new Request(`${origin}/sign-in`, {
      method: "POST",
      headers: { origin },
      body,
      duplex: "half",
    } as RequestInit),
  );
  expect(response.status).toBe(413);
  expect(reads).toBeLessThan(100);
  streamController!.close();

  const handler = vi.spyOn(fixture.auth, "handler");
  const apiResponse = await fixture.app.request("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email: "a".repeat(70_000) }),
  });
  expect(apiResponse.status).toBe(413);
  expect(handler).not.toHaveBeenCalled();
});

afterEach(() => closeAppFixture(fixture));

it("rejects invalid origins, malformed forms, and oversized bodies", async () => {
  const wrongOrigin = await fixture.app.request("/sign-in", {
    method: "POST",
    headers: { origin: "https://evil.example" },
  });
  expect(wrongOrigin.status).toBe(403);

  const invalid = await formRequest(fixture.app, "/sign-up", {
    email: "unit@example.com",
  });
  expect(invalid.status).toBe(400);

  const oversized = await fixture.app.request("/sign-in", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", origin },
    body: `email=${"a".repeat(70_000)}`,
  });
  expect(oversized.status).toBe(413);
});
