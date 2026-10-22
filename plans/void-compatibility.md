# Void migration compatibility assessment

## Status and scope

The initial assessment stopped before application restructuring. The user then
approved investigating Void routing/runtime with Wrangler code-only deployment,
and subsequently approved local Workers/D1 development. Local implementation and
verification passed on `feat/void-foundation`; live staging remains unverified.
The initial working tree was clean.

- Goal: determine whether native Void can meet the approved migration constraints.
- Preserve: application code, security controls, database history, development
  workflow, and all production resources.
- Acceptance: document any incompatible requirement and stop rather than silently
  weakening it. This assessment is not a completed migration.

## Blocking deployment conflict

The evaluated published release is `void@1.2.0`, requiring Node >=24.21.0 and Vite 8. The package archive was extracted outside the repository under
`/tmp/opencode/void-assessment`; it was not added to project dependencies.

The requested workflow forbids automatic remote migrations and keeps existing
Drizzle migrations authoritative. Void's native deployment command automatically
applies pending remote migrations. Its published deployment options expose no
supported migration-disable switch.

Evidence from the release's bundled documentation and implementation:

- [Deployment](https://void.cloud/guide/deployment#migrations) says deployment
  applies pending SQL migrations.
- [Deployment CLI](https://void.cloud/reference/cli/deploy) documents the available
  flags. `--skip-build` is not a migration opt-out and is unavailable for Worker
  apps.
- Published `dist/deploy-7H32EnUs.mjs`, `buildCloudflareWorker`, prepares a D1
  migration target when migrations exist. `migrateCloudflareWorker` then calls
  `applyAndVerifyRemoteD1Migrations` before artifact verification/publication.
- [Cloudflare integration](https://void.cloud/integrations/cloudflare) supports
  custom migration directories, tables, and patterns. That does not disable
  deployment migrations or establish compatibility with this project's applied
  history.

Do not hide the migration directory, delete migration history, or treat an empty
pending set as a permanent safeguard against future automatic migration execution.
No deployment, remote migration, resource provisioning, secret modification, or
production Worker linking was performed.

Required decision before continuing:

1. Approve investigating Void routing/runtime with Wrangler code-only deployment
   and separately invoked existing D1 migrations. This changes the native Void
   deployment-tooling objective and is not yet proven compatible.
2. Alternatively, retain the strict native deployment objective and wait for a
   supported Void migration opt-out. Relaxing the migration policy would require
   explicit approval and a separately verified history/baseline strategy.

## Other compatibility findings, not runtime proof

- [Native server routes](https://void.cloud/guide/server-routing) receive Hono
  contexts and can return explicit responses. Existing `hono/html` views can use
  `c.html(...)`; do not return the HTML template object directly, because Void's
  response adapter can serialize objects as JSON.
- Global middleware can use existing Hono middleware through `middleware/` files.
  Reserved `/__void` paths need a security review during a future proof of concept.
- `c.env.DB` supports direct D1 access without `void/db` or `void/auth`.
  Cloudflare configuration accepts binding pass-through, but this assessment has
  not demonstrated `EMAIL`, `AUTH_RATE_LIMITER`, or execution-context background
  delivery in a running native Void Worker.
- Void migrates root Wrangler configuration into `void.config.ts`,
  `void.lock.json`, and generated configuration. Keeping `wrangler.jsonc` unchanged
  as the authoritative configuration is not its documented deployment workflow.
- [Node targets](https://void.cloud/integrations/nodejs-bun-deno) exist, but a
  Node/SQLite development target combined with Cloudflare build/preview requires
  target-specific wiring. Local Workers with D1 are the simpler documented Void
  workflow. Switching to that workflow requires approval; `src/runtime/node.ts`
  and `better-sqlite3` remain untouched.

The original assessment did not run `void init` or a runtime proof of concept.
Those checks were subsequently performed after approval, as recorded below.
No UI framework or Void-managed authentication was introduced.

## Existing public HTTP contract

This inventory is based on `src/routes/` and middleware, not a migrated runtime.
GET routes also receive Hono's normal HEAD handling. Unmatched routes render 404;
uncaught application errors return a generic 500 with a request reference.

| URL                 | Methods   | Existing behavior                                                                                                                           |
| ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | GET       | Public HTML, 200.                                                                                                                           |
| `/health`           | GET       | Public JSON, 200 or generic 503 on failed database check; no session lookup.                                                                |
| `/examples`         | GET       | Public HTML, 200; `updated=1` selects success state.                                                                                        |
| `/examples/refresh` | POST      | Public; HTMX HTML fragment 200, otherwise 303 to `/examples?updated=1`.                                                                     |
| `/sign-up`          | GET, POST | GET 200 or signed-in 302 to `/account`; POST check-email HTML 200 or invalid/rejected 400.                                                  |
| `/sign-in`          | GET, POST | GET 200 or signed-in 302 to `/account`; verified sign-in POST 303 to `/account` with auth headers, invalid/rejected 400.                    |
| `/verify-email`     | GET, POST | Public; GET 200; POST generic check-email 200 or validation 400.                                                                            |
| `/forgot-password`  | GET, POST | Public; GET 200; POST generic check-email 200 or validation 400.                                                                            |
| `/reset-password`   | GET, POST | Public; GET 200 with token or 400 without/invalid token; POST success 200 or invalid form/reset 400.                                        |
| `/account`          | GET       | Authenticated HTML 200; otherwise 302 to `/sign-in`.                                                                                        |
| `/account/password` | POST      | Authenticated; otherwise 303 to `/sign-in`; success 303 to `/account?passwordChanged=1` with rotated session headers; invalid/rejected 400. |
| `/sign-out`         | POST      | Auth handler, then 303 to `/`, preserving auth headers.                                                                                     |
| `/api/auth/*`       | GET, POST | Better Auth owns statuses, cookies, redirects, origin/CSRF checks, and API authentication; no application session lookup.                   |

Application mutation forms require exact same-origin headers (403 on failure).
Forms and auth API requests have a 64 KiB body limit (413 on failure).
Action-specific auth forms and auth API POSTs except sign-out can return 429.
Password reset revokes sessions; password change verifies the current password,
revokes other sessions, and rotates the current session. Security headers,
request IDs, structured logs, and generic error handling apply through middleware.
Static public assets bypass Worker application middleware.

## Tooling replacement points

- `vite.config.ts`: replace `@hono/vite-dev-server` and
  `@cloudflare/vite-plugin` integration with proven `voidPlugin()` configuration,
  rather than stacking competing runtime plugins.
- `src/runtime/cloudflare.ts`: Void would own Worker entry/routing, while existing
  auth, email, database, and rate-limit construction must move to an appropriate
  request/runtime boundary.
- `src/app.ts` and `src/routes/`: migrate registration to native method exports
  only after the disposable runtime gate passes.
- `package.json`: build, preview, deploy, migration, verification, and generated
  type preparation commands must reflect the approved deployment strategy.
- `scripts/smoke-worker.ts` and CI: continue testing real generated Worker output
  with disposable local D1, not a Node production substitute.

## Baseline verification

The initial shell had Node 22.23.1 and pnpm 11.22.0. Initial frozen installation
passed with an unsupported-engine warning. Node 24.21.0 was obtained through
`npm exec --yes --package=node@24.21.0` without changing project dependencies.

The following baseline commands passed under Node 24.21.0 with pnpm 11.22.0:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm verify
```

`pnpm verify` passed ESLint, Stylelint, Markdownlint, Prettier, TypeScript,
43 unit tests across nine files, five browser tests, eight accessibility tests,
Fallow, the production Worker build, and the real Worker smoke test. The Worker
smoke test confirmed disposable D1 migrations, health, pages, assets, auth forms,
and simulated email delivery. No baseline test failures were observed.

Non-failing environment warnings: Playwright downloaded its Ubuntu fallback for
this unsupported OS, and Fallow discarded a cache from a different project root.
The default shell still uses Node 22; use Node >=24.21.0 for future Void work.

After adding this document, direct Markdownlint invocations under Node 22 failed
by scanning dependency Markdown files. The supported `pnpm lint:md` command under
Node 24.21.0 passed with the new document included. Prettier formatted this file,
and `git diff --check` passed.

## Approved proof of concept

The disposable tracked-source copy lives at `/tmp/opencode/void-poc`. Its
`void init --no-git --deploy none` run migrated Wrangler settings and type
configuration, requested a manual Vite edit, and stopped at the database prompt.
It did not scaffold a UI framework, connect a deployment target, or modify this
repository's agent instructions. The installed package APIs and bundled docs
were inspected before integration.

Native `/health` and `/` routes passed in both `vite dev` and `vite preview`:
database health, existing Hono HTML views, static assets, original Drizzle D1
migrations, simulated `EMAIL`, execution-context `waitUntil`, and edge rate
limiting. A Wrangler deployment dry-run accepted the generated Worker and all
bindings, without deployment or remote migration execution. Test servers stopped
after the checks. Evidence and the bounded check script are under
`/tmp/opencode/void-assessment/`.

Initial proof failures and resolutions:

- The release-age policy rejected Void's fresh packages. A disposable-only
  override allowed evaluation; implementation uses explicit version-scoped
  exceptions, not a global policy bypass.
- Void's Cloudflare plugin required Wrangler >=4.151, so Wrangler was pinned to
  4.151.3. Hono was aligned to 4.13.13 for compatible context types.
- Void rejected root environment example files. The template moved under
  `config/`; local real settings remain untouched.
- Dev and preview initially shared a rate-limit test key. Distinct per-origin
  keys fixed the proof test's isolation.
- Schema-declared server keys cannot be plaintext Worker vars in Void 1.2.0.
  Production setup now documents them as secret bindings, including origins and
  sender. No remote settings were changed.

## Implementation and retained behavior

- Added native `routes/` method exports and `middleware/01.application.ts`.
  Existing HTTP handlers are shared with the in-process Hono unit-test harness,
  not forwarded through a second router at runtime.
- Kept views, CSS, browser behavior, PWA assets, Better Auth configuration, email
  abstraction, database schema, and migration files. Request-scoped Worker
  dependencies are constructed in `src/runtime/cloudflare.ts`.
- Preserved application error sanitization with a native handler adapter and a
  middleware error boundary. The application uses `appSession` to avoid Void's
  reserved managed-auth session context variable.
- Replaced custom Vite plugins with `voidPlugin()` and translated Wrangler
  resource settings into `void.config.ts`. Wrangler targets generated
  `dist/ssr/wrangler.json`; no `void deploy` or automatic remote migrations.
- Removed `src/runtime/node.ts` only after the native Worker smoke and five
  browser flows passed. Removed direct custom runtime-plugin dependencies.
  `better-sqlite3` remains for tests and SQLite inspection.
- Adapted browser tests to separate local D1 state and extended Worker checks for
  native security enforcement and SQLite/D1 schema parity. CI prepares Void types.
- Updated README and agent guidance for the approved runtime/deployment tradeoffs.

The pre-implementation version of this previously untracked assessment was saved
at `/tmp/opencode/void-assessment/pre-implementation-assessment.md` before edits.

## Verification and rollout

- Frozen install and peer dependency checks passed under Node 24.21.0 with pnpm
  11.22.0.
- The first implementation `pnpm verify` passed all lint/format/type checks, 43
  unit tests, five native Workers/D1 browser tests, and eight axe checks, then
  stopped on Fallow's environment-entry/export/dependency classification findings.
  Those findings were corrected; focused Fallow and the extended real Worker
  smoke test then passed, including SQLite/D1 auth-table/index schema parity.
- Disposable optional SQLite migrate/reset commands passed. Early implementation
  build/type failures from Hono version alignment, binding/context types, public
  middleware composition APIs, and environment-schema settings were fixed before
  the successful checks.
- An independent actual-Worker assessment verified sanitized handler and
  middleware exceptions, matching request IDs, CSP, and safe correlated logs.
  Evidence is under `/tmp/opencode/void-error-proof/`. Both paths preserve the
  existing duplicate completion-log behavior on failures.
- Unauthenticated GET/POST requests to `/__void/migrate` and
  `/__void/migrate/auth` returned 404. Void's public `/__void/ready` returns
  `{"ready":true}` without application middleware. This reserved runtime endpoint
  is documented; it does not replace database health checks.
- The documented `pnpm db:migrate` and `pnpm preview` commands passed with explicit
  disposable local settings, including health, public pages, manifest, and assets.
  The main application's Wrangler code-only deployment dry-run passed. Logs are
  under `/tmp/opencode/void-assessment/`.
- Independent implementation review passed with no blocking findings after the
  native Worker error evidence was supplied.
- Final `pnpm install --frozen-lockfile` and `pnpm verify` passed under Node
  24.21.0/pnpm 11.22.0: Void type preparation, ESLint, Stylelint, Markdownlint,
  Prettier, TypeScript, all 43 unit tests, five browser flows, eight accessibility
  checks, Fallow, Void Worker/client build, and extended actual Worker smoke.
  The shell supplied a disposable `EMAIL_FROM` and
  `CHROMIUM_PATH=/usr/bin/chromium-browser`; no local environment file was changed.

`wrangler whoami` reported no Cloudflare authentication. No staging Worker,
remote D1 database, production deployment, or remote secret change has been
performed. Live staging validation remains blocked on Cloudflare credentials.
A successful GitHub Actions run must be confirmed on the pull request.

Local builds warn that the pre-existing local settings lack `EMAIL_FROM`; those
settings were preserved. Runtime tests pass explicit disposable sender/settings.
Users upgrading an existing clone must update local settings from the new
template. Live staging validation is required before release.

## File inventory

- Retained unchanged: `src/auth/`, `src/db/schema.ts`, `drizzle/`, `src/views/`,
  `resources/`, `public/`, `src/runtime/config.ts`, `src/email/`, and all existing
  unit-test behavior.
- Added: `routes/` (native method exports matching the HTTP inventory),
  `middleware/01.application.ts`, `src/http/handler.ts`, `void.config.ts`, `env.ts`,
  this assessment, and `config/local.env.example` (moved/updated template).
- Changed: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
  `vite.config.ts`, `tsconfig.json`, `playwright.config.ts`, `eslint.config.js`,
  `.fallowrc.json`, `.github/workflows/verify.yml`, `.gitignore`, `.prettierignore`,
  `AGENTS.md`, `README.md`, `src/app.ts`, `src/app-types.ts`, `src/http/page.ts`,
  `src/middleware/application.ts`, `src/routes/{auth,errors,examples,home}.ts`,
  `src/runtime/cloudflare.ts`, `scripts/{prepare-browser-db,smoke-worker}.ts`,
  `tests/browser/{auth-fixture,password-recovery.spec}.ts`.
- Removed/replaced: `src/runtime/node.ts`, `wrangler.jsonc`, `.env.example`, and
  `.dev.vars.example`. The old optional SQLite scripts remain explicitly named
  tooling; application development no longer uses them.

## Rollback

The pre-migration source is commit
`7767f14e51733e945c5c9b3b8ef47e2494d6bfcd`. Use a separate branch/worktree,
restore its documented local configuration, install frozen dependencies, verify,
and build with its original configuration. For a deployed code-only rollback,
select the previous Cloudflare Worker version and check health/account flows.
No schema downgrade is needed because this migration changes no schema or SQL.
Review actual deployment IDs and configuration before any remote command.

## Follow-up: local cold-start regression

After the initial PR, the user reported that plain development startup failed
with the existing blank `EMAIL_FROM`, alongside a missing optimized-dependency
chunk during reload. The initial verification had supplied a sender override,
so it did not cover that local setup. The shell also still used unsupported
Node 22.23.1.

The fix is limited to Vite configuration and the browser fixture:

- Development supplies a safe simulated sender only when the local sender is
  missing or blank. Preview/build do not supply this default; production schema
  and runtime validation are unchanged. Local environment files are not edited.
- Worker dependency scanning starts from native routes and middleware, exposing
  their static imports before serving requests instead of discovering them in
  successive reloads through Void's lazy generated entry.
- Unsupported Node versions fail with a clear message before starting Vite.
- Browser flows now intentionally run with a blank sender to cover this case.

Isolated Node 24.21.0 cold starts passed with both absent and blank senders, with
repeated public route and resource requests and no optimizer reload errors.
Before the scan configuration change, the isolated startup showed successive
dependency optimization/reload waves; the user's exact intermittent missing-chunk
exception was not reproduced. Afterward, startup required no discovery reloads.
Node 22 rejection was also checked. Logs are under
`/tmp/opencode/void-assessment/cold-*.log`.

Focused ESLint, type checking, all 20 runtime-configuration tests (including
production sender requirements), and all five browser flows with a blank sender
passed. The browser preparation also built the production Worker successfully.
Independent review of the startup fix passed with no blocking findings.
