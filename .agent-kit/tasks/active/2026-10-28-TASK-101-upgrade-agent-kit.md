---
id: TASK-101
parent: ""
lane: QUICK
status: IN_PROGRESS
created: 2026-10-28
baseline: 54e58eb0e1b58959cca06b3e0895a74d3b0df598
touches: [".agent-kit/", "AGENTS.md"]
depends_on: []
type: changed  # added | changed | fixed | removed
summary: ""
---
# TASK-101 — upgrade agent kit

## Scope (frozen once approved)

**Intent** — Upgrade the installed agent-kit to the newest release tag (v1.1.0) and migrate the
repo's kit docs to the new shape, following `.agent-kit/prompts/upgrade.md`.

**In scope**
- Pin the install to v1.1.0 (`pull --ref v1.1.0`): 58 rows — the monolith splits into `lib/`,
  adds `prompts/` and `rules/releases.md`, and gives `setup`/`check`/`pull` a `--ref`.
- Re-run `setup .` (local task ids; removes `.counter`, records ref/release/commit).
- Promote the two changed kit rows into `AGENTS.md` (`release --tag`, `check`/`pull [--ref]`).
- Hand-merge the Releases row into `.agent-kit/rules/INDEX.md`, keeping Cinevo's local
  `api.md` / `code.md` / `config.md` rows.

**Out of scope**
- `--ids issue` — the owner did not declare this repo shared on GitHub.
- `--force` and `--seeds` — `AGENTS.md` and `.agent-kit/docs/INDEX.md` keep authored content.
- The pre-existing lint failure in the baseline (24 errors) — unrelated to the kit.
- `task publish`, `task renumber`, `task new --from`, `task close --sync`, `| ids | local |`,
  and the "Task ids" section — none exist at v1.1.0 (`grep -r` over `.agent-kit`).

**Decisions**
- v1.1.0 is newest: `git ls-remote --tags` lists only v1.0.0, v1.0.1, v1.1.0.
- `rules/INDEX.md` stays locally modified on purpose; owner chose hand-merge over `--force`.
  It remains `DRIFT` in `check` by design (`.agent-kit/prompts/upgrade.md` step 5).
- Task ids are local by default at v1.1.0; there is no `--ids` flag to pass.
- `doctor --strict` context budget is red: `AGENTS.md` 17,585/9,000 and upstream's own
  `.agent-kit/SKILL.md` 10,039/10,000. Owner chose commit-now/trim-later; parked as `B-01`.
- Lint was red at the baseline (24 errors, 17 files under `src/`). Owner chose to leave
  TASK-101 open rather than close over the red; parked as `B-02`.
- `selftest` section 8 aborts with `EPERM: symlink` while copying `node_modules/@prisma/client`
  on Windows — environmental (needs Developer Mode), no backlog row.

## Plan

1. Pull v1.1.0 with no `--force` / `--seeds` (done).
2. Run `setup .`; confirm `template.json` ref/release/commit and `.counter` removal.
3. Add the Releases row to `rules/INDEX.md`; update the two `AGENTS.md` kit rows.
4. `doctor --strict` exits 0; `selftest` passes.
5. `task close`, then commit the pull as one change.

**Test plan** — command → expected.
- `agent-kit doctor --strict` → exit 0 (`releases.md` row resolves).
- `agent-kit selftest` → exit 0.
- `agent-kit check` → no `UPGRADE`/`MISSING` rows; the one `DRIFT` is `rules/INDEX.md`, by design.

## Baseline (before the change)

<!-- BASELINE:START -->
| Action | Command | Scope | Expected | Observed | Exit |
|---|---|---|---|---|---|
| build | `npm run build` | full | exit 0 | exit 0 | 0 |
| typecheck | `npm run typecheck` | full | exit 0 | exit 0 | 0 |
| lint | `npm run lint` | full | exit 0 | exit 1 | 1 |
<!-- BASELINE:END -->

## Verification

<!-- VERIFY:START -->
| Action | Command | Scope | Expected | Observed | Exit |
|---|---|---|---|---|---|
| typecheck | `npm run typecheck` | quick | exit 0 | exit 0 | 0 |
| lint | `npm run lint` | quick | exit 0 | exit 1 | 1 |
<!-- LOOP {"n":1,"fail":"lint","diff":"cdbbf1296e96d8bf","plan":"2b8403154f923fb0"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — <!-- FILL:summary — one short paragraph: what the task did and why. Reused in the change card and the commit body. -->

**Docs updated** — <!-- FILL:docs-updated — or "none needed: <reason>" -->

**Follow-ups** — `B-01` (trim `AGENTS.md` + the 39-char `SKILL.md` overage), `B-02` (24
pre-existing lint errors). TASK-101 closes once `verify` is green; both are prerequisites.

<!-- FILES:START -->
<!-- FILES:END -->
