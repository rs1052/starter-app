import type { Context } from "hono";
import type { App, AppEnv, AppOptions } from "../app-types.js";
import { checkAuthRateLimit } from "../auth/rate-limit.js";
import { renderPage } from "../http/page.js";
import { boundedBody, sameOrigin } from "../middleware/request-security.js";
import { AccountPage } from "../views/pages/account.js";
import { CredentialsPage } from "../views/pages/auth/credentials.js";
import { ForgotPasswordPage } from "../views/pages/auth/forgot-password.js";
import { ResetPasswordPage } from "../views/pages/auth/reset-password.js";
import { VerifyEmailPage } from "../views/pages/auth/verify-email.js";
import type { PageAssetPaths } from "../views/layouts/app.js";

export function registerAuthRoutes(app: App, options: AppOptions) {
  app.use("/api/auth/*", boundedBody);
  app.use("/api/auth/*", async (c, next) => {
    const path = c.req.path.replace(/\/+$/, "");
    if (c.req.method === "POST" && path !== "/api/auth/sign-out") {
      const limited = await enforceAuthRateLimit(c, options, path);
      if (limited) return limited;
    }
    await next();
  });
  for (const path of [
    "/sign-up",
    "/sign-in",
    "/sign-out",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/account/password",
  ]) {
    app.use(path, boundedBody);
    app.use(path, sameOrigin);
  }

  app.get("/sign-up", (c) => {
    if (c.get("session")) return c.redirect("/account");
    return renderPage(
      c,
      options.assets,
      "Sign up",
      CredentialsPage({ mode: "sign-up" }),
    );
  });

  app.get("/sign-in", (c) => {
    if (c.get("session")) return c.redirect("/account");
    return renderPage(
      c,
      options.assets,
      "Sign in",
      CredentialsPage({
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
  });

  app.get("/forgot-password", (c) =>
    renderPage(c, options.assets, "Forgot password", ForgotPasswordPage()),
  );

  app.get("/verify-email", (c) =>
    renderPage(c, options.assets, "Verify email", VerifyEmailPage()),
  );

  app.post("/verify-email", async (c) => {
    const form = await readEmail(c);
    if (form.error) {
      return renderPage(
        c,
        options.assets,
        "Verify email",
        VerifyEmailPage(form),
        400,
      );
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
    return renderPage(
      c,
      options.assets,
      "Check your email",
      VerifyEmailPage({ sent: true }),
    );
  });

  app.get("/reset-password", (c) => {
    const token = c.req.query("token") ?? "";
    const invalid = c.req.query("error") === "INVALID_TOKEN" || !token;
    return renderPage(
      c,
      options.assets,
      "Reset password",
      ResetPasswordPage({
        token,
        error: invalid
          ? "This password reset link is invalid or has expired."
          : undefined,
      }),
      invalid ? 400 : 200,
    );
  });

  app.post("/sign-up", async (c) => {
    const form = await readCredentials(c, true);
    if (form.error) {
      return renderPage(
        c,
        options.assets,
        "Sign up",
        CredentialsPage({
          mode: "sign-up",
          error: form.error,
          email: form.email,
        }),
        400,
      );
    }
    const limited = await enforceAuthRateLimit(
      c,
      options,
      "sign-up",
      form.email,
    );
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
    return authResult(c, response, options.assets, "sign-up", form.email);
  });

  app.post("/sign-in", async (c) => {
    const form = await readCredentials(c, false);
    if (form.error) {
      return renderPage(
        c,
        options.assets,
        "Sign in",
        CredentialsPage({
          mode: "sign-in",
          error: form.error,
          email: form.email,
        }),
        400,
      );
    }
    const limited = await enforceAuthRateLimit(
      c,
      options,
      "sign-in",
      form.email,
    );
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
    return authResult(c, response, options.assets, "sign-in", form.email);
  });

  app.post("/forgot-password", async (c) => {
    const form = await readEmail(c);
    if (form.error) {
      return renderPage(
        c,
        options.assets,
        "Forgot password",
        ForgotPasswordPage({ email: form.email, error: form.error }),
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
    return renderPage(
      c,
      options.assets,
      "Check your email",
      ForgotPasswordPage({ sent: true }),
    );
  });

  app.post("/reset-password", async (c) => {
    const form = await readResetPassword(c);
    if (form.error) {
      return renderPage(
        c,
        options.assets,
        "Reset password",
        ResetPasswordPage({ token: form.token, error: form.error }),
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
      options.assets,
      "Reset password",
      ResetPasswordPage({
        token: response.ok ? "" : form.token,
        success: response.ok,
        error: response.ok
          ? undefined
          : "This password reset link is invalid or has expired.",
      }),
      response.ok ? 200 : 400,
    );
  });

  app.get("/account", (c) => {
    const current = c.get("session");
    if (!current) return c.redirect("/sign-in");
    return renderPage(
      c,
      options.assets,
      "Account",
      AccountPage(current.user, {
        success: c.req.query("passwordChanged") === "1",
      }),
    );
  });

  app.post("/account/password", async (c) => {
    const current = c.get("session");
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
        options.assets,
        "Account",
        AccountPage(current.user, { error: form.error }),
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
        options.assets,
        "Account",
        AccountPage(current.user, {
          error:
            "The password could not be changed. Check your current password and try again.",
        }),
        400,
      );
    }
    const headers = new Headers(response.headers);
    headers.set("location", "/account?passwordChanged=1");
    return new Response(null, { status: 303, headers });
  });

  app.post("/sign-out", async (c) => {
    const response = await options.auth.api.signOut({
      headers: c.req.raw.headers,
      asResponse: true,
    });
    const headers = new Headers(response.headers);
    headers.set("location", "/");
    return new Response(null, { status: 303, headers });
  });

  app.on(["GET", "POST"], "/api/auth/*", (c) =>
    options.auth.handler(c.req.raw),
  );
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
  assets: PageAssetPaths,
  mode: "sign-in" | "sign-up",
  email: string,
) {
  if (response.ok) {
    if (mode === "sign-up") {
      return renderPage(
        c,
        assets,
        "Check your email",
        VerifyEmailPage({ sent: true, email }),
      );
    }
    const headers = new Headers(response.headers);
    headers.set("location", "/account");
    return new Response(null, { status: 303, headers });
  }
  return renderPage(
    c,
    assets,
    mode === "sign-up" ? "Sign up" : "Sign in",
    CredentialsPage({
      mode,
      email,
      error: "The credentials could not be accepted.",
    }),
    400,
  );
}
