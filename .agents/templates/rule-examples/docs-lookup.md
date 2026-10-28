# Rule file example — library docs

Not installed. Copy this to `.agents/rules/docs-lookup.md` when the owner wants `ctx7` for
library questions; delete it for a team that does not.

1. **Use it even when you think you know the answer.** Training data goes stale, and a
   citation beats confidence. Not for refactoring, scratch scripts, business-logic debugging,
   code review, or general programming concepts.
2. **Resolve, then fetch.** `bunx ctx7@latest library "<official name>" "<what to look up>"`
   — official name with punctuation ("Next.js", not "nextjs") — pick the best `/org/project`
   match, then `bunx ctx7@latest docs <id> "<what to look up>"`.
3. **One command per concept**, unless the question is how two concepts interact.
4. **Three commands per question, at most.** Never put credentials in a query. On a quota
   error, say so and point at `bunx ctx7@latest login`; never fall back to memory silently.
