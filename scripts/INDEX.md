# scripts — the kit executable

**Why** — one file is the whole tool: setup, check, pull, doctor, start, verify, harnesses,
task, learnings, selftest. Reading it costs tens of thousands of characters; running it costs
one exit code.

**Load it when** — a command errors in a way its output does not explain, or you are changing
the kit itself. Never to answer an ordinary question about the workflow.

| File | Holds | Open when |
|---|---|---|
| `agent-kit.mjs` | every command and gate, zero dependencies | debugging a gate or changing the kit |

## How to use

- Run `node scripts/agent-kit.mjs <command>` (or `bun`). The commands are in `.agents/project.md`
  and the kit table in `AGENTS.md`; this file is not a second home for them.
- Editing it is a machinery change: in a target repo, `pull --force` takes it back.
- `selftest` is the proof that each gate can fail. A change that makes one unfailable is the
  defect the suite exists to catch.
