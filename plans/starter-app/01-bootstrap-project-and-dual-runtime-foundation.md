# Bootstrap project and dual-runtime foundation

## Goal

Establish an installable Node 24 TypeScript project with one shared Hono application, Node and Cloudflare runtime boundaries, Vite-managed browser assets, and one Drizzle schema and migration path for SQLite and D1.

## Scope

- Create package metadata, the pnpm lockfile, TypeScript configuration, ignore rules, `.env.example`, and the minimum Vite, Wrangler, Drizzle, and runtime configuration.
- Install only the approved runtime and development dependencies after confirming their current APIs, peer ranges, and Node 24 support.
- Add a minimal `createApp()` with `/` and `/health` so both runtimes can exercise the shared application.
- Configure `pnpm dev` to run the Hono Node entry through Vite as one process with route and view reload.
- Add a direct Node start path where useful and a Cloudflare Worker entry that receives the D1 binding and secrets only at that boundary.
- Configure the browser TypeScript and CSS entries for Vite development HMR and production asset output.
- Import installed HTMX and Alpine packages in the small browser entry, without implementing the final examples yet.
- Copy `/home/ryan/Development/skincertain/resources/css/tokens-foundation.css` unchanged and add only initial reset, typography, layout, and focus defaults in `app.css`.
- Define the Better Auth SQLite tables in the shared Drizzle schema, generate the initial SQL migration, and add straightforward local generate, migrate, inspect, and reset commands.
- Create the configured SQLite parent directory and database when needed, while keeping all database files out of Git.

## Constraints

- Shared modules must not import `better-sqlite3`, Cloudflare bindings, or D1 runtime code.
- Prefer direct dependency injection into `createApp()` over a generalized service or repository framework.
- Use the same schema and generated SQL migration files for local SQLite and D1.
- Do not use Better Auth's migration helper with the Drizzle adapter.
- Do not add concurrent development processes, Docker, a local database service, JSX, React, Tailwind, or a client framework.
- Keep production asset-path selection at runtime boundaries rather than adding environment checks to views.
- Prove the Vite development and production approach before building later features on it. If one config cannot meet the requirements without extra machinery, stop and document the exact incompatibility.

## Acceptance checks

- A clean `pnpm install` succeeds under Node 24, including `better-sqlite3` installation.
- Local migration commands create the configured SQLite database and schema without Docker or a database server.
- `pnpm dev` starts one process and serves `/` and `/health` through the Node runtime.
- Editing shared route or rendering code updates the response without a manual restart.
- Editing browser TypeScript and CSS exercises Vite HMR.
- The production client assets and Cloudflare Worker build successfully together.
- Worker code does not bundle or import the Node SQLite driver.
- The generated migration can be applied to a local Wrangler D1 database.
- The token file is byte-for-byte identical to its identified source.

## Notes

- Verified on Node 24.18.0 and pnpm 11.22.0. The pinned `better-sqlite3` 13.0.3 native build installs successfully.
- `pnpm build` uses a focused client build followed by the Cloudflare Vite plugin build; the latter emits the Worker and final stable `/assets/app.css` and `/assets/app.js` files together.
- Local SQLite and Wrangler D1 both accepted `drizzle/0000_demonic_the_hood.sql`. Remote Cloudflare operations still require a real database ID and credentials.
