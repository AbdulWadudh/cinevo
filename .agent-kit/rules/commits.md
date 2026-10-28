# Commits

Read before the first commit of a task. The commit message is the change file's wording; the
shape is enforced by review, not by this file.

- On the default branch, branch first.
- The author is the repo's configured identity. Never pass `-c user.name` or `-c user.email`,
  and never invent one from session context. No identity configured: stop and ask.
- No `Co-Authored-By`, no "Generated with ...", no AI attribution in commits, PR bodies,
  issues or changelog entries.
- One commit is one task and one kind of change. A task that adds a feature, fixes a bug and
  updates docs is three commits, each with the files that belong to it. Never one bulk commit
  for a session's work.
- Stage by path. `git add -A`, `git add .` and `git commit -a` sweep in work that belongs to
  another commit; a path that is not part of this commit stays unstaged.
- The subject carries the type and the task:
  `type (TASK-ID): imperative summary` — lower-case type, one space before the parenthesis,
  no full stop. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `build`,
  `ci`, `style`, `revert`.
- The body is the change file's summary, after one blank line: what changed and why, in plain
  words. A commit with no body is not finished.
- `.agent-kit/githooks/commit-msg` prints the expected shape when a message misses it and exits 0; it
  never blocks the owner, so this rule is the session's alone to keep. `.agent-kit/githooks/pre-commit`
  checks the write set. The one commit without a task ID is the setup fill commit, made before
  the first task exists.
- Every closed task leaves one change file under `.agent-kit/logs/MM-YYYY/`; `task close` writes it
  and refreshes the Recent lists. Never hand-write one, and never keep a second ledger.
- A failing scope hook gets its cause fixed. `--no-verify` is not an option.
