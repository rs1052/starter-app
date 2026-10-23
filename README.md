# Void Vue server-rendered starter

A small server-rendered Vue 3 and TypeScript starter using native Void Pages, routes, and middleware on Cloudflare Workers with D1, including local development. It retains Better Auth email/password authentication, a protected account page, progressive-enhancement examples, security defaults, and automated accessibility checks. It does not need Vue Router, a state store, or a second application framework.

Vite+ provides package and runtime management, development/build commands, linting, formatting, and unit tests. Void owns routing, Vue rendering, and Worker build integration. Wrangler deploys the generated Worker without applying migrations. Do not use `void deploy`, `void db`, or `void/auth` in this starter: Drizzle migrations and Better Auth remain application-owned.

## Requirements

- The [Vite+ global CLI](https://viteplus.dev/guide/global-cli), including environment management
- Node.js 24.21.0 from `.node-version` and pnpm from `package.json` (`packageManager`), both managed by Vite+
- Chromium for browser tests: `vp exec playwright install chromium`

Local development does not require Docker, a database server, or a Cloudflare account.

Install Vite+ using its official instructions, enable environment management, and open a new shell. `vp env install` downloads the project's Node.js and pnpm versions; `vp env current` shows the selected versions. The Vite configuration rejects Node versions older than 24.21.0.

Use `vp install`, `vp add`, `vp remove`, and `vp up` for dependencies. Vite+ delegates installation to the pinned pnpm backend, so `pnpm-lock.yaml` and `pnpm-workspace.yaml` remain authoritative. The workspace settings let Vite+ manage runtime/package-manager versions without pnpm switching them independently. Existing release-age restrictions and native-build approvals still apply.

## Local setup

```sh
git config core.hooksPath .githooks
vp env install
vp install --frozen-lockfile
vp run prepare:types
vp node -e "require('node:fs').copyFileSync('config/local.env.example', '.env')"
```

The Git configuration enables this repository's committed hooks for this clone. The pre-commit hook blocks direct commits to `main`.

Replace `BETTER_AUTH_SECRET` in `.env` with at least 32 random characters. Generate a value with Node:

```sh
vp node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

`BETTER_AUTH_URL` and every `TRUSTED_ORIGINS` entry must be an HTTP(S) origin without a path, query, credentials, or fragment. Production requires explicit HTTPS origins, except for localhost previews. During `vp dev`, a missing or blank `EMAIL_FROM` uses `Local <no-reply@example.test>` for simulated email. Preview and production still require an explicit sender. Cloudflare's email binding simulates delivery locally, without an API key or real email delivery.

Build the Worker, apply existing migrations to local D1, and start Void:

```sh
vp run db:migrate
vp dev
```

Open <http://localhost:5173>. Void's Vite and Vue plugins run the actual Worker, Vue SSR, hydration, and browser asset server as one process. Vue components and CSS use Vite HMR. Local D1 persists in ignored `.void/` state. `vp run db:migrate` builds first so Wrangler can read the generated binding configuration.

Development and preview use the same local Workers/D1 runtime. `better-sqlite3` is used only for disposable schema/auth tests and optional SQLite inspection. SQLite files such as `data/app.db` are not imported into D1.

Void supports only a single root `.env`, not `.dev.vars*` or `.env.*` files, including examples. The template therefore lives under `config/`. Existing clones must move any root legacy environment files outside the project and update their local settings. Never commit real values. `env.ts` declares the four application settings; runtime parsing still validates secrets, senders, and origins.

## Local Worker preview

Worker preview uses the same local D1 state as development. You do not need a Cloudflare account. Set `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` in `.env` to exactly `http://127.0.0.1:4174` and set a nonblank `EMAIL_FROM`, such as the template sender, then run:

```sh
vp run db:migrate:d1:local
vp run preview
```

Open <http://127.0.0.1:4174>. Preview reads the local settings captured during the build; changing only its process environment does not replace those values. Rebuild after changing settings. Restore both origin settings to `http://localhost:5173` before returning to `vp dev`. Preview serves Void's generated `dist/ssr` Worker and `dist/client` assets, not a Node server. Build output can contain ignored local secret files for preview. Do not publish build directories as public artifacts.

The Worker requires `EMAIL_FROM` and the `EMAIL` binding in development and preview, but no email API key. The binding simulates delivery locally: emails are not sent, and the runtime logs the message details and paths to saved message content. Open the saved verification or password-reset message and follow its link to test the account lifecycle manually. Automated tests use disposable verification tokens generated by Better Auth; the Worker smoke test also checks simulated email delivery. Keep the email binding local (do not set `remote: true`) to avoid sending real emails during development, preview, or tests.

## Database workflow

The Better Auth tables live in `src/db/schema.ts`. Drizzle migrations in `drizzle/` are the source of truth for both SQLite and D1.

```sh
vp run db:generate  # Generate a migration after a schema change
vp run db:migrate   # Build, then apply pending migrations to local D1
vp run db:migrate:sqlite # Optional SQLite schema check at DATABASE_PATH
vp run db:studio    # Optional SQLite inspection, not the local D1 database
vp run db:reset:sqlite # Remove only the optional SQLite file and its sidecars
```

Set `DATABASE_PATH` for the optional SQLite commands (default `data/app.db`). Tests always use disposable databases. Browser tests use `data/browser-d1`; Worker smoke tests use temporary local D1 state, compare the migrated auth tables and indexes with disposable SQLite, and remove their state afterward.

Keep the existing `drizzle/` filenames and Wrangler's `d1_migrations` tracking table unchanged. Do not copy historical SQL to `db/migrations/`, run `void db`, or enable Void-managed auth. Void's conventional migration directory is intentionally absent. `vp run deploy` uploads code only; remote migrations are a separate, reviewed command.

Enable SQLite foreign keys explicitly on every connection, including scripts and tests. D1 uses the same foreign-key constraints. Rate limiting does not require a database table or migration.

### Better Auth upgrades

Upgrade `better-auth`, `@better-auth/core`, and `@better-auth/drizzle-adapter` together. The explicit core pin keeps the adapter's peer dependency aligned rather than resolving Void's newer auth version. Check the proposed version's schema requirements before deployment. Use a temporary config that imports `createAuth()` and a disposable SQLite database.

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
vp dlx auth@1.7.6 check schema --config data/auth-schema-check.ts
vp node -e "require('node:fs').unlinkSync('data/auth-schema-check.ts')"
```

Change the CLI version to match an upgraded Better Auth package. This checks the configured schema against a disposable, migrated SQLite database. It does not migrate or verify a live deployment. If changes are required, update `src/db/schema.ts`, generate and review the Drizzle migration, and test it on disposable SQLite and local D1 before planning remote rollout. Do not use the auth CLI to migrate the Drizzle-managed database. Run the CLI only for upgrades. Keep it out of permanent dependencies and `vp run verify`.

## Application routes

- `/`, `/examples`, and `/health` are public. The health endpoint checks the database and returns `503` with a generic response when it is unavailable.
- `/sign-up` creates an unverified account and shows a check-email state. `/sign-in` requires verified email ownership. Verification links expire after one hour and return to sign-in without creating a session.
- `/verify-email` requests another verification email with a generic response. An unverified sign-in attempt also sends a new link.
- `/forgot-password` and `/reset-password` provide password recovery.
- `/account` checks the server session on every request and provides sign-out and password changes through `POST /account/password`. Changes require the current password, revoke other sessions, and rotate the current session cookie so the user stays signed in.
- `/api/auth/*` is the Better Auth endpoint.

Health and auth API requests skip application session lookup. Better Auth handles its own API authentication. Page requests forward renewed session cookies, while cookies set by sign-in, sign-out, or password changes take precedence over renewal. Successful password resets revoke existing sessions and invalidate the reset token. HEAD requests preserve GET status and redirects without a response body.

The Vue refresh example has an ordinary form fallback. The native HTML disclosure works with keyboard input and without JavaScript. Authentication forms use ordinary full-document submissions, including validation errors, so sign-in and sign-out do not depend on client-side session state.

## Vue Pages and server boundaries

Add rendered pages under `pages/`, for example `pages/about.vue` for `/about` or `pages/account/index.vue` for `/account`. `pages/layout.vue` supplies the shared shell. Reusable components live under `src/components/` only when actually reused. Keep existing CSS and design tokens under `resources/css/`.

Add a companion `.server.ts` only when a page needs server data, authorization, an action, or head metadata. Native Void `loader`, `action`, and `head` exports use the existing Hono request context. Current companions use `pageLoader`, `pageAction`, and `pageHead` from `src/http/page.ts` to adapt existing handlers. Handlers prepare public data, responses, and redirects; Vue renders that data. The small status bridge in application middleware preserves HTTP 400 validation pages and 404 pages because Void 1.2.0 otherwise reconstructs rendered responses as 200.

Keep API, health, and non-page endpoints under native `routes/`. Do not add a GET route that shadows a Vue page, or a native wildcard that shadows all Pages. `src/routes/` continues to own parsing, validation, auth calls, and HTTP behavior. `middleware/01.application.ts` composes request IDs, logging, headers, dependencies, session lookup, and protections. `src/app.ts` is an in-process backend test harness; it exposes prepared page data as JSON. Browser and Worker tests verify actual rendered HTML and escaping.

Never import auth, database, or runtime modules into Vue components. Authenticate every protected loader/action on the server, including `X-VoidPages` data requests. Only explicit UI fields and a signed-in navigation boolean reach the browser. Session tokens, password hashes, and complete session records never become page props. The reset page alone retains its short-lived reset token from the reset URL/form so ordinary validation retries keep working. Page responses use `Cache-Control: no-store` and vary on `X-VoidPages`.

Keep ordinary forms for auth mutations. Use local Vue state for small interactions and native disclosure elements when sufficient. Avoid Vue Router, Pinia, generic composables/stores, or a component/CSS framework without a concrete need. Do not use deferred SSR under the current strict CSP because its executable inline scripts require a separate security design. `AGENTS.md` has detailed placement rules.

Navigation uses ordinary links with native Pages SSR and browser history. The adapter's current `Link` emits inline styles incompatible with this starter's CSP; no custom client router replaces it. CSS is a separate Vite entry served by an external stylesheet link, preserving styled SSR and no-JavaScript pages without allowing inline styles.

## PWA installability

The starter includes a hand-written web app manifest at `public/manifest.webmanifest` and install icons in `public/icons/`. Supporting browsers can install the application when served over HTTPS (or localhost during development). Install options vary by browser.

No service worker is registered, and the starter does not provide offline support. Design offline behavior per project because authentication, writes, synchronization, and caching policies depend on the application.

The starter icons use a white plus on a solid slate background. Replace all four PNG files with your own branding. Keep the declared sizes and place the maskable mark inside the central safe circle (radius 40% of the image width).

## Verification

Install Chromium once, then run the complete project verification:

```sh
vp exec playwright install chromium
vp run verify
```

`vp run verify` prepares Void types, then runs Vite+'s Oxlint and ESLint, Stylelint, Markdownlint, Vite+'s Oxfmt check, Vue-aware TypeScript checking (`vue-tsc --noEmit`), Vite+'s Vitest, Playwright behavior tests, axe checks, Fallow, and finally `vp run test:worker`. Standalone type checking also runs `void prepare`. Browser-test scripts build the Worker and apply migrations to disposable local D1. The Worker test builds Void output and checks actual Vue SSR, assets, private page data, escaping, origin/body protections, headers, session renewal, HEAD responses, rate limiting, schema parity, and simulated email with disposable local D1. Tests do not send real email. Set `CHROMIUM_PATH` to use an installed Chromium instead of Playwright's download.

Use `vp run <name>` for package scripts. Built-in commands such as `vp dev`, `vp build`, and `vp test` do not run same-named scripts. In particular, `vp run test` selects the isolated `vitest.config.ts`, keeping unit tests independent of the application's Void/Cloudflare plugins. `vp check` runs Vite+'s format and lint checks only in this project; it does not replace `vp run verify`, ESLint, or `vue-tsc`. Package scripts are uncached. Database, browser, and Worker workflows do not use cached tasks.

The four TypeScript scripts inherit Vite+'s managed Node through `vp run` and use native type stripping, not a separate TypeScript loader. Scripts invoke `node` directly because `vp node` is a global-CLI command, unavailable through the project-local `vp` binary on their PATH. Keep them compatible with erasable TypeScript and ordinary Node module resolution. Native SQLite build approval remains enabled because tests and optional inspection commands use `better-sqlite3`.

### Linting and formatting Vue

`vp run lint` runs Vite+'s Oxlint for JavaScript, TypeScript, and Vue script blocks, followed by ESLint for the existing TypeScript recommended checks, type-aware promise checks, and Vue essential template rules. Both `no-floating-promises` and `no-misused-promises` apply to TypeScript and Vue scripts. ESLint remains because [Oxlint's Vue support](https://oxc.rs/docs/guide/usage/linter.html) is script-only and its [type-aware engine](https://oxc.rs/docs/guide/usage/linter/type-aware.html) requires TypeScript 7; this starter uses TypeScript 6 and `vue-tsc`. Vite+'s integrated type-aware linting and type checking are therefore disabled.

`vp run format` and `vp run format:check` use Vite+'s Oxfmt, including `.vue` files, TypeScript, CSS, JSON, YAML, and Markdown. [Vue formatting](https://oxc.rs/docs/guide/usage/formatter/language-support.html) uses Oxfmt's bundled Prettier integration, with native formatting for embedded JavaScript/TypeScript. No standalone Prettier dependency is needed. The `fmt` block in `vite.config.ts` retains the existing 80-column width and excludes the generated foundation tokens; its `lint` block owns Oxlint settings. Oxfmt also respects Git ignores and skips lockfiles. Stylelint and Markdownlint retain their focused correctness checks.

Void 1.2.0 requires Wrangler 4.151 or newer and the same Hono version for compatible context types. Vite+ 1.3.0 bundles Vite 8.3.4 and Vitest 5.0.5. The workspace overrides align these dependencies; exact peer-version allowances account for the Vite core alias reporting version 1.3.0 to the evaluated plugins. Narrow release-age exceptions cover the evaluated Void release and its new packages; they do not disable the release-age policy globally.

GitHub Actions uses `voidzero-dev/setup-vp` to select the pinned Vite+ toolchain, Node from `.node-version`, and pnpm from `packageManager`, then performs a frozen install and runs the same verification command with Chromium. Dependabot groups weekly npm and GitHub Actions updates with a limit of two open version-update pull requests per ecosystem. GitHub's current support table lists pnpm only through v10, so check update logs for pnpm 11 compatibility and review lockfile changes manually. Dependency updates must pass verification before merging.

Focused commands are also available:

```sh
vp run lint
vp run lint:css
vp run lint:md
vp run format:check
vp run typecheck
vp run test
vp run test:browser
vp run test:a11y
vp run fallow
vp run test:worker
vp build
vp run preview
```

## Starting a new project

Create a repository with GitHub's **Use this template** action, then clone it. Follow Local setup, run `vp run verify`, and use Local Worker preview to check the production runtime before configuring deployment.

Before deployment, replace the package name in `package.json` and Worker name and D1 database name/ID in `void.config.ts`. Choose a rate-limit namespace ID unique within your Cloudflare account. Replace starter branding in `pages/` and this README, and configure the production domain, trusted origins, and verified email sender as Worker secrets. Test first with a new staging Worker and disposable D1 database, not the production Worker.

The `hono-dual-runtime-starter` Worker and database names are retained deployment identifiers, not the application stack. Choose new names for a new project, but do not rename resources belonging to an existing deployment as part of a branding change.

Replace the manifest's `name`, `short_name`, `description`, `theme_color`, and `background_color`, all starter icons in `public/icons/`, and the `theme-color` metadata in `void.config.ts`.

Find committed placeholders and starter names:

```sh
git grep -n -i -E "starter|replace-with|no-reply|1001" -- package.json void.config.ts README.md pages src public
```

Keep the template's example values generic. Put project-specific deployment values in your own repository and secrets only in ignored local files or Worker secrets. Completed template plans have been removed; Git history retains the migration decisions.

## Cloudflare D1 and deployment

These steps require a Cloudflare account and Wrangler authentication. Production transactional email uses [Cloudflare Email Sending](https://developers.cloudflare.com/email-service/get-started/send-emails/), which requires a Workers Paid plan and Cloudflare DNS. Enable Email Sending and onboard your sender domain under **Compute > Email Service > Email Sending** in the Cloudflare dashboard. Email Routing alone does not enable transactional delivery to arbitrary users.

1. Create the D1 database:

   ```sh
   vp exec wrangler d1 create hono-dual-runtime-starter
   ```

2. Replace `replace-with-your-d1-database-id` in `void.config.ts` with the returned ID. Keep the configured `EMAIL` send binding. The `AUTH_RATE_LIMITER` namespace ID must be a positive integer unique within your Cloudflare account. Change the included `1001` if it is already in use. Build to materialize the Wrangler configuration:

   ```sh
   vp build
   ```

3. Confirm the migrations against local D1, then apply them remotely:

   ```sh
   vp run db:migrate:d1:local
   vp exec wrangler d1 migrations apply DB --config dist/ssr/wrangler.json --remote
   ```

4. Store the production settings as Worker secrets. Void's environment schema forbids these server keys in plaintext `vars`, including the non-sensitive origin/sender settings. Set the URLs to the exact HTTPS production origin, `EMAIL_FROM` to an onboarded sender, and the auth secret to at least 32 random characters. Existing installations must review conversion of any same-named plaintext settings before rollout. The native email binding does not need an email API key:

   ```sh
   vp exec wrangler secret put BETTER_AUTH_SECRET --config dist/ssr/wrangler.json
   vp exec wrangler secret put BETTER_AUTH_URL --config dist/ssr/wrangler.json
   vp exec wrangler secret put TRUSTED_ORIGINS --config dist/ssr/wrangler.json
   vp exec wrangler secret put EMAIL_FROM --config dist/ssr/wrangler.json
   ```

5. Build and deploy:

   ```sh
   vp run deploy
   ```

Void's Vite plugin emits `dist/ssr/wrangler.json`, the deployable Worker, and stable `/assets/app.css` and `/assets/app.js` files. The deploy script explicitly selects that configuration. It does not provision resources or apply migrations. Do not use `void init`, `void connect`, or `void deploy` against an existing production Worker for this workflow. `void.lock.json` is ignored because this starter does not use Void provisioning; reviewed resource IDs live in `void.config.ts`.

Development, preview, and production use `EMAIL_FROM` and the native Cloudflare `EMAIL` binding. Delivery is simulated locally. Auth email delivery runs through the Worker execution context in background tasks, with generic failure logs that omit recipients and links. The native binding has no application-level timeout, cancellation, or retries. The provider-neutral `EmailMessage` and `SendEmail` contracts keep authentication and message content independent of delivery.

After deployment, confirm receipt of a verification email, verify the account, and confirm receipt of a password-reset email and completion of the reset flow. Local simulated delivery does not verify production credentials, domain setup, or deliverability.

Forms and `/api/auth/*` enforce a 64 KiB request-body limit. Forms require a matching Origin header. Better Auth protects its HTTP API with its own origin and CSRF checks. CSP restricts `base-uri`, `object-src`, and `form-action` as well as script and style sources. Do not disable Better Auth's checks.

Application-owned sign-in, sign-up, forgot-password, resend-verification, and change-password forms use action-specific email identity and IP rate-limit buckets. Password changes use the authenticated user's email, not form input. Auth API POST requests, except sign-out, use IP and pathname buckets. Cloudflare trusts only `CF-Connecting-IP`. Local Worker requests without that header share a fallback bucket. Cloudflare uses the configured edge Rate Limiting binding (five attempts per bucket per minute), including local simulation. Better Auth's default in-memory API limiter remains a secondary defense within each Worker isolate. Cloudflare limits are approximate and per location, not global quotas. Edge rejections include a conservative `Retry-After: 60`.

Application responses include `X-Request-Id`. Public static assets bypass application middleware. Request completions and uncaught errors produce structured JSON logs with the same ID, without request bodies, headers, email addresses, or query values. Workers Logs are enabled explicitly in `void.config.ts` and are available through the Cloudflare dashboard or `vp exec wrangler tail --config dist/ssr/wrangler.json`. Void reserves `/__void` for internal tooling. Its public `/__void/ready` endpoint returns runtime readiness without application headers or logs; it does not check D1. Use `/health` for application/database readiness. No Void-managed authentication or schema-writing migration routes are enabled by this application.

The application boundary also replaces framework-handled rendering failures with a generic, no-store 500 response containing the request reference. Void 1.2.0 can log the original renderer exception before this boundary runs, even in production. Application log sanitization does not redact that upstream log. Keep secrets out of thrown error messages and restrict access to Worker logs; complete framework-log redaction requires an upstream change.

### Production checklist

Before deployment, run `vp run verify`. For schema changes, review generated migrations and test them against disposable SQLite (`vp run test`) and local D1 (`vp run db:migrate:d1:local`). Prefer backward-compatible changes so both the old and new application can use the schema during rollout. `vp run deploy` builds and deploys code only. It does not run production migrations. Review `vp exec wrangler deploy --config dist/ssr/wrangler.json --dry-run` before the first staging deployment.

For backward-compatible schema changes:

1. Build, then apply the reviewed remote migration with `vp exec wrangler d1 migrations apply DB --config dist/ssr/wrangler.json --remote`.
2. Deploy compatible application code with `vp run deploy`. For incompatible changes, plan a staged rollout instead of applying this order blindly. Remove obsolete columns only after the code no longer uses them.
3. Check `/health` on the production origin.
4. Smoke-test the changed critical path.

For code-only changes:

1. Run `vp run verify`.
2. Run `vp run deploy`.
3. Check `/health` on the production origin.
4. Smoke-test the changed behavior.

### Database recovery

Recover the production database with [D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/). It retains recovery points for seven days on Workers Free and 30 days on Workers Paid. These commands target remote D1, not local SQLite or local D1.

Find the current bookmark, or look up a bookmark for a UTC timestamp within your plan's retention window:

```sh
vp exec wrangler d1 time-travel info hono-dual-runtime-starter
vp exec wrangler d1 time-travel info hono-dual-runtime-starter --timestamp="YYYY-MM-DDTHH:MM:SSZ"
```

Restore using the chosen bookmark or timestamp, not both:

```sh
vp exec wrangler d1 time-travel restore hono-dual-runtime-starter --bookmark="BOOKMARK"
vp exec wrangler d1 time-travel restore hono-dual-runtime-starter --timestamp="YYYY-MM-DDTHH:MM:SSZ"
```

Restore overwrites the live database and cancels in-flight queries and transactions. Plan for request failures and loss of writes made after the chosen recovery point. Confirm the deployed code is compatible with the restored schema, then check `/health` and the affected critical path.

Save the previous bookmark printed by the restore. It lets you undo the restore, within the retention window:

```sh
vp exec wrangler d1 time-travel restore hono-dual-runtime-starter --bookmark="PREVIOUS_BOOKMARK"
```

### Production debugging

Use [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) to find structured `request.completed` and `request.error` events. Ask users for the `X-Request-Id` response header and filter logs by the matching `requestId` field. Expand that invocation to inspect related server logs. Stored logs depend on retention, sampling, and platform limits.

Use [Workers Issues](https://developers.cloudflare.com/workers/observability/issues/) if enabled and available to group production failures. It is optional and not enabled by this starter. `/health` checks application and database readiness, not email delivery or every user flow. Keep post-deployment smoke tests focused on the changed critical path.

## Architecture and rollback

Void generates the Worker and registers native `routes/` and `middleware/`. Vue Pages owns SSR and hydration; no separate client bootstrap or Node production server is required.

- `pages/` owns rendered pages and their thin server companions.
- `routes/` owns native API, health, and non-page endpoints.
- `middleware/` composes runtime initialization and request protections.
- `src/routes/` owns validation, authorization, authentication calls, and prepared page data.
- `src/auth/`, `src/db/`, and `src/email/` own authentication configuration, shared database schema, and email contracts.
- `src/runtime/cloudflare.ts` constructs request-scoped D1, Better Auth, rate limiting, and email dependencies.
- `src/http/` and `src/middleware/` own shared response and request infrastructure.
- `src/components/` and `resources/css/` own reused Vue UI and styles.
- `src/app.ts` and route-registration helpers provide the in-process backend test harness, not a second application server.

Hono contexts are part of Void's native request model. Keep runtime-specific dependencies at the Cloudflare boundary and share only prepared public UI fields with Vue.

For a code-only rollback, select the previous Worker version with Cloudflare's deployment rollback tools. Do not restore D1 for a code-only rollback. Confirm the old version is compatible with current settings and schema, then check health and account flows. Schema changes need their own recovery plan. Void's rollback CLI is not used because deployment ownership remains with Wrangler.

Local environment files, databases, Wrangler state, build output, browser reports, traces, and coverage are ignored. Do not put real secrets, account IDs, database IDs, or domains in committed files.

## Agent guidance

See `AGENTS.md`. For work that needs a plan, use the globally installed planning skill and follow its workflow. Do not copy that skill into this repository.
