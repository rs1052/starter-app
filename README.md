# Hono dual-runtime starter

A small server-rendered TypeScript starter that runs on Node with SQLite during local development and deploys to Cloudflare Workers with D1. The shared Hono application includes email/password authentication, a protected account page, HTMX and Alpine examples, security defaults, and automated accessibility checks.

## Requirements

- Node.js 24 or newer
- pnpm 11 or newer
- Chromium for browser tests: `pnpm exec playwright install chromium`

Local development does not require Docker, a database server, or a Cloudflare account.

## Local setup

```sh
pnpm install
cp .env.example .env
```

Replace `BETTER_AUTH_SECRET` in `.env` with at least 32 random characters. For example:

```sh
openssl rand -base64 32
```

`BETTER_AUTH_URL` and every `TRUSTED_ORIGINS` entry must be an HTTP(S) origin without a path, query, credentials, or fragment. Production requires explicit HTTPS origins, except for localhost previews. Leave `EMAIL_FROM` and `RESEND_API_KEY` empty to print password-reset messages in local development, or set both to send through Resend.

Create the SQLite database and start the application:

```sh
pnpm db:migrate
pnpm dev
```

Open <http://localhost:5173>. Vite runs the Hono Node entry and browser asset server as one process. Route and view edits trigger a page reload; CSS and `resources/js/app.ts` use Vite HMR. Authentication data persists in `data/app.db`, which is ignored by Git.

`pnpm start` is a direct Node start path. Run `pnpm build` first if it should use the production asset URLs.

## Database workflow

The Better Auth tables live in `src/db/schema.ts`. Drizzle migrations in `drizzle/` are the source of truth for both SQLite and D1.

```sh
pnpm db:generate  # Generate a migration after a schema change
pnpm db:migrate   # Apply pending migrations to DATABASE_PATH
pnpm db:studio    # Inspect the configured local database
pnpm db:reset     # Remove the configured local database and its sidecars
```

Run `pnpm db:migrate` after a reset. Set `DATABASE_PATH` to use another SQLite file. Tests always use disposable databases and never use `data/app.db`.

## Application routes

- `/`, `/examples`, and `/health` are public. The health endpoint checks the database and returns `503` with a generic response when it is unavailable.
- `/sign-up`, `/sign-in`, `/forgot-password`, and `/reset-password` provide complete Better Auth email/password authentication.
- `/account` checks the server session on every request and provides sign-out.
- `/api/auth/*` is the Better Auth endpoint.

The HTMX example has an ordinary form fallback. The Alpine disclosure uses the CSP-compatible Alpine build.

## Server-rendered views

Routes own HTTP behavior and pass view data to route-level page functions under `src/views/pages/`. Pages compose reusable UI primitives from `src/views/components/` and render inside the document shell in `src/views/layouts/`. Pages may be grouped by product area, as the authentication pages are, while independently reusable primitives have their own named modules.

Keep page-specific helpers private to their page. Add a feature partial only when markup is reused within that feature, and move markup into `components/` only when it is context-free and reusable across features. These `hono/html` functions serve the same role as layouts, views, and partials in template-engine-based server applications.

## Verification

Install Chromium once, then run the complete project verification:

```sh
pnpm exec playwright install chromium
pnpm verify
```

`pnpm verify` runs ESLint, Stylelint, Markdownlint, Prettier check, TypeScript checking, Vitest, Playwright behavior tests, axe checks, Fallow, and the complete client and Worker build.

GitHub Actions runs the same command for every push and pull request with the pinned Node, pnpm, and Chromium toolchain.

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
pnpm build
pnpm preview
```

## Cloudflare D1 and deployment

These steps require a Cloudflare account and Wrangler authentication.

1. Create the D1 database:

   ```sh
   pnpm wrangler d1 create hono-dual-runtime-starter
   ```

2. Replace `replace-with-your-d1-database-id` in `wrangler.jsonc` with the returned ID. Set `BETTER_AUTH_URL` and `TRUSTED_ORIGINS` there to the exact HTTPS production origin. Set `EMAIL_FROM` to a sender on a domain verified by Resend. The `AUTH_RATE_LIMITER` namespace ID must be a positive integer unique within your Cloudflare account; change the included `1001` if it is already in use.

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

Application-owned sign-in, sign-up, and password-reset requests are limited to five attempts per email identity per minute. The shared application depends on an injected limiter. Cloudflare uses the configured Rate Limiting binding, and the local Node runtime uses an in-memory limiter suitable for development and single-process execution.

Every response includes `X-Request-Id`. Request completions and uncaught errors produce structured JSON logs with the same ID, without request bodies, headers, email addresses, or query values. Workers Logs are enabled explicitly in `wrangler.jsonc` and are available through the Cloudflare dashboard or `pnpm wrangler tail`.

## Runtime isolation

`src/app.ts`, routes, and views receive authentication and asset details through `createApp()`. `src/runtime/node.ts` is the only application boundary that opens `better-sqlite3`; `src/runtime/cloudflare.ts` is the only boundary that reads D1 and Worker bindings. Both initialize the same Better Auth configuration and shared Drizzle schema. Keep new runtime-specific imports at those boundaries.

Local environment files, databases, Wrangler state, build output, browser reports, traces, and coverage are ignored. Do not put real secrets, account IDs, database IDs, or domains in committed files.

## Agent guidance

See `AGENTS.md`. For work that needs an implementation plan, use the globally installed planning skill and follow its workflow. Do not copy that skill into this repository.
