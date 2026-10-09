# Agent guidance

- Inspect the relevant code and Git state before changing files. Preserve unrelated work and existing public behavior.
- Choose the smallest direct solution that meets the current requirement. Reuse existing code and platform features before adding dependencies, files, configuration, state, or abstractions.
- Use Node and SQLite for `pnpm dev`, the actual Worker and local D1 for `pnpm build` and `pnpm preview`, and Cloudflare for deployment. Do not add a separate Node production server.
- Enable foreign keys explicitly on every SQLite connection. Keep Drizzle schema and migrations compatible with both SQLite and D1. Check Better Auth schema compatibility when upgrading authentication dependencies, using the disposable configuration documented in `README.md`.
- Verify current external APIs instead of guessing. Pin compatible dependencies and explain any required configuration.
- Validate external input, enforce authorization on the server, bound request bodies, escape user-controlled output, preserve authentication headers, and keep secrets out of source control.
- Preserve the 64 KiB form and auth API body limit, strict origin checks, edge rate limits, and Better Auth's secondary protections. Skip session lookup for health and auth API requests. Password resets must revoke existing sessions.
- Use type-aware promise checks and handle background task failures. Keep CSS rules focused on observable errors rather than enforcing arbitrary ordering or notation changes.
- Build semantic, keyboard-accessible HTML with labels, landmarks, logical headings, visible focus, status messages, and usable no-JavaScript fallbacks where practical.
- The starter provides PWA installability only. Do not add service workers, offline caching, background sync, or local data synchronization unless the product explicitly requires offline behavior.
- Run the narrowest relevant checks while working, then document and run all setup or verification commands promised to users. Report any failed checks. Keep generated runtime state out of Git.
- Never discard or overwrite user changes. Inspect the final diff and repository status before finishing.
- For work that needs a plan, use the global planning skill and follow its workflow. Do not copy the skill into this repository.

## Code organization

### Application composition

- `src/app.ts` wires routes, middleware, and application dependencies together. Keep application composition here, not feature logic, database queries, or request handling. Runtime entry points own environment-specific startup.
- `src/app-types.ts` defines the shared application's dependency and request-context contracts.

### Routes

- `src/routes/` owns HTTP behavior: URLs and methods, request parsing and validation, authentication and authorization, calls to feature behavior, prepared view data, and redirects, status codes, headers, and responses.
- Keep small route-specific helpers private. Do not bury substantial reusable application rules in handlers or split a route solely because it is long.
- Auth form parsing and validation, Better Auth calls, `authResult`, and the small `/account` route belong in `src/routes/auth.ts`. Split account behavior only when it grows into a separate feature.

### Views

- `src/views/layouts/` owns complete-page structure, `src/views/pages/` owns route-level rendering, and `src/views/components/` owns independently reusable UI primitives with their own named modules.
- Views receive prepared data and render markup. They must not access databases, read runtime bindings, perform authorization, call external services, or contain business rules.
- Keep private rendering helpers with their owner. Add feature-specific partials alongside that feature only for actual reuse. `src/views/pages/account.ts` is an independent page concept. Do not move it for folder symmetry.

### Feature behavior and grouping

- Keep simple logic with its route or module. Extract application rules with a clear domain responsibility, reused behavior, logic needing focused testing, or code that obscures its owner's primary responsibility.
- Prefer specific domain locations such as `src/auth/`. Name modules after what they do, not generic technical roles. Do not add controller/service/repository layers or `src/services/`, `src/helpers/`, `src/utils/`, `src/common/`, or similar dumping grounds without a concrete need.
- Group a feature when several related modules make grouping useful for discoverability. Keep small features flat. Do not create empty directories or force identical folder shapes.
- Shared code must have actual use across responsibilities or features, not hypothetical future reuse. Prefer a duplicated trivial expression when an abstraction would make ownership less clear.

### Database and runtime boundaries

- `src/db/` owns shared database schema and infrastructure. Keep Drizzle schema and migration concerns database-focused. Generated migrations remain in `drizzle/`. Application behavior uses the project's database contracts, not runtime-specific database APIs.
- `src/runtime/node.ts` owns Node/SQLite setup. `src/runtime/cloudflare.ts` owns Cloudflare/D1 setup. Runtime-specific imports and bindings stay at these boundaries unless a module is explicitly runtime-specific. `src/runtime/config.ts` owns runtime configuration parsing.
- Shared application and database-facing behavior stays runtime-neutral, compatible with both runtimes, and asynchronous.

### HTTP infrastructure and browser code

- `src/http/` owns reusable HTTP/page-response infrastructure, not product rules. `src/middleware/` owns cross-cutting request behavior, not domain rules merely used during a request.
- `resources/js/` owns browser behavior. `resources/css/` owns styles. Prefer server rendering and progressive enhancement. Do not move server application logic into browser code.

### Tests

- `tests/unit/` mirrors the production module or responsibility where practical. `tests/browser/` covers observable application behavior. Do not add tests solely to enforce directory structure.

#### Before launch

- Aim for confidence, not coverage percentage. Write focused unit tests for application rules and happy-path browser tests for important user flows. Generally use one happy-path unit test per behavior that needs testing and one happy-path browser test per page or major flow.
- Add extra tests for concrete risks: security, authentication or authorization, data integrity, destructive behavior, known failure modes, or real bugs.
- Preserve negative tests for origin protection, request body limits, rate limiting, protected routes, password reset, escaping, and database constraints. These address concrete risks.
- Do not test trivial markup or framework internals. Do not duplicate behavior across unit and browser tests without a reason. Do not introduce coverage targets, tooling, or thresholds in the starter.

#### After launch

- Derived applications should add regression tests for production bugs that affect behavior and expand coverage around frequently changed or high-impact behavior.
- Focus on auth, permissions, payments, destructive actions, migrations, and critical user flows when those features exist.
- Keep E2E tests focused on critical journeys. Prefer unit or integration tests for branch-heavy logic when they are faster and clearer.
- Add coverage reporting only if it becomes useful. Use reports to find suspicious gaps, not as a score to increase.

### Dependency direction

Use this dependency direction as an ownership guide: `runtime -> application composition -> routes/features -> views/infrastructure`.

- Runtime modules construct dependencies for the shared application. `app.ts` composes routes and middleware.
- Routes may depend on feature logic, HTTP helpers, and views. Views depend only on rendering-related code and their input types.
- Shared feature logic should not depend on Hono `Context` unless it needs HTTP behavior. Shared application code must not import Node- or Cloudflare-specific runtime modules.
- Keep these boundaries understandable with TypeScript and code review. Do not add architecture tooling, layering-only barrel files, or path aliases.

## Discoverable code

- Treat filenames, paths, exported symbols, types, and other identifiers as text-search terms. Prefer concise domain or responsibility names over generic `create`, `handle`, `data`, `result`, `config`, or `client` when specificity helps. Make important exported functions, types, classes, and modules easy to find without excessively long names.
- Use one term and spelling per concept. Avoid unnecessary aliases and synonyms.
- Keep TypeScript contracts precise. Prefer useful domain types over `any` or vague types, and make definitions understandable from their code and types without tracing unrelated files.
- Put short comments at definitions when code cannot express an important reason, constraint, or non-obvious behavior. Do not restate the code.
- Match source/test basenames when a test clearly covers one module. Keep integration and behavior tests named for the behavior they cover.
- Remove obsolete code when practical. Clearly mark obsolete public code that must remain temporarily as deprecated.
