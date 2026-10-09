import type { AuthRateLimiter } from "../app-types.js";

// Forms use client and account buckets; auth API mutations use only the client bucket.
export async function checkAuthRateLimit(
  limiter: AuthRateLimiter,
  action: string,
  clientAddress: string,
  email?: string,
) {
  const client = await hashIdentity(clientAddress);
  const result = await limiter(`ip:${action}:${client}`);
  if (!result.allowed || email === undefined) return result;

  const identity = await hashIdentity(email);
  return limiter(`account:${action}:${identity}`);
}

async function hashIdentity(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
