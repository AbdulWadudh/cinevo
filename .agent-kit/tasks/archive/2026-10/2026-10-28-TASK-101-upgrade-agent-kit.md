---
id: TASK-101
parent: ""
lane: PLANNED
status: DONE
closed: 2026-10-28
created: 2026-10-28
baseline: 54e58eb0e1b58959cca06b3e0895a74d3b0df598
touches: [".agent-kit/", "AGENTS.md", "src/"]
depends_on: []
type: changed  # added | changed | fixed | removed
summary: "Upgrade the kit to v1.1.0, clear the lint errors, trim AGENTS.md and SKILL.md"
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
- Reopened scope (owner, 2026-10-28): the two parked rows plus the hook mode are now the task.
- **B-01 trim, as built.** Tailwind v4 folded into `code.md` §8 instead of a new
  `tailwind.md`: `code.md` already owned Tailwind, and two homes for one rule was the thing
  the trim exists to remove. Core rules 1–3 keep one line each and point at `api.md` §5,
  `database.md` §1 and `theming.md` §1; old rule 4 was a duplicate of Boundary "Never" and
  was deleted. New files: `motion.md`, `pointer-and-touch.md`, `scroll.md`, `theming.md`,
  `nextjs.md`, `database.md`. "Codebase Control & Alignment" was deleted as narration — it
  restated `SKILL.md` §4–5, and its changelog constraint already lives in Boundary "Always".
- **Context budget after the trim.** `AGENTS.md` 8,800/9,000, `SKILL.md` 9,971/10,000,
  `rules/INDEX.md` 1,699/1,800, `rules/_behavior.md` 7,279/7,500 (UTF-16 lengths, as
  `doctor` counts them).
- **Intentional DRIFT now two rows.** `SKILL.md` is trimmed 68 chars below upstream (which is
  39 over its own cap); `rules/INDEX.md` carries Cinevo's rule rows. Neither is pulled over.
- **`selftest` still red, for reasons that predate this change.** Sections 3 and 7 fail on the
  same two fixture rows: `rules indexed` (`api.md`, `code.md`, `config.md` and the new domain
  files are repo rules, but `rules/INDEX.md` ships as machinery and setup does not install
  them into an empty fixture) and `doc paths resolve` (`docs/API_SKELETON.md` names `src/*`,
  absent from the fixture). Machine-level fix is a kit change; parked as `B-03`.
- Hook mode: `git update-index --chmod=+x` on both githooks; `doctor` now reports
  `hook mode PASS`.

## Plan

1. Pull v1.1.0 with no `--force` / `--seeds` (done).
2. Run `setup .`; confirm `template.json` ref/release/commit and `.counter` removal.
3. Add the Releases row to `rules/INDEX.md`; update the two `AGENTS.md` kit rows.
4. `doctor --strict` exits 0; `selftest` passes.
5. `task close`, then commit the pull as one change. (Done: 6f6f3eb.)

Reopened PLANNED for the two pending rows the upgrade left red. Owner's "continue with
pending ones" (2026-10-28) is the G1 go.

6. **B-02 lint.** Replace the 12 `any` with precise types (`tmdb.ts`, `watchSyncClient.ts`,
   `episodeNotifications.ts`, `tmdb-actions.ts`, `SearchClient.tsx`, `SeasonList.tsx`). Fix
   the 7 React Compiler findings with behaviour-preserving refactors: a `useIsMounted`
   (`useSyncExternalStore`) for `TrailerProvider`, derived `searchParams` genre in
   `BrowseSection`, keyed reset in `HoloCard`, lazy initial deal in `RevealClient`, storage
   read via `useSyncExternalStore` in `NotificationBell`, reorder/derive in `SearchClient`,
   refs into callbacks in `DomeGallery.jsx`. Prove: `npm run lint` 0 errors, build, typecheck.
7. **B-01 trim.** Done: React hooks and Tailwind v4 folded into `code.md`; the rest moved to
   `motion.md`, `pointer-and-touch.md`, `scroll.md`, `theming.md`, `nextjs.md`, `database.md`;
   `rules/INDEX.md` rewritten to 1,699 chars; `AGENTS.md` rewritten against the seed to 8,800;
   `SKILL.md` trimmed to 9,971.
8. `git update-index --chmod=+x` both githooks (done; `hook mode PASS`).
9. `verify --full` and `doctor --strict` green; `selftest` still shows the two fixture rows
   recorded in Decisions.

**Test plan** — command → expected.
- `agent-kit doctor --strict` → exit 0.
- `agent-kit selftest` → exit 0; currently 1, for the fixture rows in Decisions (`B-03`).
- `agent-kit check` → no `UPGRADE`/`MISSING` rows; the two `DRIFT` rows (`SKILL.md`,
  `rules/INDEX.md`) are by design.

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
| build | `npm run build` | full | exit 0 | exit 0 | 0 |
| typecheck | `npm run typecheck` | full | exit 0 | exit 0 | 0 |
| lint | `npm run lint` | full | exit 0 | exit 0 | 0 |
<!-- LOOP {"n":0,"fail":"","diff":"508018ad5837248c","plan":"503d1ad39632dbfb"} -->
<!-- VERIFY:END -->

