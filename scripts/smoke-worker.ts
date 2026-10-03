import assert from "node:assert/strict";
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
  child.stderr.on("data", log);
  const exited = new Promise<number | null>((resolveExit) => {
    child.once("exit", resolveExit);
    child.once("error", (error) => {
      output += String(error);
      resolveExit(1);
    });
  });
  const running = { child, exited };
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
  const deploymentPath = join(root, ".wrangler/deploy/config.json");
  const deployment = JSON.parse(await readFile(deploymentPath, "utf8")) as {
    configPath: string;
  };
  assert.equal(typeof deployment.configPath, "string", "Run pnpm build first");
  const config = resolve(dirname(deploymentPath), deployment.configPath);
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
    RESEND_API_KEY: "re_worker_smoke_fake_not_a_real_key",
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

  async function homepage(signedIn: boolean) {
    const response = await request("/", {
      headers: { "Sec-Fetch-Mode": "navigate" },
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/html/);
    const html = await response.text();
    assert.match(html, /Build server-rendered Hono applications/);
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
    const body = await response.text();
    assert(body.trim().length > 0, `${path} is empty`);
    assert.doesNotMatch(body, /<!doctype html|<html[\s>]/i, path);
  }
  assert.equal((await request("/worker-smoke-missing")).status, 404);
  assert.equal((await request("/assets/worker-smoke-missing.js")).status, 404);

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
    assert.match(await response.text(), /worker-smoke@example\.com/);
  }
  assert.equal((await request("/sign-up")).status, 200);
  // Signup and signin do not send email. Do not exercise password reset here.
  await form("/sign-up", { name: "Worker Smoke", email, password }, "/account");
  assert(cookies.size > 0, "Signup did not set session cookies");
  await account();
  await homepage(true);
  await form("/sign-out", {}, "/");
  const anonymous = await request("/account");
  assert.equal(anonymous.status, 302);
  assert.equal(anonymous.headers.get("location"), "/sign-in");
  await homepage(false);
  assert.equal((await request("/sign-in")).status, 200);
  await form("/sign-in", { email, password }, "/account");
  await account();
  console.log(
    "Worker smoke passed: D1 migrations, health, pages, assets, and auth forms.",
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
