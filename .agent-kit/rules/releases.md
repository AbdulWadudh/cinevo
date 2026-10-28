# Releases

Read when cutting a release — the owner names a version, or accepts one you proposed.

## Cut it

`agent-kit release <version>` writes the note to `.agent-kit/releases/`, one file per version,
from every change file under `.agent-kit/logs/` that no earlier release claims. It prints the
`gh release create --notes-file` line. It refuses a version that already exists, and a version with
nothing new.

The file it writes: `# Release vX.Y.Z`, the date, then `### Added`, `### Changed`, `### Fixed` and
`### Removed`. Each task is its summary in bold with the commit that shipped it
(`TASK-127 · 544f2dc`), then the card's `## What changed` paragraph, so the note reads as prose and
points at the code. The commit comes from `git log` on the card, so the card must be committed
before the note is cut; the command names any that are not. A `RELEASED` block names the tasks it
claims — it is what the next release reads, so deleting an id from it ships that task a second time.

## Pick the number

The number is the owner's. Propose one with its reason and let them overrule it.

| Bump | When |
|---|---|
| major | an installed repo must edit a path or a command it already wired |
| minor | a new command, check or rule |
| patch | fixes and docs only |

`v1.0.0` is the first release of the install surface.

## Publish

Cut the note, commit it, then tag it. The tag is what makes a release installable — `setup --ref`
and `pull --ref` clone it, and `check` compares against it — and the tag's message **is** the note,
so `git show vX.Y.Z` and the GitHub release page carry the change list with no second copy to keep
in sync.

```bash
agent-kit release vX.Y.Z                # writes the note and prints the next lines
git add .agent-kit/releases/vX.Y.Z.md && git commit -m "docs: release vX.Y.Z"
agent-kit release --tag vX.Y.Z          # annotated tag, message = the note
git push origin vX.Y.Z
gh release create vX.Y.Z --notes-file .agent-kit/releases/vX.Y.Z.md
```

`release --tag` refuses a note that is not committed (the tag would carry a file its own tree lacks),
a version that already has a tag, and a missing note. `doctor`'s `release tags` row warns while a
note has no tag, so "cut but not tagged" cannot be forgotten. `gh release create` is the only step
that touches GitHub, and it runs when the owner asks for it.

A tag is a promise: never move one. A fix is a new patch tag, because an install pinned to the old
tag must keep building what it installed.
