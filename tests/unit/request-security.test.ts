import { afterEach, beforeEach, expect, it } from "vitest";
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
