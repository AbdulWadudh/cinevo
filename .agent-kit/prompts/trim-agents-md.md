# Trim AGENTS.md

Run when `AGENTS.md` costs more than it earns: facts that belong in `.agent-kit/project.md` or a
rule file, history, prose that restates `.agent-kit/SKILL.md`. The job is to keep every constraint
the repo holds and pay less for it.

Output: a shorter `AGENTS.md` with the same rules, each displaced fact in the file that owns it and
reachable from `AGENTS.md`, and a before/after table. No product code changes.

## Open the task

```bash
agent-kit task new trim-agents-md --lane planned
```

Declare `touches`: `AGENTS.md`, `.agent-kit/project.md`, `.agent-kit/docs/`, `.agent-kit/rules/`.
Drop the ones you end up not editing. At G1, name the character count you are aiming under and
the facts you expect to have another home.

## 1. Measure it before you touch it

Characters, not lines — `.agent-kit/rules/_behavior.md` §2. Count the file, then each `##`
section, and keep the table: it is the baseline evidence, and the close shows the same table again.
`wc -c AGENTS.md` on Linux and macOS; `(Get-Content AGENTS.md -Raw).Length` in PowerShell.

## 2. Sort every line by its home

Every line is one of four things. Say which, where it goes, and what makes it reachable there:

| Kind | Test | Destination | Its invocation |
|---|---|---|---|
| a constraint | an agent must obey it while editing | a rule file, existing or new | a row in `.agent-kit/rules/INDEX.md` with the condition that opens it |
| a command, path or stack fact | it is typed or checked, not judged | `.agent-kit/project.md`, the one home for commands | already pointed at from the start-here list |
| architecture | it says how the code is built | `.agent-kit/docs/` | a row in `.agent-kit/docs/INDEX.md` |
| narration | it restates `SKILL.md`, the seed, or what used to be true | delete | — |

A line with no destination is not deleted. It is asked about.

A destination that does not exist yet is created, not skipped. A new rule domain copies the
closest file from `.agent-kit/templates/rule-examples/` and keeps its shape; a page goes under
`.agent-kit/docs/`; a fact appends to the section of `project.md` that owns it. A fact moved into
a file nothing points at has been deleted with extra steps.

## 3. Ask once

Ask only what the tree cannot answer, and only about lines you are about to move or remove: "rule 3
mentions X — still true, and does it belong in a rule file?" Never invent a command, a path or an
export to fill a gap the old file did not cover.

## 4. Move it, then point at it

Write each fact into the file from step 2, then wire it:

- the rule file's row in `.agent-kit/rules/INDEX.md`, naming when to open it;
- the page's row in `.agent-kit/docs/INDEX.md`;
- the pointer the new home needs from `AGENTS.md` — one operative sentence, then the path. Keep it
  in the start-here list when the fact is needed before planning; otherwise next to the rule it
  serves.

The test is removal: delete the pointer and ask whether a fresh session can still reach the fact.
If it cannot, the move lost it.

## 5. Rewrite against the seed

`.agent-kit/templates/AGENTS.seed.md` is the shape: start-here order, boundary protocol, core
rules, done means. Keep the repo's own words where they carry the constraint and cut the rest;
each moved fact is now one line and a path, not a paragraph.

Do not add anything the old file did not have. A trim that grows the file has not been run.

## 6. Prove it

```bash
agent-kit doctor --strict     # exit 0: paths resolve, indexes agree, no unfilled marker
```

The gate covers the wiring: a rule file with no router row fails `rules indexed`, a directory with
no `INDEX.md` fails `directory indexes`, a pointer to a path that no longer exists fails
`doc paths resolve`. Then the character count, against the number you named at G1.

No gate can check the thing that matters, so do it by hand, once: read the old file and the new
one side by side and confirm that every constraint is either still there or in the file it now
points at. That pass is the whole point of the job.

## Report

The before/after table (section, characters, delta), one line per fact that moved
(`fact -> path`), every file you created and the row that points at it, every line you deleted and
why, and both command results.
