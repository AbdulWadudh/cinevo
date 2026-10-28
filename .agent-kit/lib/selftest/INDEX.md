# selftest — one fixture per gate, grouped by the area it proves

**Why** — every check must be able to fail, and a failing scenario should point at the file that
owns the area, not at a 1,700-line script. Scenarios share one throwaway repo, so order matters:
`index.mjs` runs them in numeric order even though the files group them by theme.

**Load it when** — a gate is added (add a scenario to the file that owns the area, then call it in
`index.mjs`), or a failure needs reading.

| File | Scenarios | Open when |
|---|---|---|
| `index.mjs` | fixture, helpers, the ordered calls, cleanup, summary | a scenario is added or reordered |
| `install.mjs` | 1–5, 8, 12: setup, fill gate, drift, pull, self-copy, read-only sync | an install or upgrade breaks |
| `tasks.mjs` | 6–7, 11: scope guard, close, archive, card, red evidence | the close contract is wrong |
| `rules.mjs` | 9–10, 17, 20–21: rules, `--fix`, learnings, router, backlog | a repo invariant drifts |
| `loop.mjs` | 22–24: loop guard, command tiers, stale evidence | `verify` misbehaves |
| `state.mjs` | 14, 25, 29: inventory, blocked slot, collisions | task state or the write set is wrong |
| `family.mjs` | 26–27: subtask close, family delivery | a parent/subtask flow breaks |
| `surface.mjs` | 15–16, 18–19, 30–32: pointers, identity, harnesses, commit message, hooks, budget | a harness-facing file or hook is wrong |
| `release.mjs` | 13, 28, 33–34: change log, release note, tag pin | a release or tag is wrong |
| `ids.mjs` | 35: local ids derive, a stale `.counter` is ignored, a collision renumbers, the mode is refused | the offline allocator is wrong |
| `issue.mjs` | 36–37: issue ids over a stubbed API, a missing prerequisite | issue mode or the prerequisites row is wrong |
