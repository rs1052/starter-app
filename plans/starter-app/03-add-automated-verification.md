# Add automated verification

## Goal

Provide focused automated tests and complete, discoverable project verification for behavior, accessibility, code quality, and both production outputs.

## Scope

- Configure Vitest for focused application and authentication tests using an isolated temporary SQLite database and repository migrations.
- Test representative rendering, health behavior, authentication, account protection, session persistence, HTML escaping, security headers, invalid forms, safe errors, and body limits.
- Configure Playwright with a disposable migrated SQLite database and a Vite development web server supplied with test-only environment values.
- Test navigation, sign-up, sign-in, persisted account access, sign-out, account protection, the HTMX fragment update, the Alpine interaction, and static asset loading.
- Add `@axe-core/playwright` checks for representative public, authentication, examples, and authenticated account states.
- Configure ESLint for TypeScript and browser code, Stylelint for plain CSS, Markdownlint for Markdown, Prettier, `tsc --noEmit`, and Fallow.
- Add the requested focused package scripts and a `pnpm verify` command that includes static checks, unit tests, browser tests, accessibility checks, Fallow, and the production build.
- Keep Worker build verification part of the normal production build rather than adding a second redundant build path.

## Constraints

- Tests must not use or preserve the developer's normal `data/app.db`.
- Test databases, browser artifacts, traces, coverage, and build output must be ignored.
- Prefer testing public HTTP behavior over internal implementation details.
- Do not add configuration or suppressions preemptively. Add the narrowest documented Fallow or lint exclusion only when a real, repeatable framework convention requires it.
- Keep targeted scripts available so normal changes do not require the full verification suite.

## Acceptance checks

- `pnpm lint`, `pnpm lint:css`, and `pnpm lint:md` pass.
- `pnpm format:check` and `pnpm typecheck` pass.
- `pnpm test` passes the focused Vitest suite.
- `pnpm test:browser` passes the Playwright behavior and axe checks from a disposable database.
- `pnpm fallow` passes without unjustified inline suppressions.
- `pnpm build` produces the browser assets and deployable Cloudflare Worker.
- `pnpm verify` runs and passes the complete project verification, including the production build.
- Failed browser tests retain useful diagnostics, while successful runs leave no tracked runtime artifacts.

## Notes

- Playwright's Chromium must be installed once with `pnpm exec playwright install chromium`; successful behavior and axe runs leave only ignored reports and test databases.
- `fallow.json` declares the Vite runtime, browser, script, test, and config entry points because zero-configuration discovery did not recognize the Hono Vite Node export.
