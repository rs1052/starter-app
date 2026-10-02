# Protect authentication requests

## Goal

Rate-limit application-owned authentication form handlers that currently bypass Better Auth's client-request limiter by calling `auth.api` on the server.

## Scope

- Add the smallest asynchronous limiter contract needed by `createApp()` in `src/app.ts`.
- Enforce it before work in `POST /sign-in` and `POST /sign-up`, and make the same capability available to the password-reset request route added in step 03.
- Add a Cloudflare Rate Limiting binding to `src/runtime/cloudflare.ts` and `wrangler.jsonc` as the production implementation.
- Add a process-memory Node implementation in `src/runtime/node.ts` for local development and direct Node start.
- Use a deterministic fake or injected stub in `tests/unit/app.test.ts`.
- Return a generic `429` response and `Retry-After` when available.
- Add tests proving blocked requests do not call the protected authentication operation and ordinary requests retain current behavior.

## Constraints

- Confirm Cloudflare is the only intended production runtime before implementation.
- Do not add database tables, a distributed limiter, CAPTCHA, or a rate-limiting package.
- Do not rely on Better Auth's built-in limiter for these form routes because server-side `auth.api` calls are excluded from it.
- Keep actor keys opaque in logs and avoid storing raw credentials or full form bodies.
- Preserve the direct `/api/auth/*` handler and Better Auth's own protection for client-initiated API requests.

## Acceptance checks

- Repeated sign-in and sign-up attempts receive `429` according to the configured policy.
- A limited request does not invoke Better Auth.
- Normal authentication, origin checks, body limits, cookies, redirects, and error responses remain unchanged.
- Cloudflare binding types and Worker build pass.
- Unit tests cover allowed and rejected attempts without timing-dependent waits.
