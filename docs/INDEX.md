# docs — the codebase map

**Why** — searching a tree costs more than reading a map that says where the logic lives. This
is the map, not the territory: when it disagrees with the code, the code wins and this file is
the bug.

**Load it when** — a task touches code you have not already read this session, or you do not
know where a boundary sits. Open one page, not all three.

## Navigation protocol

1. **Where does the logic live?** `ARCH_MAP.md` first. Not a recursive file listing.
2. **What is the signature?** `API_SKELETON.md` gives the exported shape without the body.
3. **How does it start?** `ENTRY_POINTS.md` gives the boot and request flow.
4. Read at most three source files at a time. If you need more, the map is thin — fix the map.

## Pages

| Page | Content |
|---|---|
| [ARCH_MAP.md](ARCH_MAP.md) | directory boundaries, responsibilities, pure vs side-effect, import rules |
| [API_SKELETON.md](API_SKELETON.md) | exported types and function signatures |
| [ENTRY_POINTS.md](ENTRY_POINTS.md) | boot sequence and request or event flow |

No extra pages yet. This repo has three domains that would earn one when they next change:
the theme/experience resolver (`src/lib/theme/`), the radio hydration pipeline
(`src/app/actions/radio.ts` + `src/lib/radio/`), and the local-first watch sync
(`src/lib/watchStore.ts` + `src/lib/watchSyncClient.ts`). Each is documented in
`ARCH_MAP.md` and `ENTRY_POINTS.md` until a page is worth its own file.

## Keeping this true

- A change that moves a boundary updates `ARCH_MAP.md` in the same task.
- A change to an exported signature updates `API_SKELETON.md` in the same task.
- A thin map or one that has drifted gets the full pass in
  `.agents/templates/docs-populate.md`: inventory with `path:line`, one interview for what the
  tree cannot answer, exception comments into learnings, TODOs into the backlog.
- `agent-kit doctor` fails when a page here points at a file that does not exist, and when a
  path named in these docs is not real. That is the only maintenance this map gets for free.
