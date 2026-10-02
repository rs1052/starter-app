# Agent guidance

- Inspect the relevant code and Git state before changing files. Preserve unrelated work and existing public behavior.
- Choose the smallest direct implementation that meets the current requirement. Reuse existing code and platform features before adding dependencies, files, configuration, state, or abstractions.
- Organize routes, views, styles, and tests by feature or responsibility as the application grows. Put reusable server-rendered UI primitives in `src/views/components/`, layouts in `src/views/layouts/`, and route-level views in `src/views/pages/`, grouping pages by product area when useful. Give independently reusable primitives their own named modules, keep private helpers with their owner, and add feature partials only for actual reuse. Do not create files for trivial private helpers or split solely by line count. Tests should generally mirror production feature boundaries.
- While the app is in early development, keep tests minimal: write one happy-path unit test per piece of functionality and one happy-path E2E test per page. Add negative, edge-case, or duplicate coverage only when a concrete risk or bug justifies it.
- Keep Node, SQLite, Cloudflare, and D1 details inside their runtime boundaries. Keep shared application and database-facing behavior runtime-neutral and asynchronous.
- Verify current external APIs instead of guessing. Pin compatible dependencies and explain any required configuration.
- Validate external input, enforce authorization on the server, bound request bodies, escape user-controlled output, preserve authentication headers, and keep secrets out of source control.
- Build semantic, keyboard-accessible HTML with labels, landmarks, logical headings, visible focus, status messages, and usable no-JavaScript fallbacks where practical.
- Run the narrowest relevant checks while working, then document and run all setup or verification commands promised to users. Report failures honestly and leave no generated runtime state in Git.
- Never discard or overwrite user changes. Inspect the final diff and repository status before finishing.
- For work that needs a plan, use the global planning skill and follow its workflow. Do not copy the skill into this repository.
