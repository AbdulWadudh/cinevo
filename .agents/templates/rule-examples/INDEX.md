# rule-examples — one rule file per domain

**Why** — a rule is written once, in one file. These are patterns to copy, not rules that
apply here or in a target repo until a copy is installed.

**Load it when** — a repo has a domain that `.agents/rules/` has no file for. Open the one
example you are copying, not the folder.

| File | Domain | Copy when |
|---|---|---|
| `typescript.md` | code rules (the `code` file) | the repo is TypeScript |
| `bun.md` | runtime and package manager | the repo runs Bun |
| `biome.md` | lint and format | the repo uses Biome |
| `api.md` | public interfaces and contracts | the repo exposes an API |
| `config.md` | configuration and environment | the repo has tunables |
| `database.md` | schema and migrations | the repo owns a database |
| `docs-lookup.md` | version and API lookups | documentation outranks memory |

After copying one, edit it to this repo's facts. The steps that make it a loaded rule — the
row, the trigger, the check — are in `../INDEX.md`.
