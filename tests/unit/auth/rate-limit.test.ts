import { expect, it, vi } from "vitest";
import type { AuthRateLimiter } from "../../../src/app-types.js";
import { checkAuthRateLimit } from "../../../src/auth/rate-limit.js";

it("normalizes identities into stable client and account buckets and passes allowed results through", async () => {
  const allowed = { allowed: true };
  const limiter = vi.fn<AuthRateLimiter>(async () => allowed);

  expect(
    await checkAuthRateLimit(
      limiter,
      "sign-in",
      " Client ",
      " User@Example.com ",
    ),
  ).toEqual(allowed);
  expect(
    await checkAuthRateLimit(limiter, "sign-in", "client", "user@example.com"),
  ).toEqual(allowed);

  const keys = limiter.mock.calls.map(([key]) => key);
  expect(keys).toHaveLength(4);
  expect(keys[0]).toMatch(/^ip:sign-in:[a-f0-9]{64}$/);
  expect(keys[1]).toMatch(/^account:sign-in:[a-f0-9]{64}$/);
  expect(keys.slice(0, 2)).toEqual(keys.slice(2));
});

it.each(["client", "account"])(
  "preserves retry delay when the %s bucket rejects and stops checking",
  async (bucket) => {
    const rejected = { allowed: false, retryAfter: 60 };
    const limiter = vi.fn<AuthRateLimiter>(async () => rejected);
    if (bucket === "account") limiter.mockResolvedValueOnce({ allowed: true });

    expect(
      await checkAuthRateLimit(
        limiter,
        "sign-in",
        "client",
        "user@example.com",
      ),
    ).toEqual(rejected);
    expect(limiter).toHaveBeenCalledTimes(bucket === "client" ? 1 : 2);
  },
);
