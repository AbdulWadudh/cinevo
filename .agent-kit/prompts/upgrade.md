# Take a template upgrade

Runs when the owner says "upgrade agent-kit" or "what changed in the template?". The kit upgrades
itself from the source recorded at install; no product code is touched.

## 1. Ask the source, do not guess

`agent-kit check` never writes. It clones the recorded source at the release tag this repo
tracks and prints one row per file: `UPGRADE` (upstream moved, yours untouched), `DRIFT` (you
edited it), `MISSING`, `PRUNE`, `SEED-UPDATED`, `AHEAD`. A `release` row says which tag you are on
and which newer one exists: `BEHIND v1.0.2 - pull --ref v1.0.2`. `UNPINNED` means the install
still tracks a branch, and `pull` pins it to the newest tag.

`IN SYNC` means stop and say so. A recorded source that no longer exists (a deleted local clone):
`check --source <path|url>`.

## 2. Show it before writing

`agent-kit pull --ref v1.0.2 --dry-run` prints the planned rows and a unified diff each. Pass the
same `--ref` here and in step 4: without it the diff is against the tag you already have, which is
empty. Report one line per row and what capability it brings. The owner decides before step 4.

## 3. Open the task

`agent-kit task new upgrade-agent-kit --lane quick`, `touches: [".agent-kit/", "AGENTS.md"]`.
`pull` writes files no task declared, and `task close` scope-checks the diff.

## 4. Pull

`agent-kit pull --ref v1.0.2` writes `UPGRADE` and `MISSING` only, then records `ref`, `release`
and `commit` in `template.json`. Without `--ref` it stays on the tag it tracks — or, on an
`UNPINNED` install, pins the newest tag. It skips `DRIFT` (your edit) and `SEED-UPDATED` (your
authored file) unless `--force` / `--seeds`, which overwrite work — so the owner's yes comes
first, and `--force` only after the step 2 diff. It ends by running `doctor`.

## 5. Prove and log

`doctor --strict` exits 0 and `selftest` still passes, then `task close` and commit the pull as
one change. A row left `DRIFT` means this repo and upstream now disagree on purpose: give the
reason in the change file, or restore the local copy and pull again.
