# Discoverable code and main-branch protection

<!-- vale off -->

## Reusable implementation prompt

Implement or resume the approved plan in `plans/discoverable-code-hooks/`.

Read this README and the next incomplete numbered step file. Inspect the current code and Git state before changing anything. Use repository evidence rather than blindly trusting the progress checklist. Implement and verify the next step, then update its progress entry and add or update `## Notes` only with information needed to resume safely. Continue through later steps automatically. Preserve unrelated changes. Stop only for an unresolved requirement, blocked verification, required user action, or a change to the approved scope.

<!-- vale on -->

## Progress

- [x] 01: Add discoverable-code guidance and audit names
- [x] 02: Add and activate main-branch protection

## Approved plan

### Discoverable-code guidance and naming audit

Inspect the repository structure, `AGENTS.md`, `README.md`, `package.json`, source, tests, and Git status before editing. Preserve unrelated work and keep `AGENTS.md` the main home for repository-wide guidance. Do not add a dependency or repository skill unless inspection finds a concrete need that guidance cannot address.

Distill [How coding agents read your code](https://modem.dev/blog/how-coding-agents-read-your-code) into practical rules, not an explanation of LLMs:

- Treat filenames, paths, exported symbols, types, and identifiers as text-search terms. Prefer concise domain or responsibility names over generic names such as `create`, `handle`, `data`, `result`, `config`, or `client` when specificity helps. Make important exported functions, types, classes, and modules easy to find without excessively long names.
- Use one term and spelling per concept. Avoid unnecessary aliases and synonyms.
- Keep TypeScript contracts precise. Prefer useful domain types over `any` or vague types.
- Put short comments at definitions to explain important reasons, constraints, or non-obvious behavior that code cannot express. Do not restate code.
- Match source/test basenames when a test clearly covers one module. Leave integration and behavior tests named for the behavior they cover.
- Remove obsolete code when practical. Clearly deprecate obsolete public code that must remain temporarily.
- Make definitions and types understandable without tracing several unrelated files.

Audit `src/` and `tests/` in this order: exported/public symbols, paths, exported types, source/test relationships, then ambiguous private names. Review `page` in `src/http/page.ts`, `registerErrors` in `src/routes/errors.ts`, `Assets` and the layout filename in `src/views/layouts/app.ts`, `Message` and its component filename, and the email test's mismatch with `src/email/send-email.ts`. Also check other generic exports such as `Config`, `Result`, `Data`, `Handler`, `create`, and `process`. Short names are acceptable when domain and directory context are clear.

Rename only where it materially improves discovery or better describes the responsibility. Update imports and references, preserve behavior and public contracts, and do not add compatibility aliases for internal names. Run targeted tests after each group of related renames. Apply the globally installed `apply-voice` skill to edited prose without dropping technical rules.

### Main-branch protection

Copy the behavior of `rs1052/skincertain`'s `.githooks/pre-commit`: add a small executable POSIX `sh` hook that rejects commits on `main` with this exact message:

```text
Cannot commit directly to main. Create a branch first.
```

The hook must only block direct commits to `main`. Do not add a hook dependency or project verification. Add `git config core.hooksPath .githooks` explicitly to README Local setup and explain that it enables committed hooks for that clone. Do not hide configuration in package-install lifecycle scripts or add it to `pnpm verify`.

### Verification and expected result

Confirm executable permissions, configure this clone's hooks path, and check that `git config --get core.hooksPath` returns `.githooks`. Exercise the hook on `main` and a non-main branch without making a test commit. Check the exact failure message and nonzero exit on `main`, and success elsewhere.

Search for stale renamed identifiers and filenames. Check source/test naming without forcing one-to-one names on integration tests. Run affected narrow tests while working, then finish with `pnpm verify`. Report unrelated failures without changing unrelated code. Inspect the final diff and Git status.

The result should have concise guidance in `AGENTS.md`, targeted naming improvements, updated references/tests, the committed executable hook, explicit clone activation instructions, no new skill or dependency, and passing normal verification.

## Notes

- Renamed `page` to `renderPage`, `registerErrors` to `registerErrorHandlers`, `Assets` to `PageAssetPaths`, and `Message` to `FeedbackMessage` in `feedback-message.ts`. Renamed the email unit test to `send-email.test.ts`. Kept the layout path and integration test names because their context is clear.
- The Skincertain raw hook URL returned 404. The hook uses the exact behavior and message required by the approved plan.
- Configured this clone's `core.hooksPath` as `.githooks`. Verified executable permissions, rejection on the working `main` branch (exit 1 and exact message), and success in a disposable repository on a non-main branch (exit 0). Testing did not create a commit or switch the working branch.
- Focused tests passed. The complete `pnpm verify` passed, including 31 unit tests, four browser behavior tests, seven accessibility tests, and the Worker smoke test. Stale-reference searches passed. Prose lint passed without errors. The generated reusable prompt is excluded from Vale to preserve the skill's standard text.
