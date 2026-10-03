# Hono dual-runtime starter

A small server-rendered TypeScript starter that runs on Node with SQLite during local development and deploys to Cloudflare Workers with D1. The shared Hono application includes email/password authentication, a protected account page, HTMX and Alpine examples, security defaults, and automated accessibility checks.

## Requirements

- Node.js 24 or newer
- The pnpm version pinned in `package.json` (`packageManager`)
- Chromium for browser tests: `pnpm exec playwright install chromium`

Local development does not require Docker, a database server, or a Cloudflare account.

## Local setup

```sh
pnpm install --frozen-lockfile
node -e "require('node:fs').copyFileSync('.env.example', '.env')"
```

Replace `BETTER_AUTH_SECRET` in `.env` with at least 32 random characters. Generate a value with Node:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

`BETTER_AUTH_URL` and every `TRUSTED_ORIGINS` entry must be an HTTP(S) origin without a path, query, credentials, or fragment. Production requires explicit HTTPS origins, except for localhost previews. Leave `EMAIL_FROM` and `RESEND_API_KEY` empty to print password-reset messages in local development, or set both to send through Resend.

Create the SQLite database and start the application:

```sh
pnpm db:migrate
pnpm dev
```

Open <http://localhost:5173>. Vite runs the Hono Node entry and browser asset server as one process. Route and view edits trigger a page reload. CSS and `resources/js/app.ts` use Vite HMR. Authentication data persists in `data/app.db`, which is ignored by Git.

Node is the development runtime only. Production builds and previews run the actual Cloudflare Worker with D1, not a separate Node server.

## Local Worker preview

Worker preview uses local D1, not `data/app.db`. You do not need a Cloudflare account. Copy the preview settings, fill in `BETTER_AUTH_SECRET` with a newly generated secret, and apply local D1 migrations:

```sh
node -e "require('node:fs').copyFileSync('.dev.vars.example', '.dev.vars')"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
pnpm db:migrate:d1:local
pnpm build
pnpm preview
```

Open <http://127.0.0.1:4174>. Keep both origin settings in `.dev.vars` at exactly that origin. `.dev.vars` overrides the production defaults in `wrangler.jsonc`. `.env` configures Node development and does not replace Worker bindings. Local D1 persists in ignored `.wrangler/` state.

The Worker requires email configuration even in preview. The example has a test-only fake Resend key and sender, so configuration succeeds but email delivery fails. Do not use it to test password-reset delivery. Set your own verified sender and real key only in the ignored `.dev.vars` if you need delivery testing.

## Database workflow

The Better Auth tables live in `src/db/schema.ts`. Drizzle migrations in `drizzle/` are the source of truth for both SQLite and D1.

```sh
pnpm db:generate  # Generate a migration after a schema change
pnpm db:migrate   # Apply pending migrations to DATABASE_PATH
pnpm db:studio    # Inspect the configured local database
pnpm db:reset     # Remove the configured local database and its sidecars
```

Run `pnpm db:migrate` after a reset. Set `DATABASE_PATH` to use another SQLite file. Tests always use disposable databases and never use `data/app.db`.

Enable SQLite foreign keys explicitly on every connection, including scripts and tests. D1 uses the same foreign-key constraints. Rate limiting does not require a database table or migration.

### Better Auth upgrades

Upgrade `better-auth` and `@better-auth/drizzle-adapter` together. Check the proposed version's schema requirements before deployment. Use a temporary config that imports `createAuth()`, not `src/runtime/node.ts`, which opens the development database and reads `.env` at import time.

Create `data/auth-schema-check.ts` (create `data/` first if needed):

```ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { randomBytes } from "node:crypto";
import { createAuth } from "../src/auth/create-auth.js";
import * as schema from "../src/db/schema.js";

const client = new Database(":memory:");
client.pragma("foreign_keys = ON");
const database = drizzle(client, { schema });
migrate(database, { migrationsFolder: "drizzle" });

export const auth = createAuth(database, {
  baseURL: "http://localhost:5173",
  production: false,
  scheduleTask: (promise) => {
    void promise.catch(console.error);
  },
  secret: randomBytes(32).toString("base64"),
  sendEmail: async () => {},
  trustedOrigins: ["http://localhost:5173"],
});
```

Run the version-matched CLI from the repository root. For the currently pinned version:

```sh
pnpm dlx auth@1.7.6 check schema --config data/auth-schema-check.ts
node -e "require('node:fs').unlinkSync('data/auth-schema-check.ts')"
```

Change the CLI version to match an upgraded Better Auth package. This checks the configured schema against a disposable, migrated SQLite database. It does not migrate or verify a live deployment. If changes are required, update `src/db/schema.ts`, generate and review the Drizzle migration, and test it on disposable SQLite and local D1 before planning remote rollout. Do not use the auth CLI to migrate the Drizzle-managed database. Run the CLI only for upgrades. Keep it out of permanent dependencies and `pnpm verify`.

## Application routes

- `/`, `/examples`, and `/health` are public. The health endpoint checks the database and returns `503` with a generic response when it is unavailable.
- `/sign-up`, `/sign-in`, `/forgot-password`, and `/reset-password` provide complete Better Auth email/password authentication.
- `/account` checks the server session on every request and provides sign-out.
- `/api/auth/*` is the Better Auth endpoint.

Health and auth API requests skip application session lookup. Better Auth handles its own API authentication. Successful password resets revoke existing sessions and invalidate the reset token.

The HTMX example has an ordinary form fallback, and the disclosure uses the CSP-compatible build of Alpine.

## Server-rendered views

Routes own HTTP behavior and pass view data to route-level page functions under `src/views/pages/`. Pages compose reusable UI primitives from `src/views/components/` and render inside the document shell in `src/views/layouts/`. Pages may be grouped by product area, as the authentication pages are, while independently reusable primitives have their own named modules.

Keep page-specific helpers private to their page. Add a feature partial only when markup is reused within that feature, and move markup into `components/` only when it is context-free and reusable across features. These `hono/html` functions serve the same role as layouts, views, and partials in template-engine-based server applications.

## Verification

Install Chromium once, then run the complete project verification:

```sh
pnpm exec playwright install chromium
pnpm verify
```

`pnpm verify` runs ESLint, Stylelint, Markdownlint, Prettier check, TypeScript checking, Vitest, Playwright behavior tests, axe checks, Fallow, and finally `pnpm test:worker`. The Worker test runs `pnpm build && tsx scripts/smoke-worker.ts` to build client and Worker output and check the actual Worker with disposable local D1 and test-only configuration. Tests do not send real email.

GitHub Actions runs the same command for every push and pull request using Node 24, the pnpm version from `packageManager`, and Chromium. Dependabot groups weekly npm and GitHub Actions updates with a limit of two open version-update pull requests per ecosystem. GitHub's current support table lists pnpm only through v10, so check update logs for pnpm 11 compatibility and review lockfile changes manually. Dependency updates must pass verification before merging.

Focused commands are also available:

```sh
pnpm lint
pnpm lint:css
pnpm lint:md
pnpm format:check
pnpm typecheck
pnpm test
pnpm test:browser
pnpm test:a11y
pnpm fallow
pnpm test:worker
pnpm build
pnpm preview
```

## Starting a new project

Create a repository with GitHub's **Use this template** action, then clone it. Follow Local setup, run `pnpm verify`, and use Local Worker preview to check the production runtime before configuring deployment.

Before deployment, replace the package name in `package.json`, Worker name and D1 database name/ID in `wrangler.jsonc`, and database names in package scripts and deployment commands. Choose a rate-limit namespace ID unique within your Cloudflare account. Replace starter branding in views and this README, the production domain and trusted origins, and the email sender with your verified sender.

