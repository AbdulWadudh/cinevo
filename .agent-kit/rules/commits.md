# Commits

Read before the first commit of a task. The subject has a hook; the split is kept by review.

- On the default branch, branch first.
- The author is the repo's configured identity. Never pass `-c user.name` or `-c user.email`,
  and never invent one from session context. No identity configured: stop and ask.
- No `Co-Authored-By`, no "Generated with ...", no AI attribution in commits, PR bodies,
  issues or changelog entries.
- One commit is one change — a feature, a fix, a doc update or a test — never a sitting's bulk
  work. Group by the feature or the issue each commit serves, so one commit can be reverted
  without the other. Work for a different feature or issue does not share a commit.
- A task carries as many commits as it has changes. Every commit names the same `TASK-ID`; the
  task file is the delivery, its commits are the steps. Do not hold the work back for one bulk
  commit at close.
- Stage by path. `git add -A`, `git add .` and `git commit -a` sweep in work that belongs to
  another commit; a path that is not part of this commit stays unstaged.
- The subject carries the type and the task:
  `type (TASK-ID): imperative summary` — lower-case type, one space before the parenthesis,
  no full stop. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`,
  `ci`, `style`, `revert`.
- The body states what that commit changed and why, after one blank line, in plain words. At
  close, the change file's `## What changed` paragraph is the closing commit's body. A commit
  with no body is not finished.
- `.agent-kit/githooks/commit-msg` prints the expected shape when a message misses it and exits 0; it
  never blocks the owner, so this rule is the session's alone to keep. `.agent-kit/githooks/pre-commit`
  checks the write set. The one commit without a task ID is the setup fill commit, made before
  the first task exists.
- Every closed task leaves one change file under `.agent-kit/logs/MM-YYYY/`, however many
  commits it carried; `task close` writes it and refreshes the Recent lists. Never hand-write
  one, and never keep a second ledger.
- A failing scope hook gets its cause fixed. `--no-verify` is not an option.
