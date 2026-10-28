# api — exported signatures

**Why** — signatures without bodies, one page per domain, so a session reads the shape it needs
instead of one long file.

**Load it when** — you need an exported shape and have not read the module. Open the one page
for the domain; the source remains the truth.

Add a line when you add or change an export. Delete a line when the export goes away.

## Pages

| Page | Covers |
|---|---|
| [core.md](core.md) | config, db, auth, Supabase clients, TMDB, providers, genre and image helpers |
| [watch.md](watch.md) | the local-first watch store, its sync client, push and episode notifications |
| [theme.md](theme.md) | the per-request theme answer, detail layouts, experiences, presets, the studio module |
| [cards.md](cards.md) | card and hero effects, the CardSwap deck, the shared hover preview |
| [actions.md](actions.md) | the Server Action modules and the shapes that cross that boundary |
| [types.md](types.md) | types shared across boundaries, and removed exports |

A new domain earns a page here when it grows its own set of exports; until then its
signatures stay on the page that already owns them.
