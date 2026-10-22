# Vue Pages migration

## Scope

- Goal: replace Hono HTML, HTMX, and Alpine rendering with native Void Vue Pages.
- Preserve: URLs, backend authentication and email behavior, schema and migration
  history, Cloudflare resources, CSP, origin/body/rate protections, styling, and
  useful ordinary forms.
- Acceptance: SSR and hydration in development and Worker preview, complete
  verification, unchanged account lifecycle, accessible interactions, and no
  production changes.
- Baseline and rollback: merged Plan 1 commit
  `14ab737cc2c1cef7c770773a63a1219b5e54838f`. Initial working tree was clean.

## Verified integration decisions

Void and its Vue adapter are pinned to 1.2.0. Vue 3.5.44 and vue-tsc 3.3.13
satisfy their peer requirements. The adapter includes the Vue Vite plugin.

Native routes precede Pages, including wildcard routes. Remove conflicting GETs
and move rendering POSTs to page actions. Keep API, health, sign-out, and refresh
handlers native. Ordinary forms remain full-document submissions so authentication
changes do not depend on stale client state or client navigation caches.

Use ordinary navigation links: the adapter's `Link` component emits inline
`touch-action` styles that violate the existing CSP. Serve the existing CSS as
an external Vite CSS entry, not a JavaScript style injection, so styling also works
before hydration and without JavaScript. Do not loosen CSP for either feature.

Void 1.2.0 reconstructs rendered responses as HTTP 200. A request-scoped status
bridge restores explicit application 400/404 statuses, without changing redirects,
cookies, or failure responses. The compatibility spike passed independent browser
checks in development and Worker preview: SSR, hydration, plain POST 400, no-JS
POST 400, CSP, and request IDs. Evidence: `/tmp/opencode/vue-spike/isolated-results/`.
Avoid deferred rendering, whose inline scripts are incompatible with the CSP.

The user accepted the recommendation to serialize only the short-lived reset token
already supplied in the reset URL and hidden form field, preserving validation
retries and no-JS submission. Session tokens, password hashes, dependency objects,
and complete session records remain server-only. Page responses are no-store.

Baseline `pnpm verify` passed, including local D1, email simulation, and Worker
smoke tests. Live staging validation remains unavailable without Cloudflare login;
this migration must not deploy or modify remote resources.

## Final verification (2026-10-22)

`pnpm verify` passed with Node 24.21.0: ESLint, Stylelint, markdownlint, Prettier,
Vue typecheck, 44 unit tests, 7 browser tests, 8 accessibility tests, Fallow
(0 dead code, 0 cycles, 0 complexity findings), and Worker smoke (build, local D1
migrations, SSR, escaping, static assets, auth forms, and simulated email).

Verification-driven changes:

- `.fallowrc.json` treats the external CSS entry and Pages as entry points.
- `applicationError` lives in `src/http/handler.ts`, breaking the
  `handler -> routes/errors -> page -> handler` import cycle.
- Browser tests use one Playwright worker because local D1 is a single SQLite
  file and parallel workers produced transient `SQLITE_BUSY` responses.
- Generated Playwright reports are excluded from markdownlint.
- The client entry keeps the stable `/assets/app.js` path while the external CSS
  entry is emitted separately as `/assets/app.css`.

No production deployment or remote migration was performed.
