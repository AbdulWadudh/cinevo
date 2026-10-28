# Hallucination Guards

The guards that are not already covered by a style or domain rule. Each line is unique;
if a guard belongs to `typescript.md` or `database.md`, it lives there.

1. **No invented imports.** Every path must exist in the tree. Check `docs/ARCH_MAP.md`
   first; if the symbol is not documented, find the file before using it.
2. **No invented commands.** Build, test, lint and typecheck come from `.agents/project.md`
   only. A plausible command that is not declared is a guess, and a guess is not evidence.
3. **No invented config.** A new environment variable, feature flag or config key needs a
   home in the schema the repo already uses — not just in your file.
4. **No endpoint without a route.** A handler that nothing routes to is dead code pretending
   to be a feature.
5. **No "see the docs" without a path.** Cite the file. A doc claim that names no file cannot
   be verified, and `agent-kit doctor` cannot check it.
6. **No silent scope.** If the fix needs a file outside `touches`, stop and amend the task
   before editing. `task close` will reject the breach and it is cheaper to learn it now.
