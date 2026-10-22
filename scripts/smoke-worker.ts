import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createEmailVerificationToken } from "better-auth/api";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const cli = join(
  dirname(require.resolve("wrangler/package.json")),
  "wrangler-dist/cli.js",
);
const controller = new AbortController();
const deadline = setTimeout(
  () => controller.abort(new Error("Worker smoke exceeded 120 seconds")),
  120_000,
);
const interrupt = () => controller.abort(new Error("Worker smoke interrupted"));
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
const aborted = new Promise<never>((_, reject) => {
  controller.signal.addEventListener("abort", () =>
    reject(controller.signal.reason),
  );
});
// Keep cancellation handled even while cleanup is running.
void aborted.catch(() => {});
const children: Array<{
  child: ChildProcess;
  exited: Promise<number | null>;
}> = [];
let output = "";
let state: string | undefined;

function wrangler(args: string[]) {
  let stdout = "";
  const child = spawn(process.execPath, [cli, ...args], {
    cwd: root,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      CI: "true",
      WRANGLER_SEND_METRICS: "false",
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
      CLOUDFLARE_INCLUDE_PROCESS_ENV: "false",
    },
  });
  const log = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-16_000);
  };
  child.stdout.on("data", log);
  child.stdout.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", log);
  const exited = new Promise<number | null>((resolveExit) => {
    child.once("exit", resolveExit);
    child.once("error", (error) => {
      output += String(error);
      resolveExit(1);
    });
  });
  const running = { child, exited, stdout: () => stdout };
  children.push(running);
  return running;
}

async function stopWindows(child: ChildProcess) {
  await new Promise<void>((done) => {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      timeout: 3_000,
    });
    killer.once("exit", (code) => {
      if (code !== 0) child.kill("SIGKILL");
      done();
    });
    killer.once("error", () => {
      child.kill("SIGKILL");
      done();
    });
  });
}

