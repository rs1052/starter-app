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

it("requests and completes a password reset without account enumeration", async () => {
  await formRequest(fixture.app, "/sign-up", {
    name: "Reset User",
    email: "reset@example.com",
    password: "old-password-value",
  });

  const known = await formRequest(fixture.app, "/forgot-password", {
    email: "reset@example.com",
  });
  const knownBody = await known.text();
  expect(known.status).toBe(200);
  expect(fixture.messages).toHaveLength(1);
  expect(fixture.messages[0]?.to).toBe("reset@example.com");

  const unknown = await formRequest(fixture.app, "/forgot-password", {
    email: "unknown@example.com",
  });
  expect(unknown.status).toBe(200);
  expect(await unknown.text()).toBe(knownBody);
  expect(fixture.messages).toHaveLength(1);

  const resetURL = fixture.messages[0]?.text.match(/https?:\/\/\S+/)?.[0];
  expect(resetURL).toBeTruthy();
  const callback = await fixture.app.request(resetURL!, { redirect: "manual" });
  expect(callback.status).toBe(302);
  const location = callback.headers.get("location");
  const token = new URL(location!, origin).searchParams.get("token");
  expect(token).toBeTruthy();

  const mismatch = await formRequest(fixture.app, "/reset-password", {
    token: token!,
    password: "new-password-value",
    passwordConfirmation: "different-password",
  });
  expect(mismatch.status).toBe(400);
  expect(await mismatch.text()).toContain("The passwords do not match.");

  const reset = await formRequest(fixture.app, "/reset-password", {
    token: token!,
    password: "new-password-value",
    passwordConfirmation: "new-password-value",
  });
  expect(reset.status).toBe(200);
  expect(await reset.text()).toContain("Your password has been reset");

  const reused = await formRequest(fixture.app, "/reset-password", {
    token: token!,
    password: "another-password",
    passwordConfirmation: "another-password",
  });
  expect(reused.status).toBe(400);
  expect(await reused.text()).toContain("invalid or has expired");

  const signIn = await formRequest(fixture.app, "/sign-in", {
    email: "reset@example.com",
    password: "new-password-value",
  });
  expect(signIn.status).toBe(303);
});
