# types — shared across boundaries

- **`MediaSource`** (`"movie" | "tv"`) — `src/lib/tmdb.ts` defines it; providers, watch
  store, wishlist and progress all key on it.
- **`WatchEntry` / `WatchMeta`** — the client store's shape, mirrored by the
  `WatchProgress` Prisma model and by `src/app/actions/progress.ts`. A field added here
  needs the same field on the other two.
- **`SandboxMode`** — player-only, but it travels through a provider record and a
  localStorage key, so renaming it is a migration.
- **`ExperienceId`** — the clone identity; `src/lib/theme/active.ts` and every page
  composition branch on it.
- **`SiteThemeState`** — the published-default row, read by `getActiveThemeState()` and
  written by `src/app/actions/site-theme.ts`.

## Removed

Nothing yet. When a public export is removed, note it here for one release, then delete the
note.