## Close-out

**Summary** — Upgraded the installed agent-kit to v1.1.0 and cleared the rows that upgrade
left red. The 24 pre-existing lint errors are gone via types on the TMDB payloads and
behaviour-preserving React fixes; `AGENTS.md` is cut from 17,585 to 8,800 characters with the
product rules moved into six domain files behind `rules/INDEX.md`; `SKILL.md` is trimmed under
its own 10,000-char cap; both githooks are executable.

**Docs updated** — `AGENTS.md`, `.agent-kit/rules/` (six new domain files, `code.md` extended,
`INDEX.md` rewritten), `.agent-kit/SKILL.md`, `.agent-kit/tasks/BACKLOG.md`. No `CHANGELOG.md`
entry: kit docs plus a lint-only refactor, with no user-facing change.

**Follow-ups** — `B-03`: `selftest`'s empty fixture still fails `rules indexed` and
`doc paths resolve` for reasons the kit owns, not this repo.

<!-- FILES:START -->
- `.agent-kit/INDEX.md`
- `.agent-kit/SKILL.md`
- `.agent-kit/agent-kit.mjs`
- `.agent-kit/githooks/INDEX.md`
- `.agent-kit/lib/INDEX.md`
- `.agent-kit/lib/changelog.mjs`
- `.agent-kit/lib/consts.mjs`
- `.agent-kit/lib/doctor/INDEX.md`
- `.agent-kit/lib/doctor/docs.mjs`
- `.agent-kit/lib/doctor/git.mjs`
- `.agent-kit/lib/doctor/history.mjs`
- `.agent-kit/lib/doctor/index.mjs`
- `.agent-kit/lib/doctor/install.mjs`
- `.agent-kit/lib/doctor/rules.mjs`
- `.agent-kit/lib/doctor/structure.mjs`
- `.agent-kit/lib/doctor/tasks.mjs`
- `.agent-kit/lib/env.mjs`
- `.agent-kit/lib/guard.mjs`
- `.agent-kit/lib/io.mjs`
- `.agent-kit/lib/learnings.mjs`
- `.agent-kit/lib/main.mjs`
- `.agent-kit/lib/manifest.mjs`
- `.agent-kit/lib/project.mjs`
- `.agent-kit/lib/release.mjs`
- `.agent-kit/lib/selftest/INDEX.md`
- `.agent-kit/lib/selftest/family.mjs`
- `.agent-kit/lib/selftest/index.mjs`
- `.agent-kit/lib/selftest/install.mjs`
- `.agent-kit/lib/selftest/loop.mjs`
- `.agent-kit/lib/selftest/release.mjs`
- `.agent-kit/lib/selftest/rules.mjs`
- `.agent-kit/lib/selftest/state.mjs`
- `.agent-kit/lib/selftest/surface.mjs`
- `.agent-kit/lib/selftest/tasks.mjs`
- `.agent-kit/lib/setup.mjs`
- `.agent-kit/lib/sync.mjs`
- `.agent-kit/lib/taskfile.mjs`
- `.agent-kit/lib/tasks/INDEX.md`
- `.agent-kit/lib/tasks/close.mjs`
- `.agent-kit/lib/tasks/index.mjs`
- `.agent-kit/lib/tasks/open.mjs`
- `.agent-kit/lib/tasks/start.mjs`
- `.agent-kit/lib/verify/INDEX.md`
- `.agent-kit/lib/verify/evidence.mjs`
- `.agent-kit/lib/verify/index.mjs`
- `.agent-kit/prompts/INDEX.md`
- `.agent-kit/prompts/docs-populate.md`
- `.agent-kit/prompts/kit-review.md`
- `.agent-kit/prompts/trim-agents-md.md`
- `.agent-kit/prompts/upgrade.md`
- `.agent-kit/rules/INDEX.md`
- `.agent-kit/rules/_behavior.md`
- `.agent-kit/rules/releases.md`
- `.agent-kit/sync-manifest.json`
- `.agent-kit/template.json`
- `.agent-kit/templates/AGENTS.seed.md`
- `.agent-kit/templates/INDEX.md`
- `AGENTS.md`
- `.agent-kit/githooks/commit-msg`
- `.agent-kit/githooks/pre-commit`
- `.agent-kit/rules/code.md`
- `src/app/actions/tmdb-actions.ts`
- `src/components/NotificationBell.tsx`
- `src/components/TrailerProvider.tsx`
- `src/components/dashboard/BrowseSection.tsx`
- `src/components/reactbits/DomeGallery.jsx`
- `src/components/reveal/HoloCard.tsx`
- `src/components/reveal/RevealClient.tsx`
- `src/components/search/SearchClient.tsx`
- `src/components/watch/SeasonList.tsx`
- `src/lib/episodeNotifications.ts`
- `src/lib/tmdb.ts`
- `src/lib/watchSyncClient.ts`
- `.agent-kit/rules/database.md`
- `.agent-kit/rules/motion.md`
- `.agent-kit/rules/nextjs.md`
- `.agent-kit/rules/pointer-and-touch.md`
- `.agent-kit/rules/scroll.md`
- `.agent-kit/rules/theming.md`
<!-- FILES:END -->
