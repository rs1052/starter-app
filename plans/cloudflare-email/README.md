# Cloudflare email delivery

## Reusable implementation prompt

Implement or resume the approved plan in `plans/cloudflare-email/`.

Read this README and the next incomplete numbered step file. Inspect the current code and Git state before changing anything. Use repository evidence rather than blindly trusting the progress checklist. Implement and verify the next step, then update its progress entry and add or update `## Notes` only with information needed to resume safely. Continue through later steps automatically without approval checkpoints. Preserve unrelated changes and stay within the approved scope. Resolve questions and blockers autonomously when possible. Ask the user only when a required decision, permission, or action cannot be handled autonomously.

## Progress

- [x] 01: Replace production Resend delivery with Cloudflare Email Sending

## Approved plan

Use Cloudflare Email Sending's native Workers binding for production delivery. Easy provider replacement is sufficient; SMTP is not required. Preserve the existing provider-neutral `EmailMessage` and `SendEmail` contracts so authentication and message content remain independent of the delivery provider.

### Goal

Replace production Resend delivery with Cloudflare Email Sending without changing authentication behavior.

### Required outcomes

- Configure an `EMAIL` send binding in `wrangler.jsonc` and inject its sender in `src/runtime/cloudflare.ts`.
- Keep `EMAIL_FROM` and remove the Worker production requirement for `RESEND_API_KEY`.
- Preserve Node development's console email fallback and optional real Resend delivery.
- Update environment examples, deployment and preview documentation, focused tests, and test configuration to match the new runtime behavior.
- Keep Worker preview and automated tests local, with simulated email delivery rather than remote sending.

### Preservation constraints and non-goals

- Preserve `EmailMessage`, `SendEmail`, `createAuth`, verification and password-reset content, background scheduling, generic failure logs, and no automatic retries.
- Preserve existing security protections and runtime boundaries.
- Do not add SMTP, a provider-selection framework, a separate production server, or unrelated cleanup.
- Keep Resend support only where already used by Node development. Real Cloudflare email sending from Node development is outside this scope.

### Permitted areas

The email adapter, runtime wiring and configuration, `wrangler.jsonc`, environment examples, README email/setup guidance, focused sender and configuration tests, and preview/test configuration in `scripts/smoke-worker.ts` and `playwright.config.ts`.

### Acceptance

Verify message mapping and failure handling, production configuration without a Resend secret, preserved Node development behavior, and local Worker preview/test delivery without real emails. Run focused unit tests, type checking, and the Worker smoke test. Check actual production verification and password-reset delivery when Cloudflare deployment access and an onboarded sender domain are available.

### Preconditions and external verification

Cloudflare Email Sending requires a Workers Paid plan, Cloudflare DNS, and an onboarded sender domain. Consult current official documentation and installed binding types before implementation:

- [Workers email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [Email Sending setup](https://developers.cloudflare.com/email-service/get-started/send-emails/)
- [Local email development](https://developers.cloudflare.com/email-service/local-development/sending/)

Resolve implementation details from repository evidence. Ask the user only if required Cloudflare access, configuration, or deployment permission is unavailable. Report live-delivery verification as pending if it cannot be performed; do not block local implementation or claim simulated delivery proves production delivery.

## Notes

- Implemented the Cloudflare sender at the Worker runtime boundary, configured the local `EMAIL` binding, removed Worker Resend-key requirements, and updated preview/deployment documentation and focused tests. Node development and its Resend adapter remain unchanged; `.env.example` and `playwright.config.ts` still correctly describe Node development and needed no edits.
- Focused sender/configuration tests passed (26 tests), followed by a successful sender-test rerun after replacing a test helper unsupported by the configured TypeScript library. Type checking, focused TypeScript ESLint, formatting checks, and `pnpm test:worker` passed. The Worker smoke test checks actual local binding simulation during signup, without credentials or real email sends.
- Markdown CLI checks unexpectedly included dependency Markdown files and failed on those files. Focused Markdown checks passed using the installed lint API for the README and plan files, without changing repository-wide lint configuration. Diff whitespace checks passed.
- Live production verification and password-reset delivery remain unverified. The committed configuration still uses placeholder domain/database values. Complete Cloudflare Email Sending onboarding on a Workers Paid account with Cloudflare DNS, configure the sender and deployment, then verify both flows with a real inbox. No deployment or real email sending was performed.
