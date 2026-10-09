export interface RuntimeConfig {
  authURL: string;
  emailFrom?: string;
  production: boolean;
  resendApiKey?: string;
  secret: string;
  trustedOrigins: string[];
}

export function parseRuntimeConfig(
  values: Record<string, string | undefined>,
  production: boolean,
): RuntimeConfig {
  if (production && !values.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL is required in production");
  }

  const authURL = parseOrigin(
    "BETTER_AUTH_URL",
    values.BETTER_AUTH_URL || "http://localhost:5173",
    production,
  );
  const secret = requireSecret(values.BETTER_AUTH_SECRET);
  const trustedOrigins = parseOrigins(
    values.TRUSTED_ORIGINS || authURL,
    production,
  );

  if (!trustedOrigins.includes(authURL)) {
    throw new Error("TRUSTED_ORIGINS must include BETTER_AUTH_URL");
  }
  const emailFrom = optionalValue(values.EMAIL_FROM);
  const resendApiKey = optionalValue(values.RESEND_API_KEY);
  if (production && !emailFrom) {
    throw new Error("EMAIL_FROM is required in production");
  }
  if (!production && Boolean(emailFrom) !== Boolean(resendApiKey)) {
    throw new Error(
      "EMAIL_FROM and RESEND_API_KEY must be configured together",
    );
  }

  return {
    authURL,
    emailFrom,
    production,
    resendApiKey,
    secret,
    trustedOrigins,
  };
}

function optionalValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function requireSecret(secret: string | undefined) {
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }
  return secret;
}

function parseOrigins(origins: string, production: boolean) {
  const values = origins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new Error("TRUSTED_ORIGINS must contain at least one origin");
  }

  return values.map((origin, index) =>
    parseOrigin(`TRUSTED_ORIGINS entry ${index + 1}`, origin, production),
  );
}

function parseOrigin(name: string, value: string, production: boolean) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) origin`);
  }

  if (!isHttpProtocol(url.protocol) || hasExtraURLComponents(url)) {
    throw new Error(`${name} must be an HTTP(S) origin without a path`);
  }

  if (production && url.protocol !== "https:" && !isLocal(url.hostname)) {
    throw new Error(`${name} must use HTTPS in production`);
  }

  return url.origin;
}

function isHttpProtocol(protocol: string) {
  return protocol === "http:" || protocol === "https:";
}

function hasExtraURLComponents(url: URL) {
  return Boolean(
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash,
  );
}

function isLocal(hostname: string) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}
