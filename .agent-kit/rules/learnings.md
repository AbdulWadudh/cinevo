# Repo Memory and Learnings

Quirks discovered while working here that are not visible in the code. One line each.
Cap: 30 entries. Past it, `agent-kit learnings archive` moves the oldest to `.agent-kit/learnings/archive/`.

**Promotion rule.** A lesson needed a second time becomes a rule in the file it belongs to,
and is deleted from this list. This file is a queue, not an archive.

- Keep dependencies zero-external in shared utility modules; they are imported everywhere.
- Run the build before the integration tests when generated types are involved.

<!-- Delete the two lines above once they stop being true for this repo. -->
