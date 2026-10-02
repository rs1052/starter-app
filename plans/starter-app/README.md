# Starter app implementation plan

## Reusable implementation prompt

Implement or resume the approved plan in `plans/starter-app/`.

Read this README and the next incomplete numbered step file. Inspect the current code and Git state before changing anything. Use repository evidence rather than blindly trusting the progress checklist. Implement and verify the next step, then update its progress entry and add or update `## Notes` only with information needed to resume safely. Continue through later steps automatically. Preserve unrelated changes. Stop only for an unresolved requirement, blocked verification, required user action, or a change to the approved scope.

## Progress

- [x] 01: Bootstrap project and dual-runtime foundation
- [x] 02: Implement application and authentication
- [x] 03: Add automated verification
- [x] 04: Document and validate clean setup

## Approved plan

### Goal

Create a small reusable TypeScript starter for server-rendered Hono applications. Use Node and SQLite for ordinary local development, Cloudflare Workers and D1 for production, and shared application code that does not depend directly on either runtime.

### Architecture

- Build a shared `createApp()` Hono factory. Inject runtime-specific authentication and asset details rather than reading environment variables or checking the runtime throughout application code.
- In local development, run Hono on Node through Vite and `@hono/vite-dev-server`'s Node adapter. Open the configured database with `better-sqlite3`, wrap it with Drizzle, and create Better Auth from that database.
- In production, initialize Drizzle from the Worker's D1 binding and create Better Auth with the same SQLite schema. Keep all Cloudflare types and binding access in the Worker boundary.
- Define Better Auth's SQLite-compatible tables once in `src/db/schema.ts`. Generate SQL migrations into `drizzle/` and use those migrations with both local SQLite and D1.
- Render pages with Hono's `html` tagged template and ordinary view functions. Never use JSX, a separate template language, or unreviewed raw HTML.
- Use Vite for the browser entry, CSS, development HMR, production assets, and Worker build. Import locally installed HTMX and Alpine packages from the browser entry.
- Use stable production asset entry names or an equally direct Vite-supported asset contract. Pass development and production asset URLs through the runtime boundary so views contain no environment checks.

### Application scope

Implement only these pages and behaviors:

- `/`: starter home page.
- `/sign-up`: email and password registration.
- `/sign-in`: email and password login.
- `/account`: server-protected account page with basic user information and sign-out.
- `/examples`: one progressively enhanced HTMX fragment replacement and one Alpine-only disclosure or toggle.
- `/health`: simple health response.
- `/api/auth/*`: Better Auth handler.

Use semantic reusable view functions such as `Layout`, `Header`, `Navigation`, `FormField`, and `Button`. Core navigation and form behavior should work without client-side JavaScript where practical.

### Data and authentication

- Use the Better Auth Drizzle adapter with SQLite as the provider for both database drivers.
- Keep shared database-facing operations asynchronous so local synchronous driver behavior does not leak into the application.
- Let Better Auth own authentication behavior. Do not add OAuth, roles, organizations, email verification, or password-reset delivery.
- Validate form shape and reasonable field lengths at the application boundary, then rely on Better Auth's own credential validation.
- Check sessions on the server for every protected request and preserve authentication response headers when application form routes invoke Better Auth APIs.
- Configure trusted origins and secure production cookies without disabling Better Auth's origin or CSRF protections.

### Security and accessibility

- Apply secure response headers, bounded request bodies, safe error responses, and same-origin protection to application-owned state-changing requests.
- Keep secrets in environment variables or Cloudflare secrets and exclude local environment files from Git.
- Escape all user-controlled template values. Use raw HTML bypasses only for reviewed static content if one is genuinely required.
- Preserve labels, landmarks, heading order, keyboard access, visible focus, status messaging, and progressive-enhancement fallbacks.
- Run axe checks on representative public, authentication, example, and signed-in pages.

### Tooling and commands

Provide clear scripts for development, production/local start where useful, migration generation and application, local database inspection and reset, unit tests, browser tests, individual linters, formatting, type checking, Fallow, build, deployment, and complete verification.

