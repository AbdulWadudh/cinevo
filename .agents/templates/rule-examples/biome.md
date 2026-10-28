# Rule file example — Biome

Not installed. Copy this to `.agents/rules/biome.md` when Biome formats and lints the repo.

1. **Biome for new projects; never add ESLint or Prettier beside it.** A repo already using
   another tool keeps it. Migrating is its own task, asked for explicitly.
2. **Install it, do not `bunx` it.** `bun add -d @biomejs/biome` and a committed
   `biome.json`: a bare `bunx biome` resolves a new version every run and drifts from the
   editor.
3. **`files.includes` is an allowlist.** An exclusion list widens the moment a new directory
   appears.
4. **Never silence a rule to pass.** Fix the cause, or suppress one line with
   `// biome-ignore lint/<rule>: <true reason>`.
5. **A failing lint is a broken build.** Never commit past it. Run `format` after a scripted
   write: it produces CRLF and the wrong indent.
