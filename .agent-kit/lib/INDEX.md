# lib — the kit's modules

**Why** — one file per area, so a session opens the module a task touches instead of reading the
whole kit. `agent-kit.mjs` stays the only entry point and imports from here.

**Load it when** — changing a command or debugging a gate. Then open one row; do not read the
directory.

| Module | Holds | Open when |
|---|---|---|
| `consts.mjs` | paths, literals and limits | a path or a cap moves |
| `io.mjs` | filesystem, process and text helpers | a file, hash, glob or table helper misbehaves |
| `manifest.mjs` | manifest, source resolution, release tags | install, pull or check cannot find a source |
| `project.mjs` | stack detection, `project.md` render | setup writes the wrong command |
| `env.mjs` | token saver, harness detection | setup's tool wiring |
| `taskfile.mjs` | active tasks, ids, the Active block | task lookup, ids, the in-flight list |
| `setup.mjs` | `setup` | a fresh install |
| `sync.mjs` | `check`, `pull` | drift or an upgrade |
| `doctor/` | `doctor`: the fix pass, seven check groups, the summary | a truth check fails |
| `verify/` | `verify`, evidence rows, loop guard | `verify`, or a task's evidence is stale |
| `tasks/` | `task new/show/block/resume/close`, `start` | opening or closing work |
| `changelog.mjs` | change cards, recent lists | a close writes a card |
| `release.mjs` | `release` | cutting a note |
| `guard.mjs` | `task guard` | the commit hooks |
| `learnings.mjs` | `learnings archive` | the cap is hit |
| `selftest/` | `selftest`: one fixture, the gate scenarios grouped by area | a gate needs its failing fixture |
| `main.mjs` | argv parsing, dispatch | a new subcommand or flag |
