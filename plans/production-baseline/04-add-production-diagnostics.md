# Add production diagnostics

## Goal

Provide enough request correlation, structured logging, and health information to diagnose production failures without selecting an external monitoring vendor.

## Scope

- Add Hono's existing `requestId()` middleware in `registerMiddleware()` and expose the request ID in response headers.
- Emit one structured JSON completion log per application request with request ID, method, path or matched route, status, and duration.
- Update `registerErrors()` to log the request ID and error details while keeping the response generic. Include the request ID in the response so a report can be correlated.
- Add an asynchronous database health-check function to `AppOptions` and implement it in both runtime boundaries with the smallest valid database query.
- Update `/health` to return `200` for a successful check and `503` for a failed check without leaking database details.
- Explicitly enable Workers Logs in `wrangler.jsonc`.
- Add unit coverage for request IDs, safe 500 responses, successful health, and failed health.

## Constraints

- Do not add an external logging, tracing, metrics, or error-reporting dependency.
- Do not log request or response bodies, query values that may contain tokens, headers, cookies, credentials, email addresses, or secrets.
- Keep log output usable in both Node console output and Cloudflare Workers Logs.
- Do not turn `/health` into a detailed diagnostics endpoint or expose environment metadata.

## Acceptance checks

- Every application response includes a request ID.
- Completion and error records are valid structured output and share the same request ID.
- A forced application error returns a generic 500 response with a correlation ID and no stack trace.
- `/health` returns `{ "status": "ok" }` with `200` when the database responds and a generic unavailable result with `503` when it does not.
- No test log or response exposes sensitive request data.
- Node tests and the Worker production build pass.
