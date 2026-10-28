# Cinevo — Agent Entry Point

You are working in Cinevo, a cinematic streaming front-end (movies, TV, live radio) built
on Next.js 16 and Prisma. Read this file once per session, then follow it.

Cinevo is a streaming front-end that behaves like a premium app rather than a catalogue
with links: inline trailer previews, spatial D-pad navigation for TV, a live-radio wing with
its own player, and a theme studio that can repaint the whole site.

## Start here, in order

1. `SKILL.md` — the work loop: classify, open, gate, verify, close, report. Follow its order.
2. `.agents/project.md` — stack, commands, entry points, generated directories. Cite it; never restate it.
3. `.agents/tasks/INDEX.md` — resume the active task, or open a new one.
4. `.agents/rules/INDEX.md` — load only the rule files matching what you will touch.
5. `docs/INDEX.md` — find where the logic lives before searching the tree.
6. `CHANGELOG.md` — read it before proposing a feature; it records what already ships.
7. Any other directory you open has an `INDEX.md`: read that first, then the one file it names.

## Boundary protocol

**Always**
- Read before writing. Keep every edit inside the task's declared `touches`.
- Run `agent-kit verify` before and after edits; it is the quick suite. The full one runs at the
  baseline and at `task close`. Evidence goes in the task file; memory does not count.
- Take the smallest complete change: reuse what exists, delete before adding, no speculative abstraction.
- Update `CHANGELOG.md` in the same change that ships the work, and keep `README.md` in step
  when a change adds a user-facing feature, a new script, or alters setup steps.

**Ask first**
- New dependency, schema or migration, public interface change.
- Anything under `.env`, `.env.example`, `.env.local` — secrets and the documented env surface.
- Any edit to a migration under `prisma/migrations/` (see rule 2: they are append-only).
- `android-twa/` signing material: `*.keystore`, `*.jks`, `android-signing-key-info.json`,
  `local.properties`. Losing or leaking a signing key means the Play listing can never be updated.
- `releases/` and the committed `app-release-*.apk` / `*.aab` artifacts — these are release
  outputs, not workspace noise.
- Deleting files, rewriting generated output, or anything irreversible.

**Never**
- Invent a path, a command or an export. If it is not in `project.md` or in the tree, it does not exist.
- Edit a generated directory (listed in `project.md`): `.next/`, `build/`, `node_modules/`,
  `next-env.d.ts`, `*.tsbuildinfo`, `android-twa/app/build/`, or the Prisma client output
  path named in `project.md`.
- Close a task with edits it does not record.
- Commit as the session. Git's configured identity is the author — never `-c user.name`, never
  `-c user.email`, never a name from the conversation — and no `Co-Authored-By`, "Generated with",
  or any other AI attribution in a commit, PR or changelog. It is `.agents/rules/commits.md`.
- Hand the user a command to run. Execute it, then report the result in one or two lines. If this
  environment cannot execute it, say so and stop — never hand over a script, and never claim the
  step passed.

## Core rules

1. **Every admin action is gated.** A Server Action that reads or writes admin-scoped data
   calls `requireAdmin()` before its first query and throws `Error("Forbidden")` otherwise.
   The guard is defined per module in `src/app/actions/admin.ts`, `providers.ts` and
   `radio.ts`; a new admin action copies it rather than trusting the caller.
2. **Migrations are append-only.** Never edit a directory under `prisma/migrations/` that has
   run anywhere. A schema change is `prisma/schema.prisma` plus a new timestamped migration
   directory, and the change file says which one.
3. **The theme is resolved once per request.** `getActiveThemeState()`
   (`src/lib/theme/active.ts`) is the only reader of the theme cookie and the published
   theme row. A component or page takes the resolved state as a value; it does not parse
   `k79_theme_state` or query the site-theme table itself.
4. **Generated output is never edited.** `.next/`, `build/`, `node_modules/`,
   `next-env.d.ts` and `*.tsbuildinfo` are produced by a command, and so is the Prisma
   client. A fix that belongs in one of them belongs in its source, or in the command that
   generates it.

5. **Context discipline.** Every directory the kit owns carries an `INDEX.md`: read the index, then the one file it points at — never list a folder into context. Search narrowly; read at most three source files at a time. History (`.agents/tasks/archive/`, `.agents/logs/MM-YYYY/`) is read only when the user asks; the indexes list the five newest entries for you.
6. **One home per fact.** A rule lives in exactly one file; everywhere else cites it.
7. **Planning.** Anything beyond the QUICK lane (three files or fewer, reversible, no contract change) needs a task file in `.agents/tasks/active/`, with the plan approved before the first edit.
8. **Subagents.** Every subagent prompt names the files to read and the deliverable. It never restates the plan.
9. **Shell output.** Prefix commands with `rtk` (`rtk git status`, `rtk npm test`); `rtk bypass <cmd>` when the full output is the evidence. Name the active task ID with any savings you report — the detail is in `SKILL.md` §Shell output.

## Done means

The quick suite and the full one are green (the full one is `verify --full`, which `task close`
runs itself), the task's evidence table holds real exit codes, `.agents/tasks/INDEX.md` is
current, and `agent-kit doctor` reports no failures. Then `agent-kit task close`.

