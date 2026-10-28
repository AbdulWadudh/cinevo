# Rules Index

**Load it when** — every session. Open `_behavior.md`; add only the domain files whose "read
when" column matches the files you will touch or the step you are about to take.

| Domain | File | Read when |
|---|---|---|
| Behaviour | `_behavior.md` | every session |
| Repo memory | `learnings.md` | before planning anything |
| Hallucination guards | `anti-patterns.md` | adding an import, endpoint or dependency |
| Commits | `commits.md` | before the first commit of a task |
| Releases | `releases.md` | cutting a release, or proposing its version |
| API and route handlers | `api.md` | a route handler, fetch or Server Action, admin gating included |
| TypeScript, hooks, Tailwind | `code.md` | writing or reshaping any `.ts` / `.tsx` file |
| Next.js | `nextjs.md` | a page, layout, route or data fetch |
| Motion | `motion.md` | adding or changing any UI element |
| Pointer and touch | `pointer-and-touch.md` | hover-revealed controls, tap targets, input gating |
| Scroll | `scroll.md` | a list, table or panel that can grow |
| Theming | `theming.md` | the theme cookie, franchise portals, accent colours |
| Data and migrations | `database.md` | `prisma/schema.prisma`, a migration, a query module |
| Config and environment | `config.md` | `.env`, `vercel.json`, env vars or build config |

A domain needs a file **and** a row; `doctor` fails either half alone. Add one by copying its
example from `.agent-kit/templates/rule-examples/` — the procedure is
`.agent-kit/templates/INDEX.md`. A rule a diff cannot check is not a rule; "handle X
sensibly" is advice. **One home per fact:** a second copy is already wrong — keep the home,
point at it.
