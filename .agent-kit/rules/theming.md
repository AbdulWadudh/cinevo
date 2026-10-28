# Rule file — Theming and franchise styling

1. **The theme is resolved once per request.** `getActiveThemeState()`
   (`src/lib/theme/active.ts`) is the only reader of the `k79_theme_state` cookie and the
   published theme row. A page or component takes the resolved state as a value; it never
   parses the cookie or queries the site-theme table itself. The three sources and their
   precedence are in `.agent-kit/project.md` §Domain notes.
2. **A themed portal keeps its identity full height.** Use a tinted solid base
   (e.g. `bg-[#0c0202]`) under a top `bg-linear-to-b` transparent overlay, not a gradient
   that fades to black.
3. **Interactive elements take the active franchise's accent.** Load More buttons,
   pagination spinners, tags, back buttons and play overlays theme dynamically; the global
   red is the fallback, not the default.
