# Harden runtime configuration

## Goal

Make authentication origin configuration deterministic and fail fast when production settings are missing or unsafe.

## Scope

- Update `parseRuntimeConfig()` in `src/runtime/config.ts` to require `BETTER_AUTH_URL` in production while retaining the current localhost development default.
- Parse `BETTER_AUTH_URL` and every comma-separated `TRUSTED_ORIGINS` value with `URL`.
- Accept only HTTP(S) origins with no credentials, query, fragment, or non-root path, and return normalized `.origin` values.
- Require HTTPS for non-local production origins and ensure the authentication origin appears in `trustedOrigins`.
- Add focused parser tests in `tests/unit/config.test.ts` for valid development, valid production, normalization, missing settings, malformed URLs, unsafe protocols, and invalid origin components.
- Update `.env.example` or `README.md` only if the accepted format needs clarification.

## Constraints

- Do not add a configuration library.
- Do not change the `RuntimeConfig` result shape unless implementation requires a narrowly related field introduced by a later approved step.
- Preserve local browser-test and preview origins.

## Acceptance checks

- Development without `BETTER_AUTH_URL` resolves to `http://localhost:5173`.
- Production without an explicit valid authentication URL throws a clear startup error.
- Trusted origins are normalized and malformed entries fail with actionable messages.
- Existing runtime constructors typecheck without casts that hide invalid configuration.
- Focused configuration tests and the existing unit suite pass.
