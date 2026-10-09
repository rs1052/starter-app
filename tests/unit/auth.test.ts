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

it("requires email verification, persists a session, escapes values, and signs out", async () => {
  const anonymous = await fixture.app.request("/account");
  expect(anonymous.status).toBe(302);

  const signUp = await formRequest(fixture.app, "/sign-up", {
    name: "<script>alert(1)</script>",
    email: "unit@example.com",
    password: "correct-horse-battery-staple",
  });
  expect(signUp.status).toBe(200);
  expect(await signUp.text()).toContain("Check your email");
  expect(signUp.headers.get("set-cookie")).toBeNull();
  expect(
    fixture.client
      .prepare("select email_verified from user where email = ?")
      .get("unit@example.com"),
  ).toEqual({ email_verified: 0 });
  const credentials = {
    email: "unit@example.com",
    password: "correct-horse-battery-staple",
  };
  expect((await formRequest(fixture.app, "/sign-in", credentials)).status).toBe(
    400,
  );
  const verification = fixture.messages.find(
    (message) => message.subject === "Verify your email",
  );
  const url = verification?.text.match(/https?:\/\/\S+/)?.[0];
  expect(url).toBeTruthy();
  const verified = await fixture.app.request(url!);
  expect(verified.status).toBe(302);
  expect(verified.headers.get("location")).toBe("/sign-in?verified=1");
  const signIn = await formRequest(fixture.app, "/sign-in", credentials);
  expect(signIn.status).toBe(303);
  const cookie = signIn.headers.get("set-cookie")?.split(";", 1)[0];
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

it("resends verification with a generic response and client/account rate limits", async () => {
  closeAppFixture(fixture);
  const limiter = vi.fn<AuthRateLimiter>(async () => ({ allowed: true }));
  fixture = createAppFixture({ authRateLimiter: limiter });
  await formRequest(fixture.app, "/sign-up", {
    name: "User",
    email: "resend@example.com",
    password: "test-password",
  });
  const known = await formRequest(fixture.app, "/verify-email", {
    email: "resend@example.com",
  });
  const unknown = await formRequest(fixture.app, "/verify-email", {
    email: "unknown@example.com",
  });
  expect(known.status).toBe(200);
  expect(unknown.status).toBe(known.status);
  expect(await unknown.text()).toBe(await known.text());
  expect(fixture.messages).toHaveLength(2);
  expect(limiter.mock.calls.map(([key]) => key).slice(2, 4)).toEqual([
    expect.stringMatching(/^ip:verify-email:/),
    expect.stringMatching(/^account:verify-email:/),
  ]);
});

it("changes a password, rotates the current session, and revokes other sessions", async () => {
  const credentials = {
    email: "password@example.com",
    password: "old-password-value",
  };
  await formRequest(fixture.app, "/sign-up", {
    ...credentials,
    name: "Password User",
  });
  await fixture.app.request(
    fixture.messages[0]!.text.match(/https?:\/\/\S+/)![0],
  );
  const first = await formRequest(fixture.app, "/sign-in", credentials);
  const second = await formRequest(fixture.app, "/sign-in", credentials);
  const firstCookie = first.headers.get("set-cookie")!.split(";", 1)[0]!;
  const secondCookie = second.headers.get("set-cookie")!.split(";", 1)[0]!;
  const fields = {
    currentPassword: credentials.password,
    newPassword: "new-password-value",
    passwordConfirmation: "new-password-value",
  };
  const change = (cookie: string, values = fields, requestOrigin = origin) =>
    fixture.app.request("/account/password", {
      method: "POST",
      headers: { cookie, origin: requestOrigin },
      body: new URLSearchParams(values),
    });
  expect(
    (await change(firstCookie, fields, "https://other.example.com")).status,
  ).toBe(403);
  expect(
    (
      await change(firstCookie, {
        ...fields,
        currentPassword: "incorrect-password",
      })
    ).status,
  ).toBe(400);
  const response = await change(firstCookie);
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe("/account?passwordChanged=1");
  const newCookie = response.headers.get("set-cookie")!.split(";", 1)[0]!;
  expect(
    (await fixture.app.request("/account", { headers: { cookie: newCookie } }))
      .status,
  ).toBe(200);
  expect(
    (
      await fixture.app.request("/account", {
        headers: { cookie: secondCookie },
      })
    ).status,
  ).toBe(302);
  expect(
    (
      await formRequest(fixture.app, "/sign-in", {
        ...credentials,
        password: fields.newPassword,
      })
    ).status,
  ).toBe(303);
});

it("protects password changes with authentication, body limits, and rate limits", async () => {
  closeAppFixture(fixture);
  const limiter = vi.fn<AuthRateLimiter>(async () => ({ allowed: true }));
  fixture = createAppFixture({ authRateLimiter: limiter });
  const fields = {
    currentPassword: "old-password",
    newPassword: "new-password",
    passwordConfirmation: "new-password",
  };
  const api = vi.spyOn(fixture.auth.api, "changePassword");
  expect(
    (await formRequest(fixture.app, "/account/password", fields)).status,
  ).toBe(303);
  expect(
    (
      await formRequest(fixture.app, "/account/password", {
        ...fields,
        currentPassword: "x".repeat(65 * 1024),
      })
    ).status,
  ).toBe(413);
  expect(api).not.toHaveBeenCalled();
  const credentials = {
    email: "limited@example.com",
    password: "old-password",
  };
  await formRequest(fixture.app, "/sign-up", { ...credentials, name: "User" });
  await fixture.app.request(
    fixture.messages[0]!.text.match(/https?:\/\/\S+/)![0],
  );
  const signIn = await formRequest(fixture.app, "/sign-in", credentials);
  const cookie = signIn.headers.get("set-cookie")!.split(";", 1)[0]!;
  limiter.mockResolvedValue({ allowed: false, retryAfter: 60 });
  const limited = await fixture.app.request("/account/password", {
    method: "POST",
    headers: { cookie, origin },
    body: new URLSearchParams(fields),
  });
  expect(limited.status).toBe(429);
  expect(api).not.toHaveBeenCalled();
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
