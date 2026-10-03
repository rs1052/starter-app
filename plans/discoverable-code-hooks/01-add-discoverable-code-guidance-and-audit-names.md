# Add discoverable-code guidance and audit names

## Goal

Add concise discoverable-code rules and improve only vague names that hinder discovery.

## Scope

- Inspect repository structure, Git status, `AGENTS.md`, `README.md`, `package.json`, source, and tests.
- Add rules to `AGENTS.md` based on [How coding agents read your code](https://modem.dev/blog/how-coding-agents-read-your-code): searchable paths and identifiers, concise domain-specific exports, consistent terms, precise TypeScript types, comments at definitions, matching single-module test basenames, removal or explicit deprecation of obsolete code, and definitions understandable from their types.
- Audit `src/` and `tests/` in this order: public exports, paths, exported types, test relationships, then ambiguous private names. Review `page`, `registerErrors`, layout `Assets`, the layout filename, the `Message` component and filename, and the email test basename. Check other generic exports without assuming short names are wrong.
- Update every import and reference for justified renames. Run focused tests after each group of related renames.

## Constraints

- Keep guidance short and practical, in `AGENTS.md`. Do not add a repository skill or dependency.
- Avoid cosmetic renames, unnecessary aliases, and forced module names for integration tests. Preserve behavior and public contracts.
- Apply the global `apply-voice` skill to edited prose while preserving all technical rules.

## Acceptance checks

- All discoverability rules appear concisely in `AGENTS.md`.
- Each rename materially improves discovery or better describes responsibility.
- Searches confirm that active code and documentation do not contain stale renamed identifiers or old paths. Historical audit candidates in the approved plan may remain.
- Affected tests pass, and source/test relationships remain clear.
