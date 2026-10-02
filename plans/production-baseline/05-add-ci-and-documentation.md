# Add CI and documentation

## Goal

Enforce the starter's existing verification contract on repository changes and document the new production requirements concisely.

## Scope

- Add `.github/workflows/verify.yml` for pushes and pull requests.
- Use Node 24 and the exact pnpm version declared in `package.json`.
- Install dependencies from the lockfile, install Chromium with required system dependencies, and run `pnpm verify` without duplicating its individual commands in the workflow.
- Cache only package-manager data that is safe and supported by the selected setup action.
- Update `README.md` with rate-limit binding setup, email provider variables, password-recovery routes, stricter origin rules, Workers Logs, database-aware health behavior, and CI.
- Review `.env.example`, `wrangler.jsonc`, and deployment instructions together so every required non-secret value and secret has one clear setup path.
- Inspect the final diff and repository status for generated databases, reports, traces, credentials, or unrelated changes.

## Constraints

- Do not add deployment automation, environment promotion, automated remote migrations, dependency bots, or vendor-specific monitoring.
- Do not weaken or split `pnpm verify` merely to make CI faster.
- Do not place real API keys, Cloudflare IDs, domains, or reset links in committed examples.

## Acceptance checks

- The workflow uses the pinned Node and pnpm toolchain, a frozen lockfile, and the complete `pnpm verify` script.
- Browser and accessibility tests have Chromium and required system libraries in CI.
- Documentation supports a clean local setup and identifies every additional production configuration step.
- `pnpm verify` passes locally in the final repository state, or every environment-specific failure is reported accurately.
- Final Git inspection contains no secret, database, build output, browser artifact, or unrelated edit.
