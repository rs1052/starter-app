# Document and validate clean setup

## Goal

Make the starter understandable from the repository alone and validate the documented workflow from clean generated and runtime state.

## Scope

- Add a concise generic `AGENTS.md` covering simplicity, minimal inspection, preservation of user changes and interfaces, focused implementation, dependency restraint, verified APIs, Git safety, verification honesty, complete setup instructions, external input validation, server authorization, output escaping, secret handling, and semantic accessibility.
- Keep the planning note short: agents should use the global planning skill for work that needs a plan and follow that skill's workflow. Do not copy the skill or duplicate its instructions in the repository.
- Write a concise README covering contents, Node and pnpm prerequisites, installation, `.env` setup, local migration, `pnpm dev`, HMR behavior, SQLite location, migration generation and reset, authentication, verification commands, production build, D1 creation and migration, Cloudflare secrets, first deployment, and runtime isolation.
- Document exact Cloudflare commands and clearly distinguish local D1 verification from remote operations that need credentials and identifiers.
- Remove generated and runtime state, repeat the documented setup, and inspect the final repository state.

## Constraints

- Keep the repository `plans/` directory, but do not add `agent-skills/`.
- Leave the OpenCode idle-maintenance plugin, configuration, and documentation out of the repository.
- Do not include real secrets, account identifiers, database identifiers, domains, or local database files.
- Do not claim remote D1 migration or deployment succeeded unless valid Cloudflare access was available and the commands completed successfully.
- Keep documentation direct and avoid duplicating library references that are not needed to operate the starter.

## Acceptance checks

- A developer can follow the README from a clean clone to install dependencies, configure local values, migrate SQLite, start development, create an account, and run verification without undocumented steps.
- Clean setup does not require Docker, a database server, or a Cloudflare account.
- The README includes the exact D1 binding, migration, secret, build, and deployment workflow needed when a Cloudflare account is available.
- After deleting dependencies, build output, test output, and local databases, lockfile installation, local migration, and `pnpm verify` succeed.
- Development smoke checks confirm server-rendered reload, CSS HMR, browser TypeScript HMR, assets, templates, HTMX, Alpine, authentication, persistence, protection, and sign-out.
- A local Wrangler D1 database accepts the repository migration. Remote-only checks are either successful or explicitly reported as requiring user credentials or configuration.
- Final Git inspection shows only intended source, configuration, migration, test, documentation, and plan files, with no secrets or runtime state.

## Notes

- Clean validation moved dependencies and generated state aside, then passed `pnpm install --frozen-lockfile`, local SQLite migration, `pnpm verify`, production Node asset serving, development server reload, and a fresh local D1 migration.
- Remote D1 migration and deployment were not run because the repository intentionally contains placeholder Cloudflare identifiers and no user credentials.
