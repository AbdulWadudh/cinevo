# prompts — procedures an agent runs

**Why** — some jobs are long, run a few times a year, and have to be done the same way each
time: filling the docs, trimming the entry file, migrating an old install. Each is a file a
session opens and follows, not text it improvises from memory.

**Load it when** — the owner asks for one of these jobs by name, or a row below matches. Read the
one prompt and run it as a task; do not read the folder.

| Path | Runs | Open when |
|---|---|---|
| `docs-populate.md` | fills `.agent-kit/docs/`, learnings and backlog from `path:line` evidence | asked to populate or refresh the docs |
| `kit-review.md` | finds the rule or gate that keeps costing a session, then fixes or proposes it | the process is the friction, with evidence |
| `trim-agents-md.md` | rewrites `AGENTS.md` against the seed, moving each fact to its home | the entry file costs more than it earns |
| `upgrade.md` | checks the recorded template source, shows the diff, then pulls it as one task | the owner says upgrade agent-kit, or asks what changed in the template |

A prompt is not a rule. It says how to run one job; the constraints it obeys are in
`.agent-kit/rules/`, and a prompt that contradicts them is the bug.
