# Rule file example — Bun runtime

Not installed. Copy this to `.agents/rules/bun.md` when the repo runs on Bun. The kit itself
keeps a Node fallback on purpose; delete the rule if this repo needs one too.

1. **Bun for everything.** `bun run`, `bun install`, `bun add`, `bun test`, `bunx`. No npm,
   yarn or pnpm; no `node script.ts`; `bunx` before `npx`.
2. **Bun's APIs before a dependency.** `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.serve`,
   `Bun.$`, `bun:sqlite`, `Bun.password`.
3. **TypeScript everywhere.** Bun runs `.ts` directly, so scripts are `.ts` with no build
   step, and config the tool allows is `.ts` too.
4. **`.js` only when something else loads it verbatim** and cannot compile it — a userscript,
   a browser snippet. Say why in the first line of that file.
