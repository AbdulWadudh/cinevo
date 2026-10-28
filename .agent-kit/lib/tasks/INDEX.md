# tasks — the task commands

**Why** — opening a task, reading it, and closing it change different state and fail for different
reasons; each area keeps its own file so a close fix does not mean reading `task new`.

**Load it when** — a task command misbehaves. `index.mjs` only re-exports, so open the file that
owns the verb.

| File | Holds | Open when |
|---|---|---|
| `index.mjs` | re-exports of the eight commands | a caller needs a stable import |
| `open.mjs` | `task new` (local or minted), `block`, `resume` | a task cannot open, park or resume |
| `issue.mjs` | `mintTask`, `importTask` — the two ways an id comes from GitHub | a mint or `--from` import fails |
| `show.mjs` | `task show` | the task brief is wrong or missing |
| `publish.mjs` | `task publish`, `syncAfterClose` | the plan or the final record does not reach the issue |
| `renumber.mjs` | `task renumber`: local only, rewrites every reference | two tasks collided after a merge |
| `close.mjs` | `task close`: the gate, inventory, archive, change card, `--sync` | a close is refused or files the wrong inventory |
| `start.mjs` | `start` | the day-start summary is wrong or missing |
