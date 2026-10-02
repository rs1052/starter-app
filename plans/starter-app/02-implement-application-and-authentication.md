# Implement application and authentication

## Goal

Complete the small server-rendered starter application, including Better Auth, protected account behavior, reusable views, progressive enhancement examples, security defaults, and accessible starter styling.

## Scope

- Implement runtime-compatible Better Auth creation with the shared Drizzle schema and SQLite provider.
- Mount Better Auth at `/api/auth/*` and add server-rendered `/sign-up`, `/sign-in`, and sign-out form handling.
- Validate credential form shape and reasonable lengths, preserve authentication response headers, and render accessible errors without exposing internal details.
- Resolve sessions on the server and protect `/account`; show only basic signed-in user information.
- Build `/`, `/sign-up`, `/sign-in`, `/account`, and `/examples` from small Hono `html` view functions such as `Layout`, `Header`, `Navigation`, `FormField`, and `Button`.
- Add one HTMX request that replaces a server-rendered fragment with useful status messaging and an ordinary navigation or submission fallback.
- Add one Alpine disclosure or toggle that remains keyboard accessible.
- Complete the small `app.css` with starter page, navigation, form, button, message, example, responsive, and visible-focus styles. Do not create a component library.
- Apply secure headers, bounded bodies, same-origin protection for application-owned state changes, trusted origins, secure production cookie behavior, safe 404s, and safe error responses.

## Constraints

- Use Hono `html` tagged templates and ordinary functions, never JSX or another template language.
- Interpolate user-controlled content normally so Hono escapes it. Do not use raw HTML for user data.
- Let Better Auth provide authentication and its own auth-endpoint origin protections. Do not disable its CSRF or origin validation.
- Keep authorization on the server and check the session on each protected request.
- Do not add OAuth, organizations, roles, email verification, password-reset delivery, or domain-specific behavior.
- Core navigation and authentication forms should work without client-side JavaScript where practical.
- Keep Node, SQLite, Cloudflare, and D1 differences inside their runtime modules.

## Acceptance checks

- Every required route renders the intended semantic response.
- A local user can sign up, sign in, retain a session in SQLite, access `/account`, and sign out.
- An unauthenticated `/account` request is redirected to sign-in and cannot obtain account content by manipulating client state.
- Production auth configuration uses secure cookies and trusted origins without weakening Better Auth protections.
- Invalid or oversized form requests receive bounded, safe responses.
- User-controlled values are escaped in rendered HTML.
- The HTMX interaction replaces the intended fragment and announces its result; its fallback remains useful without HTMX.
- The Alpine interaction works with pointer and keyboard input.
- Pages have labels, landmarks, logical headings, visible focus, and responsive layouts without clipping or horizontal overflow.

## Notes

- Verified the complete local sign-up, persisted account, sign-out, and account-protection flow against migrated SQLite, including escaped profile content.
- The request-size middleware reads through Hono's cached request body instead of `hono/body-limit`; the latter constructs an incompatible Request under the current Vite Node adapter.