`pnpm verify` must run the complete project verification, including the production build. Keep focused commands independently available.

Start Fallow with its normal zero-configuration behavior. Add project configuration only if an actual run proves entry points or generated paths need explicit handling.

### Repository guidance and documentation

- Add a concise generic `AGENTS.md` with the approved simplicity, preservation, verification, security, and accessibility principles.
- The planning skill is global and must not be copied into the repository. Keep the repository `plans/` directory and briefly direct agents to the global planning skill without duplicating its workflow.
- Leave the OpenCode idle-maintenance plugin, plugin configuration, and plugin documentation out of scope.
- Document prerequisites, initial setup, Vite behavior, local SQLite, migrations, authentication, verification, production build, D1 setup, Cloudflare secrets, deployment, and runtime isolation in a concise README.

### Source assets

Copy `/home/ryan/Development/skincertain/resources/css/tokens-foundation.css` byte-for-byte to `resources/css/tokens-foundation.css`. It is the identified generic 495-line typography, sizing, layout, radius, shadow, easing, z-index, grid, and color token foundation. Add only small starter-specific defaults and page styles in `resources/css/app.css`.

### Expected structure

```text
src/
  app.ts
  auth/
  db/
    schema.ts
  routes/
  views/
  runtime/
    node.ts
    cloudflare.ts
resources/
  css/
    tokens-foundation.css
    app.css
  js/
    app.ts
public/
  images/
drizzle/
tests/
  unit/
  browser/
plans/
```

Adjust names narrowly when a current library convention makes another structure simpler.

### Constraints

- Use Node.js 24+, pnpm, TypeScript native ESM, Hono, Hono `html`, Vite, the Cloudflare Vite plugin, Drizzle, Better Auth, `better-sqlite3`, D1, HTMX, Alpine, plain CSS, Vitest, Playwright, axe-core, ESLint, Stylelint, Markdownlint, Prettier, TypeScript checking, and Fallow.
- Do not add React, JSX, Tailwind, another template engine, another ORM, Docker, a client-side application framework, fake domain behavior, or a full component library.
- Do not add a repository or database abstraction layer unless an observed incompatibility between the two Drizzle drivers requires the smallest possible boundary.
- Do not scatter production, Cloudflare, SQLite, or D1 conditions through shared application code.
- Do not commit databases, credentials, local environment files, build output, browser traces, or other runtime state.
- Pin dependency versions only after checking current peer and Node 24 compatibility. Confirm that the selected `better-sqlite3` release installs under Node 24.
- Validate server reload, CSS HMR, browser TypeScript HMR, and the combined client and Worker build early because no single upstream document guarantees this exact dual-runtime configuration.

### Acceptance checks

- A clean `pnpm install` succeeds under Node 24.
- Local setup requires neither Docker nor a database server.
- Local migrations create a usable SQLite database at the configured path.
- `pnpm dev` starts the complete Node development environment as one process.
- CSS and browser TypeScript use HMR, and route or view changes appear without a manual server restart.
- Static assets and Hono templates render correctly.
- A user can sign up, sign in, retain a SQLite-backed session, access `/account`, and sign out; unauthenticated users cannot access `/account`.
- The HTMX and Alpine examples work, and core fallbacks remain usable without JavaScript where practical.
- Security headers, request limits, origin protection, safe errors, production cookie settings, escaping, and server authorization are implemented and tested where practical.
- Vitest, Playwright, axe, ESLint, Stylelint, Markdownlint, Prettier check, TypeScript checking, Fallow, Vite production build, and Worker build pass.
- `pnpm verify` passes and includes the production build.
- The documented Wrangler process applies repository migrations to D1.
- A final Git inspection finds no database, secret, generated output, or other runtime state accidentally included.

### Escalation conditions

Stop for user input if the current Vite plugins cannot provide Node development and the Cloudflare production build without another long-running development process, Better Auth cannot use one schema cleanly with both Drizzle drivers, or remote Cloudflare verification requires credentials, binding identifiers, domains, or secrets that have not been supplied. Local D1 and Worker verification should still proceed when possible.
