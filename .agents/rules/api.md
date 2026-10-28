# Rule file — API and route handlers

Derived from `.agents/templates/rule-examples/api.md`, edited to what this repo actually
does. `AGENTS.md` overrides this file, never the reverse.

1. **Validate at the boundary, then trust the value.** A route handler parses its query and
   body into a typed object before the first query or fetch; nothing downstream re-checks.
   A missing or malformed parameter returns 400, not a default.
2. **Never trust a client-supplied URL.** `src/app/api/radio/resolve/route.ts` is the
   reference: `isPrivateHost()` rejects loopback, private and link-local targets before the
   fetch, `AbortSignal.timeout(6_000)` bounds it, and a declared `Content-Length` over
   `256 * 1024` is refused. Any new endpoint that fetches a user-supplied URL copies all
   three, or it does not ship.
3. **Authenticate before working.** A protected route returns 401 before it touches the
   database. Push and cron routes accept `Authorization: Bearer` or `?secret=` against
   `PUSH_CRON_SECRET` / `CRON_SECRET` and never run work for an unauthorized caller.
4. **Server Actions are the default; a route handler is for a non-browser caller.** A
   mutation called from a client component is a `"use server"` module under
   `src/app/actions/`. A route handler exists for a cron job, a webhook, a probe, or a
   response that is not JSON-and-revalidate.
5. **Every Server Action gates before it writes.** A user action resolves the identity
   through `src/lib/auth.ts`; an admin action calls `requireAdmin()` and throws
   `Error("Forbidden")`. The guard is the first statement after argument validation.
6. **One response shape.** `NextResponse.json({ error })` with a real status on failure, the
   success payload bare on success. No `{ ok: true, data }` wrapper, no 200 carrying an error
   message.
7. **No secret in a response, an error message or a log line.** An upstream failure returns a
   generic message and a status; the detail goes to the server log without the credential.
8. **A route that reads live data sets `export const dynamic = "force-dynamic"`** and a
   `cache-control` that matches — `no-store` for the health probe and the push run. A cached
   auth or catalogue response is a bug.
9. **Bound the work.** A list endpoint takes a limit and enforces it; a loop over rows takes
   a cap. Nothing on this site should be able to ask for an unbounded set.
10. **Terse rule files.** These load every session; length is a permanent cost. Short
    bullets, no tables. One home per rule.