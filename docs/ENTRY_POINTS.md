# Entry Points and Flow

Where execution starts, and what it touches. One row per entry point that actually exists.

| Entry | Trigger | Path | Reaches |
|---|---|---|---|
| Root layout | every request | `src/app/layout.tsx` | `src/lib/theme/active.ts`, the provider stack, `src/app/globals.css` |
| Home page | `GET /` | `src/app/page.tsx` | `src/lib/tmdb.ts`, `src/lib/theme/active.ts`, `src/components/dashboard/` |
| Request interceptor | every matched request | `src/proxy.ts` | `src/lib/supabase/middleware.ts` → Supabase `getUser()` |
| Health probe | `GET /api/health` | `src/app/api/health/route.ts` | nothing external, by design |
| Push cron | `GET /api/push/run` (Vercel cron, 13:00 UTC) | `src/app/api/push/run/route.ts` | `src/lib/db.ts`, `src/lib/episodeNotifications.ts`, `src/lib/push.ts` |
| Radio resolve | `GET /api/radio/resolve` | `src/app/api/radio/resolve/route.ts` | upstream playlist fetch, with a private-host block |
| OAuth callback | `GET /auth/callback` | `src/app/auth/callback/` | `src/lib/supabase/server.ts` |
| Server Actions | a client component calls one | `src/app/actions/*.ts` | `src/lib/db.ts`, `src/lib/auth.ts`, `src/lib/tmdb.ts` |
| Prisma client | first query in a process | `src/lib/db.ts` | Postgres through `@prisma/adapter-pg` |
| Seed scripts | run by hand | `prisma/seed/*.mts` | `@prisma/client` directly |

## Primary flow

A page request:

```
request -> src/proxy.ts (Supabase session refresh, skipped for /api/health and static assets)
        -> src/app/layout.tsx (getActiveThemeState, provider stack, blocking theme script)
        -> src/app/<route>/page.tsx (server component)
        -> src/lib/tmdb.ts or src/lib/db.ts
        -> src/components/<feature>/ (client components hydrate)
```

A mutation from the browser:

```
client component -> src/app/actions/<domain>.ts ("use server")
                 -> src/lib/auth.ts (getCurrentUser / getOrCreateProfile)
                 -> src/lib/db.ts -> Postgres
                 -> revalidatePath(...) -> the page re-renders
```

Watch progress, which is deliberately not that:

```
player -> src/lib/watchStore.ts (localStorage via safeStorage, marked dirty)
       -> src/lib/watchSyncClient.ts (flushWatch / pullWatch)
       -> src/app/actions/progress.ts (syncWatchProgress, last-write-wins)
       -> Postgres
```

## Boot order

What must be initialised before the first unit of work, and what breaks if it is not:

1. **Environment.** `DATABASE_URL` before any query (`src/lib/db.ts` builds the pool at
   module load), `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` before any
   auth call, `TMDB_ACCESS_TOKEN` (or `TMDB_API_KEY`) before any catalogue fetch. A missing
   database URL fails at import time, not at first request.
2. **Prisma client.** `prisma generate` must have run; `npm run build` and `postinstall`
   both do it. Without it every `db.*` call is a type error and a runtime throw.
3. **Theme, before paint.** The root layout emits a blocking head script from the cookie so
   the first paint is already the right theme. If it is skipped the page flashes the default
   and then corrects itself.
4. **Providers, in the layout.** `ThemeProvider`, `RadioPlayerProvider`, `SpatialNavProvider`,
   `WishlistProvider`, `TrailerProvider`, `WatchSync` and `Toaster` wrap the tree; a page
   that needs one of them outside the layout will not find it.
5. **The service worker and push keys.** `VAPID_PUBLIC_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   must be stable across deploys — regenerating them invalidates every existing push
   subscription.