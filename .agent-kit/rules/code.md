# Rule file — TypeScript and code style

Derived from `.agent-kit/templates/rule-examples/typescript.md`, edited to what this repo
actually does. `AGENTS.md` overrides this file, never the reverse.

1. **No comments.** No `//`, `/* */`, JSDoc, except where the comment records a reason the
   code cannot: a workaround for a third-party bug, an intentional deviation from the rule,
   a security constraint. State the reason, not the code. The comment you wanted elsewhere
   is a rename or an extraction.
2. **Size ceiling: 12,000 characters.** Split by responsibility at 10,000. Characters are
   what a session pays for; a line count hides a fourfold difference between two files of
   the same length. Current worst offenders are `src/components/radio/RadioClient.tsx`
   (43,867), `src/components/player/IframePlayer.tsx` (37,050),
   `src/components/dashboard/MediaCarousel.tsx` (32,865) and
   `src/components/watch/SeasonList.tsx` (31,348) — split one when you are already in it,
   not as a separate task.
3. **Feature folders.** A split file becomes a folder named for the feature, re-exported
   through `index.ts` — the pattern already used by `src/lib/theme/studio/index.ts`. Never a
   flat directory of loose files. Code used by two features moves up a level, never copied.
4. **Types.** `strict` is on in `tsconfig.json`; keep it. Never `any` — narrow from `unknown`;
   `npm run lint` fails on one. Exported functions declare their return type. Discriminated
   unions over optional-field soup.
5. **Functions.** Pure by default, side effects at the edges. One reason to change per
   module. Early return over nesting. No default exports unless the framework demands one —
   `src/lib/imageLoader.ts` is the sanctioned exception, because Next requires it.
6. **Naming.** `camelCase.ts` for logic, `PascalCase.tsx` for components. Booleans read as
   assertions (`isStreaming`, `hasPendingAudio`). No abbreviations outside domain terms.
7. **Errors.** Never swallow one. Handle it or propagate with context. An empty `catch` is a
   bug — the ones in `src/lib/tmdb.ts` and `src/lib/safeStorage.ts` are deliberate fallbacks
   to an empty result and a comment there says so. New code fails loudly at startup,
   gracefully at runtime.
8. **Tailwind v4.** Canonical class first; arbitrary values only when nothing canonical
   exists. `aspect-video`, not `aspect-[16/9]`; `bg-linear-to-b`, not `bg-gradient-to-b`;
   `bg-white/10` and `border-white/4`, not `bg-white/[0.1]` and `border-white/[0.04]`;
   `w-40`, not `w-[160px]`. A bare CSS variable takes parentheses:
   `rounded-(--radius-card)`, not `rounded-[var(--radius-card)]`. Keep an off-scale value
   when it has to move with something else in the same layout, not with the text size.
9. **Server vs client.** A file that exports a Server Action starts with `"use server"` and
   exports nothing but async functions. A file that touches `window`, a store or an effect
   starts with `"use client"`. `src/lib/db.ts` and every module importing it are server-only;
   a client component reaching one is a build error, not a refactor.
10. **Hooks.** Every function passed as a dependency to `useEffect` or another hook is wrapped
    in `useCallback`; `react-hooks/exhaustive-deps` passes without an exception. The React
    Compiler rules are not suppressed: no state set during render, no ref read during render,
    nothing read before it is declared. Derive during render, reset with a key, and put a
    client-only initial value in a microtask.
11. **Terse rule files.** These load every session; length is a permanent cost. Short
    bullets, no tables. One home per rule.