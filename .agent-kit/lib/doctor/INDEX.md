# doctor — the truth checks

**Why** — one file per group of checks, so a failing row points at the file that produced it and a
session reads only that group.

**Load it when** — a `doctor` row fails or a new check joins a group. Then open one row; `index.mjs`
holds the fix pass and the summary, not the checks.

| File | Holds | Open when |
|---|---|---|
| `index.mjs` | `cmdDoctor`: the `--fix` pass, the group order, the print | a check is added, removed or reordered |
| `structure.mjs` | required files, directory indexes, skill pointers, budget | an install is missing a file or an index |
| `git.mjs` | hook wiring, hook mode, commit identity | history or hooks look wrong |
| `install.mjs` | manifest integrity, module coverage, the 300-line ceiling | a module never reaches an install, or a file grew |
| `docs.mjs` | encoding, placeholders, paths, links, declared commands | a doc points at nothing, or a command is undeclared |
| `tasks.mjs` | task hygiene, statuses, subtasks, backlog | the active lane disagrees with its index |
| `rules.mjs` | learnings cap, checkable rules, the rule router | a rule is vague or unindexed |
| `history.mjs` | change cards, recent lists, release notes and tags | a close or a release is incomplete |