A task too big for one sitting splits into subtasks (`task new --parent TASK-N`). A subtask
closes on the quick suite: `task close` marks it DONE and keeps it in `active/`. The main
task's close is the milestone — it refuses while a subtask is open, runs the full suite, and
build failures are fixed right there before it closes; green, it archives the family
under one change file and one commit message.

---

<!-- MACHINERY: everything below is the kit. Keep it as written. -->
## Kit

`bun scripts/agent-kit.mjs <command>` (fallback: `node scripts/agent-kit.mjs <command>`)

| Command | Use |
|---|---|
| `doctor` | truth checks over docs, declarations and tasks; `--strict` also fails on unfilled markers; `--fix` repairs encoding only; `--json` for CI |
| `harnesses` | list the coding agents installed on this machine (HOME, PATH, repo) — the repo may show none; a report, not a gate |
| `start` | read-only session brief: branch, declared commands and their tiers, active tasks, the gate, last evidence, loop and stale state, and one next action |
| `task new <slug> --lane quick\|planned [--parent TASK-N]` | open a task **and record the baseline run**, a full one (`--no-baseline` to skip); `--parent` opens `TASK-N.M`, queues the main task, and records a quick baseline |
| `task show` | print the active task's scope, plan and evidence — the thing G1/G2 asks a human to read |
| `task block "<question>"` | park the in-progress task on an owner decision; it stops holding the slot and the question waits in the file |
| `task resume [<id>]` | continue a blocked task; pass the id when more than one is waiting |
| `task close` | a subtask runs the **quick** suite, is marked DONE and stays active for the main close; the main task refuses while a subtask is open, runs the **full** suite, scope-checks against git (its own write set plus every subtask's), records the inventory, archives the family, writes one change file under `.agents/logs/MM-YYYY/`, and prints a ready commit message; `--pr` adds a PR body; `--amend "<why>"` accepts a declared breach and writes the reason into the plan; `--no-verify` only when the suite cannot run here |
| `release <version>` | write `releases/vX.Y.Z.md` from the change files no earlier release claims; prints the `gh release create --notes-file` line and never runs git |
| `verify` | the inner loop: runs the `always` rows and writes the evidence table; `--full` adds the `milestone` rows, which the baseline and `task close` already run; at three identical red runs it refuses until the Plan changes |
| `task guard [--message <file>]` | the hooks: `pre-commit` refuses a commit outside the declared write set (silent when no task is open); `commit-msg` warns — never blocks — on a subject that is not `type (TASK-ID): summary` or a body with no summary. **Opt-in per clone** via `git config core.hooksPath .githooks` |
| `learnings archive` | move entries past the 30 cap into `.agents/learnings/archive/`; the live list is the part a session reads |
| `check` / `pull --dry-run` / `pull` | drift against the template; `pull` never overwrites a locally modified file without `--force` |

The owner is not expected to type any of this. The agent runs `task new` and `task close`, and
`task close` is where the write set is checked — that check always runs. The hooks are a
per-clone extra that warns earlier; they are off unless someone opts in, because it is git
config and a shared repo must not rewrite a teammate's git behaviour on install.

`SKILL.md` is the work loop; this file is the contract it runs under. A harness with its own
skill folder gets a pointer to that one file, never a copy that drifts.

---

<!-- REPO RULES: Cinevo's own house style. These predate the kit and outrank it. -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Motion & Animation — use it everywhere, heavily

Cinevo is a cinematic, premium product. **Every** new or changed UI element should
move. Treat animation as a default, not a finishing touch — static UI is a bug here.

- **Library:** use [`motion`](https://motion.dev) (already a dependency) for component
  animation in client components — `import { motion, AnimatePresence } from "motion/react"`.
  Use Tailwind transitions / CSS keyframes for simple hover and state changes.
- **Apply broadly:**
  - **Entrance:** fade/slide/scale content in on mount and on scroll into view
    (stagger lists and grids).
  - **Hover & press:** scale, lift, glow, and color transitions on every interactive
    element (cards, buttons, links, icons).
  - **Layout & route changes:** animate mounts/unmounts with `AnimatePresence`; animate
    reordering with `layout`.
  - **Micro-interactions:** loaders, toggles, dropdowns, modals/overlays, skeletons,
    and feedback states (added-to-wishlist, copied, etc.) should all be animated.
- **Feel:** prefer spring or ease-out curves, short durations (150–400ms), and subtle
  stagger. Keep it smooth and intentional — animate `transform`/`opacity` (GPU-friendly),
  avoid animating layout-thrashing properties.
- **Accessibility:** respect `prefers-reduced-motion` — gate non-essential motion behind it.

When in doubt, add motion. A new screen, card, list, or control should never ship
without an entrance animation and interactive hover/press feedback.

# Codebase Control & Alignment

The user retains complete control over code style, structure, and design decisions. Antigravity must:

- Ensure the user is fully aligned before proceeding with code changes.
- Follow the approved implementation plan exactly.
- Adhere strictly to the requested codebase patterns and style guidelines without imposing arbitrary deviations.
- **Changelog Consultation:** Always read the `CHANGELOG.md` file first before writing code or suggesting new features. This helps you understand what systems are already implemented (e.g. watch progress sync, spatial D-pad navigation, PWA settings, brand portals) and prevents duplicating existing work.
- **Changelog Maintenance:** Update `CHANGELOG.md` in the same change that ships the work — never as a follow-up. Record what the code actually does, not what was intended: if an entry becomes untrue (a control moved, a behaviour was replaced), correct it rather than leaving it to rot. Genuine bugs fixed along the way belong under `Fixed` with the cause, not buried inside a feature bullet. Keep `README.md` in step when a change adds a user-facing feature, a new script, or alters setup steps.

# Hover Interactions & Touch

Hover is a pointer-only affordance — it does not exist on touch. Any control
revealed by hover must have a touch-reachable equivalent, or the feature is
simply missing on phones.

- Never hide a **primary** action behind hover. Favourite, play, and anything
  destructive stay visible at all times on small screens.
- Secondary/admin actions may collapse on desktop, but on touch they must be
  either always visible or reachable from a tap-opened sheet or menu.
- Tap targets are at least **44×44px** on touch; the compact desktop sizes
  (`size-6`, `p-1.5`) are too small for a finger.

**Gate on input capability, never on width.** `md:` describes how wide the
viewport is, which says nothing about whether the device can hover. An iPad in
landscape is 1024–1366px CSS pixels — comfortably past `md` — so width-based
gating hands a tablet the mouse-only UI and the controls become unreachable.
A touch laptop is the mirror image: wide *and* touch-capable, but it has a
real pointer and should get the hover UI.

Use the pointer media features instead (Tailwind v4 ships variants for them):

| Variant              | Media query                    | Matches                          |
| -------------------- | ------------------------------ | -------------------------------- |
| `pointer-fine:`      | `(pointer: fine)`              | mouse / trackpad / stylus        |
| `pointer-coarse:`    | `(pointer: coarse)`            | finger — phones, tablets, iPad   |
| `any-pointer-fine:`  | `(any-pointer: fine)`          | *some* precise input is attached |

- `hover:` is already wrapped in `@media (hover: hover)` by Tailwind v4, so
  hover *styles* are safe on their own. It's the visibility gating that has to
  be pointer-based.
- `pointer:` reflects the **primary** input, so an iPad with a Magic Keyboard
  correctly reports `fine` and gets the pointer UI. That's the behaviour we
  want — follow the primary pointer, not the presence of a touchscreen.

# Scroll Containment

A long list belongs to its panel, not to the page. Whenever a section can hold
an unbounded number of entries — a paginated table, the station catalogue, a
report queue, search results — cap its height and give **that container** the
scrollbar. The page must not grow with the data.

- Bound the scrolling element (`max-h-[60vh]`, or a `calc()` against the
  viewport) and give it `overflow-y-auto` **and** `overscroll-contain`, so
  reaching the end of the list doesn't start scrolling the page behind it.
- Everything that frames the list — panel header, search box, filter tabs,
  pagination — stays *outside* the scroll container and therefore stays on
  screen. Controls scrolled out of reach are exactly the bug this prevents:
  paging through 25 rows shouldn't mean scrolling 1,800px to find "next page".
- Reset the container to the top when its contents are replaced (page change,
  filter change, new query), or page 2 opens halfway down.
- Leave room for the scrollbar (`pr-1`) so it doesn't sit on top of row content.
- Wide content (tables, code, long URLs) scrolls sideways inside its own
  `overflow-x-auto` container; the page body never scrolls horizontally.

`/radio` already applies this at screen level — the masthead, section tabs and
category chips are fixed furniture and the station grid owns the only
scrollbar. Any panel that can fill up gets the same treatment.

# React Hooks & Code Standards

- Always wrap functions in `useCallback` when they are passed as dependencies to `useEffect` or other hooks to prevent cascading triggers and maintain reference stability.
- Adhere to ESLint rules like `react-hooks/exhaustive-deps` without exceptions.

# Tailwind CSS v4 Code Conventions

- Prefer native/utility values over arbitrary values:
  - Write `aspect-video` instead of `aspect-[16/9]`.
  - Write `bg-linear-to-b` instead of `bg-gradient-to-b` (using the new Tailwind v4 syntax for linear gradients).
  - Write opacity fractions directly: e.g. `bg-white/10` instead of `bg-white/[0.1]`, `border-white/4` instead of `border-white/[0.04]`, and `w-40` instead of `w-[160px]`.

# Franchise / Studio Theming & Consistency

- **Scroll Consistency:** Ensure themed franchise portals maintain their visual identity across the entire height of the page. Use tinted background bases (e.g., very dark themed solid backgrounds like `bg-[#0c0202]` overlayed with a top linear-to-b transparent gradient) rather than gradients that fade away to solid black.
- **Dynamic Action Styling:** Always dynamic-theme interactive components (such as "Load More" buttons, pagination spinners, movie tags, active back buttons, play button overlays) to use the active franchise's accent colors rather than defaulting to the global red accent.