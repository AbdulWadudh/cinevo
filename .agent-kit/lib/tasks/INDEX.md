# tasks — the task commands

**Why** — opening a task, reading it, and closing it change different state and fail for different
reasons; each area keeps its own file so a close fix does not mean reading `task new`.

**Load it when** — a task command misbehaves. `index.mjs` only re-exports, so open the file that
owns the verb.

| File | Holds | Open when |
|---|---|---|
| `index.mjs` | re-exports of the six commands | a caller needs a stable import |
| `open.mjs` | `task new`, `show`, `block`, `resume` | a task cannot open, read, park or resume |
| `close.mjs` | `task close`: the gate, inventory, archive, change card | a close is refused or files the wrong inventory |
| `start.mjs` | `start` | the day-start summary is wrong or missing |
