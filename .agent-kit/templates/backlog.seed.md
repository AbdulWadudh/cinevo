# Backlog — parked work

Candidates the owner has decided not to do now. A row is **not** a task: it has no lane, no
write set and no gates, and no session resumes from it. Work starts when the owner picks a
row: `agent-kit task new`, then delete the row here. `task close` writes the record; this file
is not a changelog.

`agent-kit doctor` fails a row with an unknown status, a reused ID, fewer than five cells, or
an empty item, source or next step.

| ID | Status | Item | Source | Next step |
|---|---|---|---|---|

_Nothing parked._

```
| ID | Status | Item | Source | Next step |
|---|---|---|---|---|
| `B-07` | `later` | retry an upload when the queue is full | `src/upload.ts:214` | decide the retry budget with the owner |
```

## Statuses

- `later` — real and wanted, not next.
- `not-now` — the timing is wrong or something external blocks it; the next step says what
  unblocks it.
- `not-important` — recorded so it stops being raised; revisit only if its cost changes.

## Rules

- `Source` is `path:line`, or who asked and when. `Next step` is the smallest first action;
  "look into it" is not one.
- The same work in several places is one row with all its sources.
- IDs are never reused. Delete a promoted row; do not mark it done.
- `docs-populate` fills this file from `TODO`, `FIXME`, `XXX` and `HACK` comments. It is also
  where a finding goes when a session decides not to act on it now.
