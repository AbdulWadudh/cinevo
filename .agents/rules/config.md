# Rule file — Config and environment

Derived from `.agents/templates/rule-examples/config.md`, edited to what this repo actually
does. `AGENTS.md` overrides this file, never the reverse.

1. **Secrets live in `.env`, never in the tree.** `.env*` is gitignored; `.env.example` is
   the documented surface and carries placeholders only. A key pasted into a source file, a
   test, a comment or a commit message is a rotation, not an edit to revert.
2. **Never echo a secret value.** Not in a log line, not in a tool result, not in a summary.
   Print the variable name and whether it is set; never the value.
3. **`NEXT_PUBLIC_*` is baked in at build time.** It is readable in the browser, so it must
   never hold a secret — the Supabase anon key and the VAPID public key are the only two
   allowed. A server-only value goes in the unprefixed variable, and the code reads that one
   first. `getSiteURL()` in `src/lib/site-url.ts` is the pattern to copy: `SITE_URL` before
   `NEXT_PUBLIC_SITE_URL`, then headers, then localhost.
4. **Add an env var in three places, together.** `.env.example` (placeholder, with a comment
   saying what it is for), `.agents/project.md` domain notes when it changes behaviour, and
   the code that reads it. `NEXT_PUBLIC_*` additionally needs a note that it is build-time.
5. **Two database URLs, on purpose.** `DATABASE_URL` points at the pooler (port 6543,
   `pgbouncer=true`) and is what the app uses; `DIRECT_URL` points at the direct connection
   (5432) and is what migrations need. Swapping them makes migrations hang on the pooler.
6. **Fail at startup, not at request time.** A missing `DATABASE_URL` should throw where the
   pool is built. The health probe (`src/app/api/health/route.ts`) deliberately touches
   nothing external, so a wobbling upstream never reads as a dead container — do not add a
   database or Supabase check to it.
7. **Storage keys go through `storageKey()`.** `src/config.ts` defines one prefix; every
   localStorage or sessionStorage key uses it. A raw string key is a collision waiting for a
   second app on the same origin.
8. **Cron and webhook routes authenticate with a secret, always.** Compare against
   `PUSH_CRON_SECRET` or `CRON_SECRET`, accept the `Authorization: Bearer` header or a
   `?secret=` query, and return 401 before doing any work. `src/app/api/push/run/route.ts` is
   the reference implementation.
9. **A generated env file is not committed.** No `.env.local`, no `.env.production` in git,
   no secrets in `vercel.json` or the Dockerfile.
10. **Terse rule files.** These load every session; length is a permanent cost. Short
    bullets, no tables. One home per rule.