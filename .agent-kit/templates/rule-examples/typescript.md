# Rule file example — TypeScript and code style

Not installed. Copy this to `.agent-kit/rules/typescript.md` when the repo is TypeScript, then
delete what is not true here. This repo's `AGENTS.md` overrides this file, never the reverse.

1. **No comments.** No `//`, `/* */`, JSDoc. The comment you wanted is a rename or an
   extraction.
2. **Size ceiling: 12,000 characters** — split by responsibility at 10,000. Characters are
   what a session pays for; a line count hides a fourfold difference between two files of the
   same length.
3. **Feature folders.** A split file becomes a folder named for the feature, re-exported
   through `index.ts`. Never a flat directory of loose files. Code used by two features moves
   up a level, never copied.
4. **Types.** Strict mode. Never `any` — narrow from `unknown`. Exported functions declare
   their return type. Discriminated unions over optional-field soup.
5. **Functions.** Pure by default, side effects at the edges. One reason to change per module.
   Early return over nesting. No default exports unless a framework demands one.
6. **Naming.** `camelCase.ts` for logic, `PascalCase.tsx` for components. Booleans read as
   assertions (`isStreaming`, `hasPendingAudio`). No abbreviations outside domain terms.
7. **Errors.** Never swallow one. Handle it or propagate with context. An empty `catch` is a
   bug. Fail loudly at startup, gracefully at runtime.
8. **Tailwind.** Canonical class first; arbitrary values only when nothing canonical exists.
   A bare CSS variable takes parentheses: `rounded-(--radius-card)`, not
   `rounded-[var(--radius-card)]`. Lengths on the spacing scale use it: `w-31`, not
   `w-[124px]`. Keep an off-scale value when it has to move with something else in the same
   layout, not with the text size.
9. **Terse rule files.** These load every session; length is a permanent cost. Short bullets,
   no tables. One home per rule.
