# .githooks — the optional commit guard

**Why** — a commit that leaves the active task's write set, or a message that names no task,
is a breach of the loop. These hooks report it before the commit exists, but only in clones
that opted in; `task close` runs the scope check either way.

**Load it when** — you are wiring or changing the guard. Otherwise:
`git config core.hooksPath .githooks`.

| Path | Holds | Open when |
|---|---|---|
| `pre-commit` | the scope gate: calls `agent-kit task guard` and exits with its verdict | wiring or debugging the guard |
| `commit-msg` | the message warning: calls `agent-kit task guard --message "$1"`, always exits 0 | wiring or debugging the message check |

## How it behaves

- The scope gate is silent when no task is active; the message gate is silent until the first
  task exists. Neither blocks a repo that never opened one.
- Refuses a staged file outside the active task's `touches`; prints the uncovered paths.
- Warns, never refuses, on a subject that is not `type (TASK-ID): summary` or a body with no
  summary: it prints the expected shape and exits 0. The rule binds the session; the hook only
  reports it, so a human's commit is never blocked. No task exists yet at the setup fill
  commit, so the check stays silent there.
- **Never** bypass with `--no-verify`; close the task or amend the write set instead.
- Opt-in per clone. `setup` prints the command; it does not rewrite your git config.
