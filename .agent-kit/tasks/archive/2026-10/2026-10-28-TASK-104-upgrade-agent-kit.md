---
id: TASK-104
parent: ""
lane: QUICK
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: b73de196082bff3bd1462403594b23ddc671a1f8
touches: [".agent-kit/", "AGENTS.md"]
depends_on: []
type: changed  # added | changed | fixed | removed
summary: "Upgrade the kit to v1.3.0, hand-merging the rows the pull skips"
---
# TASK-104 — upgrade agent kit

## Scope (frozen once approved)

**Intent** — "upgrade the agent-kit": take v1.3.0 from the recorded source, and record the task
id allocator the owner chose.

**In scope**
- `pull --ref v1.3.0`: the 33 upgrade/missing rows and the `.counter` prune; no `--force`, no `--seeds`.
- Hand-merge every row the pull skipped: `SKILL.md`, `rules/INDEX.md` (local edits), `AGENTS.md`,
  `tasks/INDEX.md`, `logs/INDEX.md` (seeds).
- `doctor --strict`, `selftest`, close and one commit.
- The owner's `ids: issue` is a follow-up `setup . --ids issue` run right after this close: setup
  refuses to switch allocator while a task is open.

**Out of scope**
- `--force` and `--seeds` — both overwrite authored files; the owner's earlier instruction stands.
- Product code (`src/`) — nothing in this upgrade touches it.
- v1.3.0's own `SKILL.md` (10,167 chars, over the 10,000 cap) — hand-merge its new paragraphs
  instead, keeping the trimmed file.

**Decisions**
- The owner chose `ids: issue` (2026-10-28), so `setup` gets `--ids issue` and must validate the
  GitHub credential; a failure stops the task rather than falling back to local.
- Two DRIFTs stay local on purpose: `SKILL.md` (cap) and `rules/INDEX.md` (Cinevo rows).

## Plan

1. `pull --ref v1.3.0`, then hand-merge the skipped rows.
2. `doctor --strict`, `selftest`, `task close`, commit.
3. `setup . --ids issue` (no task open), re-`doctor`, commit the ids row.

**Test plan** — command → expected.
- `agent-kit doctor --strict` → exit 0.
- `agent-kit check` → two `DRIFT` rows (`SKILL.md`, `rules/INDEX.md`), no `BEHIND`.
- `agent-kit start` → prints the derived five newest closes.

## Baseline (before the change)

<!-- BASELINE:START -->
| Action | Command | Scope | Expected | Observed | Exit |
|---|---|---|---|---|---|
| build | `npm run build` | full | exit 0 | exit 0 | 0 |
| typecheck | `npm run typecheck` | full | exit 0 | exit 0 | 0 |
| lint | `npm run lint` | full | exit 0 | exit 0 | 0 |
<!-- BASELINE:END -->

## Verification

<!-- VERIFY:START -->
| Action | Command | Scope | Expected | Observed | Exit |
|---|---|---|---|---|---|
| build | `npm run build` | full | exit 0 | exit 0 | 0 |
| typecheck | `npm run typecheck` | full | exit 0 | exit 0 | 0 |
| lint | `npm run lint` | full | exit 0 | exit 0 | 0 |
<!-- LOOP {"n":0,"fail":"","diff":"cc5e67376e8130b6","plan":"9c1774ff33e00e5b"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Pulled agent-kit v1.3.0 over v1.1.0: 33 machinery rows written, the `.counter`
file pruned, and the six rows the pull skipped (`SKILL.md`, `rules/INDEX.md`, `AGENTS.md`,
`tasks/INDEX.md`, `logs/INDEX.md`) hand-merged so the Cinevo rules and both length caps survive.
The kit now derives the five newest closes in `start` instead of storing them, and writes two
files per close instead of four.

**Docs updated** — `AGENTS.md`, `.agent-kit/SKILL.md`, `.agent-kit/rules/INDEX.md`,
`.agent-kit/tasks/INDEX.md`, `.agent-kit/logs/INDEX.md` — all inside the write set.

**Follow-ups** — `setup . --ids issue` runs immediately after this close (setup refuses while a
task is open). It writes `project.md`'s setup-owned `ids` row; that row gets its own commit.

<!-- FILES:START -->
- `.agent-kit/SKILL.md`
- `.agent-kit/agent-kit.mjs`
- `.agent-kit/lib/INDEX.md`
- `.agent-kit/lib/changelog.mjs`
- `.agent-kit/lib/consts.mjs`
- `.agent-kit/lib/doctor/history.mjs`
- `.agent-kit/lib/doctor/structure.mjs`
- `.agent-kit/lib/doctor/tasks.mjs`
- `.agent-kit/lib/env.mjs`
- `.agent-kit/lib/main.mjs`
- `.agent-kit/lib/project.mjs`
- `.agent-kit/lib/selftest/INDEX.md`
- `.agent-kit/lib/selftest/family.mjs`
- `.agent-kit/lib/selftest/index.mjs`
- `.agent-kit/lib/selftest/tasks.mjs`
- `.agent-kit/lib/setup.mjs`
- `.agent-kit/lib/sync.mjs`
- `.agent-kit/lib/taskfile.mjs`
- `.agent-kit/lib/tasks/INDEX.md`
- `.agent-kit/lib/tasks/close.mjs`
- `.agent-kit/lib/tasks/index.mjs`
- `.agent-kit/lib/tasks/open.mjs`
- `.agent-kit/lib/tasks/start.mjs`
- `.agent-kit/sync-manifest.json`
- `.agent-kit/template.json`
- `.agent-kit/templates/AGENTS.seed.md`
- `.agent-kit/templates/logs-INDEX.seed.md`
- `.agent-kit/templates/tasks-INDEX.seed.md`
- `AGENTS.md`
- `.agent-kit/lib/github.mjs`
- `.agent-kit/lib/selftest/ids.mjs`
- `.agent-kit/lib/selftest/issue.mjs`
- `.agent-kit/lib/tasks/issue.mjs`
- `.agent-kit/lib/tasks/publish.mjs`
- `.agent-kit/lib/tasks/renumber.mjs`
- `.agent-kit/lib/tasks/show.mjs`
<!-- FILES:END -->