async function stopPosix({ child, exited }: (typeof children)[number]) {
  const kill = (signal: NodeJS.Signals) => {
    try {
      process.kill(-child.pid!, signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  };
  kill("SIGTERM");
  if (!(await Promise.race([exited.then(() => true), delay(3_000, false)]))) {
    kill("SIGKILL");
  }
}

async function stop(running: (typeof children)[number]) {
  const { child, exited } = running;
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") await stopWindows(child);
  else await stopPosix(running);
  await Promise.race([exited, delay(3_000)]);
}

try {
  const config = join(root, "dist/ssr/wrangler.json");
  await readFile(config, "utf8");
  const temporaryRoot =
    process.platform === "linux" && existsSync("/tmp/opencode")
      ? "/tmp/opencode"
      : tmpdir();
  state = await mkdtemp(join(temporaryRoot, "worker-smoke-"));
  const envFile = join(state, "empty.env");
  await writeFile(envFile, "");
  // An explicit env file skips .dev.vars; dotenv and process vars are disabled above.
  const common = ["--config", config, "--env-file", envFile];
  const persisted = ["--persist-to", join(state, "d1")];
  const migration = wrangler([
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    ...common,
    ...persisted,
  ]);
  assert.equal(
    await Promise.race([migration.exited, aborted]),
    0,
    "Local D1 migrations failed",
  );

  const schemaQuery =
    "SELECT name, sql FROM sqlite_master WHERE tbl_name IN ('user', 'session', 'account', 'verification') AND sql IS NOT NULL ORDER BY name";
  const schemaCheck = wrangler([
    "d1",
    "execute",
    "DB",
    "--local",
    ...common,
    ...persisted,
    "--json",
    "--command",
    schemaQuery,
  ]);
  assert.equal(await Promise.race([schemaCheck.exited, aborted]), 0);
  const d1Schema = JSON.parse(schemaCheck.stdout()) as Array<{
    results: Array<{ name: string; sql: string }>;
  }>;
  const sqlite = new Database(":memory:");
  try {
    sqlite.pragma("foreign_keys = ON");
    migrate(drizzle(sqlite), { migrationsFolder: join(root, "drizzle") });
    const normalize = (rows: Array<{ name: string; sql: string }>) =>
      rows.map(({ name, sql }) => ({
        name,
        sql: sql.replace(/\s+/g, " ").trim(),
      }));
    assert.deepEqual(
      normalize(d1Schema[0]!.results),
      normalize(
        sqlite.prepare(schemaQuery).all() as Array<{
          name: string;
          sql: string;
        }>,
      ),
      "SQLite and D1 schemas differ",
    );
  } finally {
    sqlite.close();
  }

  const server = createServer();
  await new Promise<void>((done, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", done);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((done, reject) =>
    server.close((error) => (error ? reject(error) : done())),
  );
  const origin = `http://127.0.0.1:${port}`;
  const vars = {
    BETTER_AUTH_SECRET: "worker-smoke-only-secret-not-for-production-123456789",
    BETTER_AUTH_URL: origin,
    TRUSTED_ORIGINS: origin,
    EMAIL_FROM: "Worker Smoke <smoke@example.com>",
  };
  const worker = wrangler([
    "dev",
    "--local",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    ...common,
    ...persisted,
    ...Object.entries(vars).flatMap(([key, value]) => [
      "--var",
      `${key}:${value}`,
    ]),
  ]);
  const cookies = new Map<string, string>();
  function rememberCookie(cookie: string) {
    const pair = cookie.split(";", 1)[0]!;
    const separator = pair.indexOf("=");
    const key = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (!value || /max-age=0(?:;|$)/i.test(cookie)) cookies.delete(key);
    else cookies.set(key, value);
  }
  async function request(
    path: string,
    init: RequestInit = {},
    timeout = 5_000,
  ) {
    const headers = new Headers(init.headers);
    if (cookies.size)
      headers.set(
        "Cookie",
        [...cookies].map(([key, value]) => `${key}=${value}`).join("; "),
      );
    const response = await fetch(`${origin}${path}`, {
      ...init,
      headers,
      redirect: "manual",
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(timeout),
      ]),
    });
    response.headers.getSetCookie().forEach(rememberCookie);
    return response;
  }

  const readyBy = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < readyBy) {
    controller.signal.throwIfAborted();
    assert.equal(worker.child.exitCode, null, "Worker exited before readiness");
    try {
      const health = await request("/health", {}, 1_000);
      assert.equal(health.status, 200);
      assert.match(
        health.headers.get("content-type") ?? "",
        /application\/json/,
      );
      assert.deepEqual(await health.json(), { status: "ok" });
      ready = true;
      break;
    } catch {
      await delay(200, undefined, { signal: controller.signal });
    }
  }
  assert(ready, "Worker did not become healthy within 30 seconds");

  const header = (response: Response, name: string) =>
    response.headers.get(name) ?? "";

  async function homepage(signedIn: boolean) {
    const response = await request("/", {
      headers: { "Sec-Fetch-Mode": "navigate" },
    });
    assert.equal(response.status, 200);
    assert.match(header(response, "content-type"), /text\/html/);
    assert(header(response, "x-request-id"));
    assert.match(
      header(response, "content-security-policy"),
      /form-action 'self'/,
    );
    const html = await response.text();
    assert.match(html, /Build server-rendered Hono applications/);
    assert.match(html, /id="__VOID_PAGE_DATA__"/);
    assert.equal(header(response, "cache-control"), "no-store");
    assert.match(header(response, "vary"), /X-VoidPages/);
    assert.match(html, signedIn ? /href="\/account"/ : /href="\/sign-in"/);
  }
  await homepage(false);
  for (const [path, mime] of [
    ["/assets/app.css", /text\/css/],
    ["/assets/app.js", /(?:application|text)\/javascript/],
  ] as const) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", mime, path);
    assert.equal(
      response.headers.get("x-request-id"),
      null,
      "Static assets ran application middleware",
    );
    const body = await response.text();
    assert(body.trim().length > 0, `${path} is empty`);
    assert.doesNotMatch(body, /<!doctype html|<html[\s>]/i, path);
  }
  assert.equal((await request("/worker-smoke-missing")).status, 404);
  assert.equal((await request("/assets/worker-smoke-missing.js")).status, 404);
  for (const path of [
    "/examples",
    "/verify-email",
    "/forgot-password",
    "/sign-in",
    "/manifest.webmanifest",
  ]) {
    assert.equal((await request(path)).status, 200, path);
  }
  assert.equal((await request("/reset-password")).status, 400);
  assert.equal((await request("/reset-password?token=example")).status, 200);
  for (const path of [
    "/sign-in",
    "/sign-up",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
    "/sign-out",
    "/account/password",
    "/examples/refresh",
  ]) {
    const rejected = await request(path, {
      method: "POST",
      headers: { Origin: "https://other.example" },
      body: "",
    });
    assert.equal(rejected.status, 403, path);
  }
  for (const path of ["/sign-in", "/api/auth/sign-in/email"]) {
    const oversized = await request(path, {
      method: "POST",
      headers: { Origin: origin },
      body: "x".repeat(65_537),
    });
    assert.equal(oversized.status, 413, path);
  }
  const apiOrigin = await request("/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      Origin: "https://other.example",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "blocked@example.com",
      password: "test-password",
    }),
  });
  assert.equal(apiOrigin.status, 403);

  async function form(
    path: string,
    fields: Record<string, string>,
    location: string,
  ) {
    const response = await request(path, {
      method: "POST",
      headers: { Origin: origin },
      body: new URLSearchParams(fields),
    });
    assert.equal(response.status, 303, `${path}: ${await response.text()}`);
    assert.equal(response.headers.get("location"), location, path);
  }
  const email = "worker-smoke@example.com";
  const password = "correct-horse-battery-staple";
  async function account() {
    const response = await request("/account");
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const html = await response.text();
    assert.match(html, /worker-smoke@example\.com/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
    const data = await request("/account", {
      headers: { "X-VoidPages": "true" },
    });
    assert.equal(data.status, 200);
    assert.equal(data.headers.get("cache-control"), "no-store");
    assert.match(data.headers.get("vary") ?? "", /X-VoidPages/);
    const page = (await data.json()) as {
      props: { user: Record<string, unknown> };
      shared: Record<string, unknown>;
    };
    assert.deepEqual(page.props.user, {
      name: "<script>alert(1)</script>",
      email,
    });
    assert.deepEqual(page.shared, { signedIn: true });
  }
  assert.equal((await request("/sign-up")).status, 200);
  const signUp = await request("/sign-up", {
    method: "POST",
    headers: { Origin: origin },
    body: new URLSearchParams({
      name: "<script>alert(1)</script>",
      email,
      password,
    }),
  });
  assert.equal(signUp.status, 200);
  assert.match(await signUp.text(), /Check your email/);
  assert.equal(cookies.size, 0, "Unverified signup created a session");
  const unverified = await request("/sign-in", {
    method: "POST",
    headers: { Origin: origin },
    body: new URLSearchParams({ email, password }),
  });
  assert.equal(unverified.status, 400);
  const emailReadyBy = Date.now() + 5_000;
  while (
    !output.includes("Subject: Verify your email") &&
    Date.now() < emailReadyBy
  ) {
    await delay(100, undefined, { signal: controller.signal });
  }
  assert.match(output, /send_email binding called with MessageBuilder:/);
  assert.match(output, /Subject: Verify your email/);
  assert.doesNotMatch(output, /Transactional email delivery failed\./);
  // Use Better Auth's token generator and the disposable secret, not real email delivery.
  const token = await createEmailVerificationToken(
    vars.BETTER_AUTH_SECRET,
    email,
  );
  const verified = await request(
    `/api/auth/verify-email?token=${token}&callbackURL=${encodeURIComponent("/sign-in?verified=1")}`,
  );
  assert.equal(verified.status, 302);
  assert.equal(verified.headers.get("location"), "/sign-in?verified=1");
  await form("/sign-in", { email, password }, "/account");
  assert(cookies.size > 0, "Signin did not set session cookies");
  await account();
  await homepage(true);
  await form("/sign-out", {}, "/");
  const anonymous = await request("/account");
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.get("location"), "/sign-in");
  const anonymousData = await request("/account", {
    headers: { "X-VoidPages": "true" },
  });
  assert.equal(anonymousData.status, 302);
  assert.equal(anonymousData.headers.get("location"), "/sign-in");
  await homepage(false);
  assert.equal((await request("/sign-in")).status, 200);
  await form("/sign-in", { email, password }, "/account");
  await account();
  for (let attempt = 0; attempt < 6; attempt++) {
    const limited = await request("/api/auth/worker-smoke-rate-limit", {
      method: "POST",
      headers: { Origin: origin },
      body: "",
    });
    assert.equal(limited.status, attempt < 5 ? 404 : 429);
    if (attempt === 5) assert.equal(limited.headers.get("retry-after"), "60");
  }
  console.log(
    "Worker smoke passed: D1 migrations, health, pages, assets, auth forms, and simulated email delivery.",
  );
} catch (error) {
  console.error(output);
  console.error(error);
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  try {
    await Promise.all(children.map(stop));
  } finally {
    if (state) await rm(state, { recursive: true, force: true });
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
}
