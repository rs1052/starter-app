import { describe, expect, it } from "vitest";
import { parseRuntimeConfig } from "../../src/runtime/config.js";

const secret = "unit-test-secret-that-is-at-least-32-characters";

describe("parseRuntimeConfig", () => {
  it("uses and normalizes development defaults", () => {
    expect(parseRuntimeConfig({ BETTER_AUTH_SECRET: secret }, false)).toEqual({
      authURL: "http://localhost:5173",
      emailFrom: undefined,
      production: false,
      resendApiKey: undefined,
      secret,
      trustedOrigins: ["http://localhost:5173"],
    });
  });

  it("accepts normalized production origins", () => {
    expect(
      parseRuntimeConfig(
        {
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_URL: "https://example.com/",
          EMAIL_FROM: "App <no-reply@example.com>",
          RESEND_API_KEY: "test-key",
          TRUSTED_ORIGINS: " https://example.com, https://admin.example.com/ ",
        },
        true,
      ),
    ).toEqual({
      authURL: "https://example.com",
      emailFrom: "App <no-reply@example.com>",
      production: true,
      resendApiKey: "test-key",
      secret,
      trustedOrigins: ["https://example.com", "https://admin.example.com"],
    });
  });

  it("allows HTTP for a local production preview", () => {
    expect(
      parseRuntimeConfig(
        {
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_URL: "http://127.0.0.1:4173",
          EMAIL_FROM: "App <no-reply@example.com>",
          RESEND_API_KEY: "test-key",
        },
        true,
      ).authURL,
    ).toBe("http://127.0.0.1:4173");
  });

  it("requires an explicit production authentication URL", () => {
    expect(() =>
      parseRuntimeConfig({ BETTER_AUTH_SECRET: secret }, true),
    ).toThrow("BETTER_AUTH_URL is required in production");
  });

  it("requires production email delivery configuration", () => {
    expect(() =>
      parseRuntimeConfig(
        {
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_URL: "https://example.com",
        },
        true,
      ),
    ).toThrow("EMAIL_FROM and RESEND_API_KEY are required in production");
  });

  it("requires development email settings together", () => {
    expect(() =>
      parseRuntimeConfig(
        { BETTER_AUTH_SECRET: secret, RESEND_API_KEY: "test-key" },
        false,
      ),
    ).toThrow("EMAIL_FROM and RESEND_API_KEY must be configured together");
  });

  it.each([
    ["malformed", "not a URL"],
    ["non-HTTP", "ftp://example.com"],
    ["credentials", "https://user@example.com"],
    ["path", "https://example.com/auth"],
    ["query", "https://example.com/?source=test"],
    ["fragment", "https://example.com/#auth"],
  ])("rejects a %s authentication URL", (_label, authURL) => {
    expect(() =>
      parseRuntimeConfig(
        { BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: authURL },
        false,
      ),
    ).toThrow(/BETTER_AUTH_URL must/);
  });

  it("requires HTTPS for a non-local production origin", () => {
    expect(() =>
      parseRuntimeConfig(
        {
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_URL: "http://example.com",
        },
        true,
      ),
    ).toThrow("BETTER_AUTH_URL must use HTTPS in production");
  });

  it("validates every trusted origin", () => {
    expect(() =>
      parseRuntimeConfig(
        {
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_URL: "https://example.com",
          TRUSTED_ORIGINS: "https://example.com, javascript:alert(1)",
        },
        true,
      ),
    ).toThrow("TRUSTED_ORIGINS entry 2 must");
  });

  it("requires the authentication URL among trusted origins", () => {
    expect(() =>
      parseRuntimeConfig(
        {
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_URL: "https://example.com",
          TRUSTED_ORIGINS: "https://admin.example.com",
        },
        true,
      ),
    ).toThrow("TRUSTED_ORIGINS must include BETTER_AUTH_URL");
  });
});
