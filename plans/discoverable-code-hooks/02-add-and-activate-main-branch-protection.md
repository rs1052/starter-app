# Add and activate main-branch protection

## Goal

Block direct commits to `main` and document clone activation.

## Scope

- Inspect existing hooks and README Local setup.
- Add executable `.githooks/pre-commit` with the behavior used by `rs1052/skincertain`.
- Add `git config core.hooksPath .githooks` explicitly to Local setup and explain that it enables committed hooks for this clone. Apply the global `apply-voice` skill to edited prose.
- Activate hooks in this clone, test both branch outcomes without committing, and run final verification.

## Constraints

- Use a small POSIX `sh` script. Only reject commits on `main`, printing `Cannot commit directly to main. Create a branch first.`
- Do not add Husky, a dependency, a lifecycle script, or a verification command to the hook. Keep local hook configuration out of `pnpm verify`.
- Test without disturbing the working branch or unrelated work. Report unrelated verification failures instead of fixing unrelated code.

## Acceptance checks

- The hook is executable, rejects `main` with a nonzero exit and the exact message, and succeeds on another branch.
- `git config core.hooksPath .githooks` succeeds and `git config --get core.hooksPath` returns `.githooks`.
- README Local setup documents activation and its per-clone effect.
- Run `pnpm verify`, inspect the final diff and Git status, and confirm no new dependency or repository skill.
