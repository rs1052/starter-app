# Replace production Resend delivery with Cloudflare Email Sending

## Goal

Replace production Resend delivery with Cloudflare Email Sending's native Workers binding while preserving easy provider replacement through the existing `SendEmail` interface. SMTP is not required.

## Scope

- Inspect `src/email/send-email.ts`, `src/runtime/cloudflare.ts`, `src/runtime/node.ts`, `src/runtime/config.ts`, `src/auth/create-auth.ts`, and their focused tests before editing. The working tree was clean before these plan files were created; inspect current Git state again when implementing.
- Configure a native `EMAIL` send binding in `wrangler.jsonc`. Use current Cloudflare documentation and installed Worker types to confirm the structured message API and local simulation behavior.
- Inject a Cloudflare-backed `SendEmail` at the Worker runtime boundary. Map the prepared `to`, `subject`, and `text` fields and configured `EMAIL_FROM` to the binding's send operation. Keep Cloudflare-specific bindings and imports at the runtime boundary.
- Update `Bindings`, runtime wiring, and `parseRuntimeConfig` so Worker production requires `EMAIL_FROM` and the email binding, but not `RESEND_API_KEY`. Preserve Node's optional Resend configuration and console fallback without adding a provider-selection framework.
- Update `.env.example`, `.dev.vars.example`, relevant `README.md` setup/deployment/preview instructions, `scripts/smoke-worker.ts`, and `playwright.config.ts` where existing Resend assumptions no longer apply. Retain Node-specific Resend settings where they remain useful.
- Update `tests/unit/send-email.test.ts` and `tests/unit/config.test.ts`, or narrowly related tests, to cover the new Worker sender and runtime-specific requirements while preserving applicable Resend tests.

## Constraints

- Preserve the exported `EmailMessage` and `SendEmail` contracts in `src/email/send-email.ts`. Authentication continues to receive an injected sender and must not know the email provider.
- Preserve `createAuth`, verification requirements, password-reset behavior and email content, background task scheduling, recipient/link-free failure logging, and no automatic retries.
- Preserve the existing Resend HTTP sender's timeout and behavior for Node development. Do not claim that its HTTP timeout automatically applies to the native binding; confirm and document the binding's behavior rather than introducing unsupported cancellation or detached delivery.
- Keep `pnpm dev` on Node/SQLite and Worker preview on local D1. Preserve the development console fallback and optional real Resend delivery. Do not add real Cloudflare delivery to Node development.
- Local Worker preview and automated tests must simulate sending, without enabling remote email bindings or requiring real Cloudflare credentials.
- Remove obsolete Worker Resend-secret instructions and fake keys, not the still-supported Node development integration.
- Cloudflare Email Sending requires a Workers Paid plan, Cloudflare DNS, and an onboarded sender domain. Document these requirements and production setup accurately.
- Do not add SMTP dependencies, a generalized provider registry, retries, queues, or unrelated refactoring.

## Acceptance checks

- Focused sender tests confirm correct sender, recipient, subject, and text mapping; awaiting delivery; and propagation of delivery failures without logging sensitive message content. Existing Node Resend behavior remains tested.
- Configuration tests confirm Worker production no longer requires `RESEND_API_KEY`, still requires the configured sender, and preserves applicable Node development validation and fallback behavior.
- Confirm missing production binding/configuration fails clearly rather than silently falling back to console delivery.
- Run `pnpm exec vitest run tests/unit/send-email.test.ts tests/unit/config.test.ts`, including any narrowly related tests added for Worker email wiring, and `pnpm typecheck`.
- Run `pnpm test:worker` to exercise the actual Worker build and local D1. Confirm its setup uses local email simulation and no real credentials or remote email sends. Add a focused local simulated-send check if the existing smoke test does not exercise the changed sender.
- Run focused lint/format checks on edited files and any setup or verification commands newly promised in documentation. Do not rerun successful checks without a relevant change.
- Inspect the final diff for accidental changes to authentication, security, runtime boundaries, or Node development behavior. Confirm documentation distinguishes local simulation from real delivery.
- When deployment access, permission, and an onboarded sender domain are available, verify receipt of production verification and password-reset emails. Otherwise finish local verification and explicitly report live delivery as unverified, with the required external setup.
- Update the README progress entry after implementation and verification. Record only information needed for safe resumption in `## Notes`, including any blocked external verification.
