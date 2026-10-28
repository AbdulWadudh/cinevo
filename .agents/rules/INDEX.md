# rules/

A rule is written once and loaded only where it applies, so an unrelated task does not pay
for it.

| Domain | File | Read when |
|---|---|---|
| Behaviour | `_behavior.md` | every session — evidence, scope, escalation |
| Repo memory | `learnings.md` | before planning anything |
| Hallucination guards | `anti-patterns.md` | adding an import, endpoint or dependency |
| Commits | `commits.md` | before the first commit of a task |
| Code style | `code.md` | writing or editing any `.ts` / `.tsx` file |
| Config & env | `config.md` | touching `.env*`, a `NEXT_PUBLIC_*` var, a storage key or a cron route |
| API & routes | `api.md` | adding or changing a route handler or a Server Action |

`INDEX.md` is the table `doctor` checks against this folder; a row without a file fails, and
a file without a row fails.

## Pipeline

A new domain rule: copy the matching example from `.agents/templates/rule-examples/`, edit it
to what this repo actually does, add the row to `INDEX.md`, then run
`agent-kit doctor --strict`. The steps for adding, changing or removing a rule are in
`.agents/templates/INDEX.md`.

## Not installed here, and why

- `biome` — this repo lints with ESLint 9 (`eslint.config.mjs`). A rule for a linter that is
  not installed is a rule nobody can run.
- `bun` — the project uses npm and commits `package-lock.json`. Bun runs the kit, not the app.
- `docs-lookup` — it describes a documentation-fetching workflow this repo does not have.

Two invariants `doctor` enforces: the table and the folder agree, and a rule reading a diff
cannot check fails. One home per fact — a duplicated rule already has one wrong copy.