Find committed placeholders and starter names:

```sh
git grep -n -i -E "hono|starter|replace-with|no-reply|1001" -- package.json wrangler.jsonc README.md src
```

Keep the template's example values generic. Put project-specific deployment values in your own repository and secrets only in ignored local files or Worker secrets. Keep `plans/` available for future work, but remove completed template plans.

## Cloudflare D1 and deployment

These steps require a Cloudflare account and Wrangler authentication.

1. Create the D1 database:

   ```sh
   pnpm wrangler d1 create hono-dual-runtime-starter
   ```

2. Replace `replace-with-your-d1-database-id` in `wrangler.jsonc` with the returned ID. Set `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` there to the exact HTTPS production origin. Set `EMAIL_FROM` to a sender on a domain verified by Resend. The `AUTH_RATE_LIMITER` namespace ID must be a positive integer unique within your Cloudflare account. Change the included `1001` if it is already in use.

3. Confirm the migrations against local D1, then apply them remotely:

   ```sh
   pnpm db:migrate:d1:local
   pnpm wrangler d1 migrations apply hono-dual-runtime-starter --remote
   ```

4. Store the production authentication and Resend API secrets as Worker secrets:

   ```sh
   pnpm wrangler secret put BETTER_AUTH_SECRET
   pnpm wrangler secret put RESEND_API_KEY
   ```

5. Build and deploy:

   ```sh
   pnpm deploy
   ```

The Cloudflare Vite plugin emits the deployable Worker and stable `/assets/app.css` and `/assets/app.js` files. Wrangler uses the generated output configuration when deploying after the build.

Local development prints password-reset messages to the terminal unless both `EMAIL_FROM` and `RESEND_API_KEY` are configured. Production requires both values and sends through Resend's HTTP API. The shared application depends only on the injected email sender, so another provider can be substituted at the runtime boundary.

Forms and `/api/auth/*` enforce a 64 KiB request-body limit. Forms require a matching Origin header. Better Auth protects its HTTP API with its own origin and CSRF checks. CSP restricts `base-uri`, `object-src`, and `form-action` as well as script and style sources. Do not disable Better Auth's checks.

Application-owned sign-in, sign-up, and forgot-password forms use email identity and IP rate-limit buckets. Auth API POST requests, except sign-out, use IP and pathname buckets. Cloudflare trusts only `CF-Connecting-IP`. Local Worker requests without that header share a fallback bucket. Node uses a shared development identity and a process-memory limiter, not client-supplied forwarding headers. Cloudflare uses the configured edge Rate Limiting binding (five attempts per bucket per minute). Better Auth's default in-memory API limiter remains a secondary defense within each Worker isolate. Cloudflare limits are approximate and per location, not global quotas. Edge rejections include a conservative `Retry-After: 60`.

Application responses include `X-Request-Id`. Public static assets are served directly by Cloudflare and bypass application middleware. Request completions and uncaught errors produce structured JSON logs with the same ID, without request bodies, headers, email addresses, or query values. Workers Logs are enabled explicitly in `wrangler.jsonc` and are available through the Cloudflare dashboard or `pnpm wrangler tail`.

## Runtime isolation

`src/app.ts`, routes, and views receive authentication and asset details through `createApp()`. `src/runtime/node.ts` is the only application boundary that opens `better-sqlite3`. `src/runtime/cloudflare.ts` is the only boundary that reads D1 and Worker bindings. Both initialize the same Better Auth configuration and shared Drizzle schema. Keep new runtime-specific imports at those boundaries.

Local environment files, databases, Wrangler state, build output, browser reports, traces, and coverage are ignored. Do not put real secrets, account IDs, database IDs, or domains in committed files.

## Agent guidance

See `AGENTS.md`. For work that needs a plan, use the globally installed planning skill and follow its workflow. Do not copy that skill into this repository.
