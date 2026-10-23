import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const cli = join(
  dirname(require.resolve("wrangler/package.json")),
  "wrangler-dist/cli.js",
);

rmSync("data/browser-d1", { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    cli,
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    "dist/ssr/wrangler.json",
    "--persist-to",
    "data/browser-d1",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
  },
);
