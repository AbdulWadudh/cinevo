# Populate the docs

Run this when `.agent-kit/docs/` is still the seed, when the owner says "populate the docs", or when a
large change has left the map thin. It is one PLANNED task: it edits many files, asks once,
and halts at both gates.

The output is four filled files, a learnings list that explains the code's exceptions, and a
backlog that holds every TODO you found. No product code changes.

## Open the task

```bash
agent-kit task new docs-populate --lane planned
```

Declare `touches`: `.agent-kit/docs/`, `.agent-kit/project.md`, `.agent-kit/rules/learnings.md`,
`.agent-kit/tasks/BACKLOG.md`. A domain rule file is a different task; do not add one here. If
`BACKLOG.md` is missing (an older install), start it from
`.agent-kit/templates/backlog.seed.md`.

At G1, state the tree you will read, the questions you expect, and the command that proves the
result: `agent-kit doctor --strict`.

## 1. Read the tree, not the wish

Inventory before writing. Keep the place each fact came from as `path:line`; a fact without a
location is a guess and does not go in a page.

- **Directories** — what exists, what imports what, which are generated or vendored.
- **Entry points** — the command, the handler, the boot order, what runs first.
- **Public surface** — exported functions and types; signatures only.
- **Config** — where values are read, defaults, environment-only behaviour, load order.
- **Commands** — manifests, Makefiles, CI; which one is authoritative when two disagree.
- **Exception comments** — `eslint-disable`, `@ts-expect-error`, `noqa`, `SAFETY`, `HACK`,
  `WORKAROUND`, `intentional`, `DON'T`: each is a decision the code carries in a comment.
- **TODO markers** — `TODO`, `FIXME`, `XXX`, `HACK`: work someone chose not to do yet.

Write down what the tree cannot answer. That list is the interview.

## 2. Interview — only the gaps

Ask three to five questions in one message, each with two or three options and your
recommendation. Ask only what the code cannot answer: why a boundary exists, which of two
commands is the real one, what an empty config means, where the deploy target is, which
behaviour is intentional. Do not ask what a file already says.

Wait for the answers. Write each one where it lives: a stack fact in `.agent-kit/project.md`
(domain notes), a boundary or flow in the page it explains. An answer that stays in chat is
gone at the next session.

## 3. Fill the pages

- `.agent-kit/docs/ARCH_MAP.md` — one row per directory that exists: responsibility, pure or side-effect,
  import rule. Delete a row whose directory is gone; never invent a layer.
- `.agent-kit/docs/ENTRY_POINTS.md` — one row per real entry point, then the primary flow as one hop per
  line. `doctor` checks every path written here.
- `.agent-kit/docs/API_SKELETON.md` — exported signatures only, grouped by module. Bodies belong in the
  source.
- `.agent-kit/docs/INDEX.md` — replace the extra-pages marker with a row per domain page that earns one,
  or a line saying this repo has none. A page nobody reads drifts.
- `.agent-kit/project.md` — confirm every detected command, delete the detection notes, and keep
  the domain notes to what the code cannot say.

Remove every `FILL:` comment marker and every uppercase placeholder in these files:
`doctor --strict` treats a survivor as unfinished setup. If a page has nothing to say for this
repo (a library has no boot sequence), write that in one line; an empty section is a gap the
next session fills with a guess.

## 4. Exception comments become learnings

An exception comment is a decision the code cannot show. Move the reason, not the comment:

1. Read the code around it and decide whether the exception still applies. A stale comment is
   deleted, not recorded.
2. Add one line to `.agent-kit/rules/learnings.md`: `path:line — why`. One line, no pasted code.
3. Skip a lesson already in `learnings.md`, and skip one a rule file already states: the rule
   is the home, and a second copy is a contradiction with a delay.
4. Past 30 live entries, run `agent-kit learnings archive` before adding more.
5. A lesson needed a second time is promoted into the rule file it belongs to and deleted from
   the list.

If you cannot state the reason in one line, it is an interview question, not a learning.

## 5. TODOs become backlog rows

Every `TODO`, `FIXME`, `XXX` and `HACK` becomes one row in `.agent-kit/tasks/BACKLOG.md`:

```
| `B-07` | `later` | retry the upload when the queue is full | `src/upload.ts:214` | decide the retry budget with the owner |
```

- Status starts at `later`. Use `not-now` when something external blocks it, `not-important`
  when the owner has said it can be dropped.
- `Source` is `path:line`, or who asked and when. `Next step` is the smallest first action;
  "look into it" is not one.
- The same work in several places is one row with all its sources, not one row per comment.
- A TODO already covered by a row adds its source to that row.
- A TODO that is already done: say so in the report. Do not silently drop it.
- Do not delete or edit the comment unless the owner asks. The backlog is the tracker; the
  comment stays where the next reader will see it.
- An `HACK` that explains a deviation is also an exception comment. It goes to both files,
  each with the half it owns: the reason in learnings, the remaining work in the backlog.

A row is not a task. It has no lane, no write set and no gates; `agent-kit task new` plus
deleting the row is what starts the work. `doctor` checks the vocabulary, the IDs and the
cells.

## 6. Verify

```bash
agent-kit doctor --strict
git diff --stat
```

`doctor` must exit 0. `git diff --stat` must show only `.agent-kit/` files: this task
changes no product code, dependency or command. Run the declared suite only if the repo's own
rules require it for a docs change; `task close` runs it either way.

## 7. G2, close, report

Present in plain words: rows added per page; questions asked and the answers; learnings added
and skipped; backlog rows added, merged and found already done; facts you could not verify.
Then take the yes, `task close`, and report the change file.

## Boundaries

- No product code, no dependency, no schema, no command change. A fact you cannot verify is an
  open question in the report and, if it is durable, a `not-now` backlog row.
- If the tree contradicts the docs, the code wins: fix the page.
- Never write a path, command or export you did not see. `doctor` cannot catch an invented
  claim that happens to name a real file.
