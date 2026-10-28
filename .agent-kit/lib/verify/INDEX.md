# verify — running the suite and reading its evidence

**Why** — the command and the parsing it depends on are separate concerns: a task file needs the
parsers (status, close, doctor), while only `cmdVerify` runs the commands.

**Load it when** — recording evidence, debugging a stale row, or reading a task's state.

| File | Holds | Open when |
|---|---|---|
| `index.mjs` | `cmdVerify`: tiers, the loop guard, the recorded rows | `verify` runs the wrong set or ignores a red run |
| `evidence.mjs` | evidence rows, plan and diff hashes, blocked state, row merge | a task's evidence reads wrong or stale |
