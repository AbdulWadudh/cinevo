# Rules Index

**Why** — a rule is written once and loaded only where it applies, so an unrelated task does
not pay for it.

**Load it when** — every session. Open `_behavior.md`; add only the domain files whose "read
when" column matches the files you will touch or the step you are about to take. Load only what
matches.

| Domain | File | Read when |
|---|---|---|
| Behaviour | `_behavior.md` | every session |
| Repo memory | `learnings.md` | before planning anything |
| Hallucination guards | `anti-patterns.md` | adding an import, endpoint or dependency |
| Commits | `commits.md` | before the first commit of a task |
| API and route handlers | `api.md` | adding or changing a route handler, a fetch, or a Server Action |
| TypeScript and code style | `code.md` | writing or reshaping any `.ts` / `.tsx` file |
| Config and environment | `config.md` | touching `.env`, `vercel.json`, env vars or build config |

The files above ship with every repo. Add one more per domain you actually
have — `typescript`, `database`, `payments`, `auth`, `mobile` — by copying the matching
example from `.agent-kit/templates/rule-examples/` and editing it. The steps for adding,
changing or removing a rule are in `.agent-kit/templates/INDEX.md`. A domain with no file is a
domain with no rule.

Two invariants `doctor` enforces:

- **The table and the folder agree.** A row without a file fails, and a file without a row
  fails, so neither side can rot silently.
- **A rule reading a diff cannot check fails.** "Handle X sensibly" is advice; "no `any` in a
  diff" is a rule. The check is a phrase list, so it is a floor, not a proof.

**One home per fact.** If a rule appears twice, one copy is already wrong: keep the home,
replace the other with a pointer.
