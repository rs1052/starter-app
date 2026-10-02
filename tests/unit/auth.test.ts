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

afterEach(() => closeAppFixture(fixture));

it("persists a session, protects the account, escapes values, and signs out", async () => {
  const anonymous = await fixture.app.request("/account");
  expect(anonymous.status).toBe(302);

  const signUp = await formRequest(fixture.app, "/sign-up", {
    name: "<script>alert(1)</script>",
    email: "unit@example.com",
    password: "correct-horse-battery-staple",
  });
  expect(signUp.status).toBe(303);
  const cookie = signUp.headers.get("set-cookie")?.split(";", 1)[0];
  expect(cookie).toBeTruthy();

  const account = await fixture.app.request("/account", {
    headers: { cookie: cookie! },
  });
  const html = await account.text();
  expect(account.status).toBe(200);
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).not.toContain("<script>alert(1)</script>");

  const signOut = await fixture.app.request("/sign-out", {
    method: "POST",
    headers: { cookie: cookie!, origin },
  });
  expect(signOut.status).toBe(303);
});

it("rate-limits authentication before calling Better Auth", async () => {
  closeAppFixture(fixture);
  fixture = createAppFixture({
    authRateLimiter: async () => ({ allowed: false, retryAfter: 60 }),
  });
  const signIn = vi.spyOn(fixture.auth.api, "signInEmail");

  const response = await formRequest(fixture.app, "/sign-in", {
    email: "unit@example.com",
    password: "correct-horse-battery-staple",
  });

  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("60");
  expect(await response.text()).toBe("Too many attempts. Try again later.");
  expect(signIn).not.toHaveBeenCalled();
});
