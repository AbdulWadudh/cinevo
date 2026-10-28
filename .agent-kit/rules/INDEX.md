# Rules Index

**Why** — a rule is written once and loaded only where it applies.
**Load it when** — every session; open `_behavior.md`, then only the domain files whose "read when" matches.

| Domain | File | Read when |
|---|---|---|
| Behaviour | `_behavior.md` | every session |
| Repo memory | `learnings.md` | before planning |
| Hallucination guards | `anti-patterns.md` | adding an import, endpoint or dependency |
| Commits | `commits.md` | before the first commit |
| Releases | `releases.md` | cutting a release |
| API and route handlers | `api.md` | a route handler, fetch or Server Action |
| TypeScript, hooks, Tailwind | `code.md` | any `.ts` / `.tsx` |
| Configuration | `config.md` | `src/config.ts`, the env surface |
| Data and migrations | `database.md` | the schema, a migration |
| Motion | `motion.md` | any UI element |
| Next.js | `nextjs.md` | a page, layout or data fetch |
| Pointer and touch | `pointer-and-touch.md` | hover controls, tap targets |
| Scroll | `scroll.md` | a list or panel that grows |
| Theming | `theming.md` | the theme cookie, accents |

Two invariants: the table and the folder agree — a row without a file fails, and a file without a row fails. A rule reading a diff cannot check fails. One home per fact: a repeated rule means one copy is wrong; keep the home and point the other.
