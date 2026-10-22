import type { Context } from "hono";
import { every } from "hono/combine";
import type { App, AppEnv, AppOptions } from "../app-types.js";
import { checkAuthRateLimit } from "../auth/rate-limit.js";
import { renderPage } from "../http/page.js";
import { boundedBody, sameOrigin } from "../middleware/request-security.js";

export function registerAuthRoutes(app: App) {
  app.use("*", authRequestSecurity);
  app.get("/sign-up", signUpPage);
  app.get("/sign-in", signInPage);
  app.get("/forgot-password", forgotPasswordPage);
  app.get("/verify-email", verifyEmailPage);
  app.post("/verify-email", requestVerification);
  app.get("/reset-password", resetPasswordPage);
  app.post("/sign-up", signUp);
  app.post("/sign-in", signIn);
  app.post("/forgot-password", forgotPassword);
  app.post("/reset-password", resetPassword);
  app.get("/account", accountPage);
  app.post("/account/password", changePassword);
  app.post("/sign-out", signOut);
  app.on(["GET", "POST"], "/api/auth/*", authApi);
}

export async function authRequestSecurity(
  c: Context<AppEnv>,
  next: () => Promise<void>,
) {
  if (c.req.path.startsWith("/api/auth/")) {
    return every(boundedBody, limitAuthApi)(c, next);
  }
  if (
    [
      "/sign-up",
      "/sign-in",
      "/sign-out",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/account/password",
    ].includes(c.req.path)
  ) {
    return every(boundedBody, sameOrigin)(c, next);
  }
  await next();
}

async function limitAuthApi(c: Context<AppEnv>, next: () => Promise<void>) {
  const path = c.req.path.replace(/\/+$/, "");
  if (c.req.method === "POST" && path !== "/api/auth/sign-out") {
    const limited = await enforceAuthRateLimit(c, c.get("options"), path);
    if (limited) return limited;
  }
  await next();
}

export function signUpPage(c: Context<AppEnv>) {
  if (c.get("appSession")) return c.redirect("/account");
  return renderPage(c, "Sign up", credentialsData({ mode: "sign-up" }));
}

export function signInPage(c: Context<AppEnv>) {
  if (c.get("appSession")) return c.redirect("/account");
  return renderPage(
    c,
    "Sign in",
    credentialsData({
      mode: "sign-in",
      success:
        c.req.query("verified") === "1" && !c.req.query("error")
          ? "Your email is verified. You can now sign in."
          : undefined,
      error: c.req.query("error")
        ? "This verification link is invalid or has expired. Request a new link."
        : undefined,
    }),
  );
}

export function forgotPasswordPage(c: Context<AppEnv>) {
  return renderPage(c, "Forgot password", emailFormData());
}

export function verifyEmailPage(c: Context<AppEnv>) {
  return renderPage(c, "Verify email", emailFormData());
}

export async function requestVerification(c: Context<AppEnv>) {
  const options = c.get("options");
  const form = await readEmail(c);
  if (form.error) {
    return renderPage(c, "Verify email", emailFormData(form), 400);
  }
  const limited = await enforceAuthRateLimit(
    c,
    options,
    "verify-email",
    form.email,
  );
  if (limited) return limited;
  await options.auth.api.sendVerificationEmail({
    body: { email: form.email, callbackURL: "/sign-in?verified=1" },
    headers: c.req.raw.headers,
    asResponse: true,
  });
  return renderPage(c, "Check your email", emailFormData({ sent: true }));
}

export function resetPasswordPage(c: Context<AppEnv>) {
  const token = c.req.query("token") ?? "";
  const invalid = c.req.query("error") === "INVALID_TOKEN" || !token;
  return renderPage(
    c,
    "Reset password",
    resetData({
      token,
      error: invalid
        ? "This password reset link is invalid or has expired."
        : undefined,
    }),
    invalid ? 400 : 200,
  );
}

