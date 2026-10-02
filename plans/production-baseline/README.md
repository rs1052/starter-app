# Production baseline completion

## Reusable implementation prompt

Implement or resume the approved plan in `plans/production-baseline/`.

Read this README and the next incomplete numbered step file. Inspect the current code and Git state before changing anything. Use repository evidence rather than blindly trusting the progress checklist. Implement and verify the next step, then update its progress entry and add or update `## Notes` only with information needed to resume safely. Continue through later steps automatically. Preserve unrelated changes. Stop only for an unresolved requirement, blocked verification, required user action, or a change to the approved scope.

## Progress

- [x] 01: Harden runtime configuration
- [x] 02: Protect authentication requests
- [x] 03: Add password recovery email
- [x] 04: Add production diagnostics
- [x] 05: Add CI and documentation

## Approved plan

### Goal

Turn the existing Hono starter into a repeatable production baseline by completing password authentication, protecting public authentication operations, validating production configuration, adding operational diagnostics, and enforcing the existing verification suite in CI.

### Approach

1. Tighten the existing shared runtime configuration parser before adding new configuration.
2. Add a narrow rate-limit capability at the runtime boundary and enforce it on application-owned authentication forms, which currently call Better Auth's server API and bypass its built-in client rate limiter.
3. Complete email/password authentication with Better Auth password-reset flows and one real transactional email provider, while preserving generic responses and non-blocking Worker delivery.
4. Add request correlation, structured logs, explicit Workers observability, and a database-aware health response.
5. Add GitHub Actions verification and document only the new setup and operational requirements.

### Preserve / non-goals

- Preserve `createApp()` as the shared runtime-neutral Hono application and keep Node/SQLite and Workers/D1 details in their existing runtime boundaries.
- Preserve server-rendered forms, progressive enhancement, current routes, authentication semantics, migration source of truth, and existing verification commands.
- Do not add OAuth, passkeys, MFA, organizations, roles, payments, uploads, queues, analytics, generic repositories or services, fake domain CRUD, or a general component library.
- Do not require email verification by default.
- Do not add a general validation framework unless implementation proves the new forms cannot be handled cleanly by the existing direct parsing pattern.
- Do not automate production deployment until a concrete environment, credentials, approval policy, and migration rollout policy are supplied.

### Permitted areas

- `src/app.ts`
- `src/auth/create-auth.ts`
- `src/runtime/config.ts`
- `src/runtime/node.ts`
- `src/runtime/cloudflare.ts`
- `src/views/pages.ts`
- `src/views/components.ts`
- A small shared email integration under `src/`
- `resources/css/app.css`
- `wrangler.jsonc`
- `.env.example`
- `package.json` and `pnpm-lock.yaml` only if the selected email provider requires a dependency
- `.github/workflows/verify.yml`
- `tests/unit/**`
- `tests/browser/**`
- `README.md`

### Relevant pre-existing changes

The completed starter plan in `plans/starter-app/README.md` explicitly excluded password-reset delivery and email verification. Password recovery is an approved extension rather than incomplete work from that plan. At plan creation, Git reported the existing repository contents as untracked, so implementation must preserve them as pre-existing work.

### Compatibility and migrations

- Prefer Better Auth's existing `verification` table for reset tokens. Do not create a migration unless the pinned Better Auth version demonstrably requires a schema change.
- Keep `AppOptions` additions internal to the application factory and update every runtime and test constructor together.
- New production configuration must fail fast, but preserve the current localhost defaults in development.
- If stricter production configuration introduces new required secrets or variables, configure them before deploying the code. Rollback consists of reverting the application/config changes; no data rollback should be needed if no migration is introduced.

### Security requirements

- Do not reveal whether a submitted email address belongs to an account.
- Do not log form bodies, passwords, cookies, authorization headers, email addresses, or reset tokens.
- Keep rate-limit responses generic and include `Retry-After` where the implementation can determine it.
- Keep reset links single-use and expiry behavior owned by Better Auth.
- Never log reset links in production.

### Acceptance checks

- Missing or invalid production authentication origins fail during startup, while valid development configuration continues to work.
- Repeated sign-in, sign-up, and password-reset requests are limited before invoking Better Auth or sending email.
- Users can request and complete a password reset, and all reset-request responses avoid account enumeration.
- Cloudflare schedules email delivery with `ExecutionContext.waitUntil()` or the selected provider's equally reliable Worker mechanism.
- Every application response has a request ID, failures can be correlated in structured logs, and logs exclude sensitive data.
- `/health` returns `503` when the configured database is unavailable.
- Workers Logs are explicitly enabled.
- GitHub Actions runs the pinned toolchain and complete `pnpm verify` command.
- Existing unit, browser, accessibility, lint, type, dependency, and production build checks continue to pass.

### Escalation conditions

- Stop before the email step until the transactional email provider and required credentials are selected.
- Confirm Cloudflare is the only production runtime before treating the Cloudflare Rate Limiting binding as the production implementation.
- Stop if the pinned Better Auth release requires a schema change for password recovery that the existing `verification` table does not satisfy.
- Stop if reliable non-blocking email delivery requires a queue or other infrastructure beyond `ExecutionContext.waitUntil()`.
- Stop before deployment automation until the target repository, Cloudflare account, environment names, secrets, and migration rollout policy are known.

## Notes

- Step 01 completed. `parseRuntimeConfig()` now validates and normalizes HTTP(S) origins, requires explicit secure production configuration except for local previews, and requires the auth origin among trusted origins. Focused configuration and application tests, typechecking, and focused linting pass.
- Git reported all repository contents as untracked before implementation. A pre-work snapshot of files touched for step 01 is stored at `/tmp/opencode/production-baseline-prework.patch`.
- Step 02 completed with a vendor-neutral injected limiter. Cloudflare uses its native binding, while Node uses a process-memory implementation suited to local and single-process use. Identity keys are SHA-256 hashes, and auth calls are skipped when limited. Focused tests, typechecking, linting, and both production builds pass. The pre-work snapshot is `/tmp/opencode/production-baseline-step2-prework.patch`.
- Step 03 completed with a vendor-neutral sender contract and a Resend HTTP adapter using `RESEND_API_KEY` and `EMAIL_FROM`. Better Auth owns single-use reset tokens in the existing verification table. Worker delivery uses `waitUntil()`, while local development prints reset messages unless Resend is configured. Unit, browser, accessibility, lint, type, and production build checks pass. The pre-work snapshot is `/tmp/opencode/production-baseline-step3-prework.patch`.
- Step 04 completed. Responses carry request IDs, completion and error logs are structured and correlated, log routes exclude query values, database health failures return a generic `503`, and Workers observability is explicit. Unit, lint, type, and production build checks pass. The pre-work snapshot is `/tmp/opencode/production-baseline-step4-prework.patch`.
- Step 05 completed. GitHub Actions installs the pinned Node 24, pnpm 11.22.0, and Chromium toolchain, then runs `pnpm verify`. Documentation covers strict origins, recovery email, rate limiting, health, request IDs, and Workers Logs. The first full verification run reached Fallow after all preceding checks passed; a configuration complexity finding was then split into focused helpers. Typechecking, the focused configuration tests, Fallow, and both builds passed after that correction. The pre-work snapshot is `/tmp/opencode/production-baseline-step5-prework.patch`.
