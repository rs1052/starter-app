import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { AuthRateLimiter } from "../../src/app-types.js";
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

it("uses separate client and account buckets across changing email addresses", async () => {
  closeAppFixture(fixture);
  const limiter = vi.fn<AuthRateLimiter>(async () => ({ allowed: true }));
  fixture = createAppFixture({ authRateLimiter: limiter });

  for (const email of ["first@example.com", "second@example.com"]) {
    await formRequest(fixture.app, "/sign-in", {
      email,
      password: "test-password",
    });
  }
  const keys = limiter.mock.calls.map((call) => call[0]);
  expect(keys).toHaveLength(4);
  expect(keys[0]).toMatch(/^ip:sign-in:/);
  expect(keys[0]).toBe(keys[2]);
  expect(keys[1]).toMatch(/^account:sign-in:/);
  expect(keys[1]).not.toBe(keys[3]);
  expect(keys.join(" ")).not.toContain("@example.com");
});

it("limits API mutations without charging session reads or sign-out", async () => {
  closeAppFixture(fixture);
  const limiter = vi.fn<AuthRateLimiter>(async () => ({
    allowed: false,
    retryAfter: 60,
  }));
  fixture = createAppFixture({ authRateLimiter: limiter });
  const handler = vi
    .spyOn(fixture.auth, "handler")
    .mockResolvedValue(new Response("handled"));
  const sessionLookup = vi.spyOn(fixture.auth.api, "getSession");

  const denied = await fixture.app.request("/api/auth/sign-in/email", {
    method: "POST",
  });
  expect(denied.status).toBe(429);
  expect(limiter.mock.calls[0]?.[0]).toMatch(
    /^ip:\/api\/auth\/sign-in\/email:/,
  );
  expect(handler).not.toHaveBeenCalled();
  await fixture.app.request("/api/auth/sign-in/email/", { method: "POST" });
  expect(limiter.mock.calls[1]?.[0]).toBe(limiter.mock.calls[0]?.[0]);
  await fixture.app.request("/api/auth/get-session");
  await fixture.app.request("/api/auth/sign-out", { method: "POST" });
  expect(limiter).toHaveBeenCalledTimes(2);
  expect(handler).toHaveBeenCalledTimes(2);
  expect(sessionLookup).not.toHaveBeenCalled();
});