export async function signUp(c: Context<AppEnv>) {
  const options = c.get("options");
  const form = await readCredentials(c, true);
  if (form.error) {
    return renderPage(
      c,
      "Sign up",
      credentialsData({
        mode: "sign-up",
        error: form.error,
        email: form.email,
      }),
      400,
    );
  }
  const limited = await enforceAuthRateLimit(c, options, "sign-up", form.email);
  if (limited) return limited;

  const response = await options.auth.api.signUpEmail({
    body: {
      email: form.email,
      name: form.name,
      password: form.password,
      callbackURL: "/sign-in?verified=1",
    },
    headers: c.req.raw.headers,
    asResponse: true,
  });
  return authResult(c, response, "sign-up", form.email);
}

export async function signIn(c: Context<AppEnv>) {
  const options = c.get("options");
  const form = await readCredentials(c, false);
  if (form.error) {
    return renderPage(
      c,
      "Sign in",
      credentialsData({
        mode: "sign-in",
        error: form.error,
        email: form.email,
      }),
      400,
    );
  }
  const limited = await enforceAuthRateLimit(c, options, "sign-in", form.email);
  if (limited) return limited;

  const response = await options.auth.api.signInEmail({
    body: {
      email: form.email,
      password: form.password,
      callbackURL: "/sign-in?verified=1",
    },
    headers: c.req.raw.headers,
    asResponse: true,
  });
  return authResult(c, response, "sign-in", form.email);
}

export async function forgotPassword(c: Context<AppEnv>) {
  const options = c.get("options");
  const form = await readEmail(c);
  if (form.error) {
    return renderPage(
      c,
      "Forgot password",
      emailFormData({ email: form.email, error: form.error }),
      400,
    );
  }
  const limited = await enforceAuthRateLimit(
    c,
    options,
    "forgot-password",
    form.email,
  );
  if (limited) return limited;

  await options.auth.api.requestPasswordReset({
    body: { email: form.email, redirectTo: "/reset-password" },
    headers: c.req.raw.headers,
  });
  return renderPage(c, "Check your email", emailFormData({ sent: true }));
}

export async function resetPassword(c: Context<AppEnv>) {
  const options = c.get("options");
  const form = await readResetPassword(c);
  if (form.error) {
    return renderPage(
      c,
      "Reset password",
      resetData({ token: form.token, error: form.error }),
      400,
    );
  }

  const response = await options.auth.api.resetPassword({
    body: { newPassword: form.password, token: form.token },
    headers: c.req.raw.headers,
    asResponse: true,
  });
  return renderPage(
    c,
    "Reset password",
    resetData({
      token: response.ok ? "" : form.token,
      success: response.ok,
      error: response.ok
        ? undefined
        : "This password reset link is invalid or has expired.",
    }),
    response.ok ? 200 : 400,
  );
}

export function accountPage(c: Context<AppEnv>) {
  const current = c.get("appSession");
  if (!current) return c.redirect("/sign-in");
  return renderPage(
    c,
    "Account",
    accountData(current.user, {
      success: c.req.query("passwordChanged") === "1",
    }),
  );
}

export async function changePassword(c: Context<AppEnv>) {
  const options = c.get("options");
  const current = c.get("appSession");
  if (!current) return c.redirect("/sign-in", 303);
  const limited = await enforceAuthRateLimit(
    c,
    options,
    "change-password",
    current.user.email,
  );
  if (limited) return limited;

  const form = await readChangePassword(c);
  if (form.error) {
    return renderPage(
      c,
      "Account",
      accountData(current.user, { error: form.error }),
      400,
    );
  }
  const response = await options.auth.api.changePassword({
    body: {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
      revokeOtherSessions: true,
    },
    headers: c.req.raw.headers,
    asResponse: true,
  });
  if (!response.ok) {
    return renderPage(
      c,
      "Account",
      accountData(current.user, {
        error:
          "The password could not be changed. Check your current password and try again.",
      }),
      400,
    );
  }
  const headers = new Headers(response.headers);
  headers.set("location", "/account?passwordChanged=1");
  return new Response(null, { status: 303, headers });
}

export async function signOut(c: Context<AppEnv>) {
  const options = c.get("options");
  const response = await options.auth.api.signOut({
    headers: c.req.raw.headers,
    asResponse: true,
  });
  const headers = new Headers(response.headers);
  headers.set("location", "/");
  return new Response(null, { status: 303, headers });
}

