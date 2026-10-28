# templates — the seeds and copyable rule examples

**Why** — a target repo authors its own docs. This folder holds the blank shapes `setup` copies
and one worked example per rule type, so no file has to be duplicated by hand. The long jobs an
agent runs, such as filling those docs, live in `.agent-kit/prompts/`.

**Load it when** — you are changing what an installed repo starts with, populating `.agent-kit/docs/`, or
adding, changing or removing a rule.

| Path | Holds | Open when |
|---|---|---|
| `AGENTS.seed.md` | the target entry point: boundaries, layout, kit table | changing the installed contract |
| `CLAUDE.seed.md` | the Claude pointer to `AGENTS.md` | same |
| `tasks-INDEX.seed.md` | the task router, lane table, backlog, and last-five list | same |
| `backlog.seed.md` | the parked-work file and its three statuses | changing where TODOs are tracked |
| `logs-INDEX.seed.md` | the change-log model and last-five list | same |
| `learnings.seed.md` | the live-learnings shape and its cap | same |
| `task.md` | the per-task plan shape | `task new` reads it; you rarely need to |
| `rule-examples/INDEX.md` | one rule file per domain | adding a rule for a new domain |

## How to use

- Seeds are copied once, at setup. Editing a seed does not edit installed repos; `pull --seeds`
  is the explicit upgrade.
- Do not add a seed outside this folder. A new seed is a manifest `seeds` entry first.
- These files are machinery: a gate that fails is fixed in the gate, not in the seed.

## Add, change or remove a rule

The owner states the rule; the agent finds its home and writes it down. A rule that lives only
in the conversation does not exist.

1. **Find the home.** An existing file that owns the domain wins: edit its bullet. A
   cross-cutting rule goes in `_behavior.md`; a hallucination guard in `anti-patterns.md`; a
   commit-time rule in `commits.md`. A
   new domain copies the closest file from `rule-examples/`; no example fits, write one in the
   same shape. A stack fact, a command or a path is not a rule — it belongs in
   `.agent-kit/project.md` or `.agent-kit/docs/`.
2. **Write it so a diff can be judged.** One imperative bullet, with the exact path, command or
   boundary. "Be careful with the input" is advice and `doctor` fails it; "every handler
   validates its input before the database call" is a rule. State the reason only when it is
   not obvious.
3. **Give it a trigger.** Add or edit its row in `.agent-kit/rules/INDEX.md` with the condition
   under which a session opens the file. `doctor` fails a file with no row and a row with no
   file; a row that matches nothing is dead weight.
4. **Enforce it where a command can.** A rule the kit ships is a template change and needs a
   check: a `doctor` row or a hook, plus a `selftest` case. A repo rule that a command can
   check gets that check in the repo's own suite, declared in `.agent-kit/project.md`. A repo
   rule no command can check is still written; the change file says how it is reviewed.
5. **Keep one home.** Moving or deleting a rule updates the row in the same change and leaves a
   pointer where the old text was. Two copies are one contradiction with a delay.

Adding a rule is a normal task: it goes through `task new` and `task close`, and the change
file records which rule changed and why.
