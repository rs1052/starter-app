import { afterEach, beforeEach, expect, it } from "vite-plus/test";
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

it("prepares public page data, headers, and safe errors", async () => {
  const home = await fixture.app.request("/");
  expect(home.status).toBe(200);
  expect(await home.json()).toEqual({ title: "Home" });
  expect(home.headers.get("content-security-policy")).toContain(
    "default-src 'self'",
  );
  expect(home.headers.get("x-request-id")).toBeTruthy();
  for (const directive of [
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
  ]) {
    expect(home.headers.get("content-security-policy")).toContain(directive);
  }

  const missing = await fixture.app.request("/missing");
  expect(missing.status).toBe(404);
  expect(await missing.json()).toEqual({ title: "Not found" });
});