export function authApi(c: Context<AppEnv>) {
  return c.get("options").auth.handler(c.req.raw);
}

async function enforceAuthRateLimit(
  c: Context,
  options: AppOptions,
  action: string,
  email?: string,
) {
  const result = await checkAuthRateLimit(
    options.authRateLimiter,
    action,
    options.authClientAddress(c.req.raw),
    email,
  );
  if (result.allowed) return;

  if (result.retryAfter) c.header("Retry-After", String(result.retryAfter));
  return c.text("Too many attempts. Try again later.", 429);
}

async function readCredentials(c: Context, includeName: boolean) {
  const body = await c.req.parseBody();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const fields: Array<[string, number]> = [
    [email, 254],
    [password, 128],
  ];
  if (includeName) fields.push([name, 100]);
  const valid = fields.every(([value, maximum]) =>
    Boolean(value.length && value.length <= maximum),
  );
  return {
    email,
    name,
    password,
    error: valid ? undefined : "Check each field and try again.",
  };
}

async function readEmail(c: Context) {
  const body = await c.req.parseBody();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const valid =
    email.length > 0 &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return {
    email,
    error: valid ? undefined : "Enter a valid email address.",
  };
}

async function readResetPassword(c: Context) {
  const body = await c.req.parseBody();
  const password = typeof body.password === "string" ? body.password : "";
  const confirmation =
    typeof body.passwordConfirmation === "string"
      ? body.passwordConfirmation
      : "";
  const token = typeof body.token === "string" ? body.token : "";
  let error: string | undefined;
  if (!token || token.length > 128) {
    error = "This password reset link is invalid or has expired.";
  } else if (password.length < 8 || password.length > 128) {
    error = "Use a password between 8 and 128 characters.";
  } else if (password !== confirmation) {
    error = "The passwords do not match.";
  }
  return { error, password, token };
}

async function readChangePassword(c: Context) {
  const body = await c.req.parseBody();
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmation =
    typeof body.passwordConfirmation === "string"
      ? body.passwordConfirmation
      : "";
  let error: string | undefined;
  if (!currentPassword || currentPassword.length > 128) {
    error = "Enter your current password.";
  } else if (newPassword.length < 8 || newPassword.length > 128) {
    error = "Use a password between 8 and 128 characters.";
  } else if (newPassword !== confirmation) {
    error = "The passwords do not match.";
  }
  return { error, currentPassword, newPassword };
}

async function authResult(
  c: Context<AppEnv>,
  response: Response,
  mode: "sign-in" | "sign-up",
  email: string,
) {
  if (response.ok) {
    if (mode === "sign-up") {
      return renderPage(
        c,
        "Check your email",
        credentialsData({ mode, sent: true, email }),
      );
    }
    const headers = new Headers(response.headers);
    headers.set("location", "/account");
    return new Response(null, { status: 303, headers });
  }
  return renderPage(
    c,
    mode === "sign-up" ? "Sign up" : "Sign in",
    credentialsData({
      mode,
      email,
      error: "The credentials could not be accepted.",
    }),
    400,
  );
}

function credentialsData(options: {
  mode: "sign-in" | "sign-up";
  email?: string;
  error?: string;
  success?: string;
  sent?: boolean;
}) {
  return {
    mode: options.mode,
    email: options.email ?? "",
    error: options.error ?? "",
    success: options.success ?? "",
    sent: options.sent ?? false,
  };
}

function emailFormData(
  options: { email?: string; error?: string; sent?: boolean } = {},
) {
  return {
    email: options.email ?? "",
    error: options.error ?? "",
    sent: options.sent ?? false,
  };
}

function resetData(options: {
  token: string;
  error?: string;
  success?: boolean;
}) {
  return {
    token: options.token,
    error: options.error ?? "",
    success: options.success ?? false,
  };
}

function accountData(
  user: { name: string; email: string },
  options: { error?: string; success?: boolean } = {},
) {
  return {
    user: { name: user.name, email: user.email },
    error: options.error ?? "",
    success: options.success ?? false,
  };
}
