# Add password recovery email

## Goal

Complete email/password authentication with a secure forgot-password and reset-password flow backed by one real transactional email provider.

## Scope

- Select the transactional email provider and verify its current HTTP API, authentication, and Worker compatibility before editing dependencies or configuration.
- Add only the small shared email-sending function required by Better Auth and tests. Prefer the platform `fetch` API when it avoids an unnecessary SDK.
- Extend `AuthConfig` and `createAuth()` in `src/auth/create-auth.ts` with Better Auth's password-reset delivery callback.
- Pass a background-task scheduler from each runtime. Update the Worker `fetch` signature to receive `ExecutionContext` and use `waitUntil()` for delivery; give Node a safe promise-handling implementation.
- Add `GET` and `POST` routes for `/forgot-password` and `/reset-password` in `src/app.ts`, using Better Auth's pinned server APIs and preserving response headers where relevant.
- Apply the existing body limit, same-origin protection, field length bounds, and the limiter from step 02.
- Add accessible server-rendered views in `src/views/pages.ts`, a sign-in link to recovery, generic request confirmation, token error handling, new-password confirmation, and minimal supporting styles if needed.
- Add provider configuration to `src/runtime/config.ts`, runtime bindings, `.env.example`, and `README.md` without committing secrets.
- Add unit tests with a fake email sender and browser coverage for requesting and completing a reset.

## Constraints

- Stop until the user selects the email provider and supplies the names of the intended configuration values.
- Verify the exact Better Auth 1.7.6 API and schema behavior from installed types or upstream documentation instead of assuming current online examples match the pinned package.
- Use the existing `verification` table if supported. Do not add a migration unless the pinned package requires one.
- Return the same reset-request response whether or not the account exists.
- Never log production reset URLs, tokens, submitted emails, or passwords.
- Do not require email verification or add a provider abstraction supporting multiple vendors.

## Acceptance checks

- A known user receives one reset message containing a valid application reset URL.
- An unknown email receives the same visible response and status without delivery.
- Valid tokens permit setting a conforming new password and cannot be reused after success.
- Missing, invalid, and expired tokens produce safe accessible errors.
- Password confirmation mismatch and invalid lengths are rejected before Better Auth is called.
- Cloudflare delivery is retained with `waitUntil()` after the HTTP response completes.
- Automated tests never contact the real provider.
- Existing sign-up, sign-in, session, and sign-out behavior remains intact.
