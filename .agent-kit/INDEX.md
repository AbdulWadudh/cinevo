# .agent-kit — the repo's own context

**Why** — the repository carries the facts a session needs, so an agent loads them instead of
re-deriving them from the tree. Every file here is short for that reason.

**Load it when** — a task starts, or you do not know where a fact lives. Then open one row;
do not read the directory.

| Path | Holds | Open when |
|---|---|---|
| `agent-kit.mjs` | every command and gate, zero dependencies | debugging a gate or changing the kit |
| `SKILL.md` | the work loop: classify, open, gate, verify, close, report | every session, first |
| `project.md` | stack, entry points and the exact commands (the only home for commands) | every session |
| `docs/INDEX.md` | the codebase map: architecture, API shape, entry points | a task touches code you have not read |
| `rules/INDEX.md` | the rules router | every session, then only the matching rules |
| `tasks/INDEX.md` | lanes, gates, active task | before opening, resuming or closing a task |
| `tasks/BACKLOG.md` | parked candidates with a status; not tasks | looking for what is next, or recording a finding |
| `logs/INDEX.md` | the change-log model and the five newest changes | recording or looking up a change |
| `releases/` | one `vX.Y.Z.md` per release, rolled up from the change files | cutting or reading a release |
| `githooks/INDEX.md` | the optional commit guard | wiring or debugging the hooks |
| `templates/INDEX.md` | seeds, copyable rule examples, and the steps for adding or changing a rule | editing a seed or a rule |
| `sync-manifest.json` | what travels to a target repo, and what never does | installing, pulling, auditing the kit |

## How to load

- One index first, then one file. Follow a pointer only for the fact you need.
- `tasks/active/` and `tasks/archive/` are state. `task show` reads them; you do not.
- Never read a month folder in bulk. The index tells you which file answers the question.
- A fact has one home. If two files state it, one is wrong: keep the home, fix the pointer.
