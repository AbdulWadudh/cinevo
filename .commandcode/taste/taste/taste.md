# Taste
- When a task is already open in the project's task tracker, continue that task instead of creating a new one; don't spawn duplicate tasks for related work. Confidence: 0.9
- "My previous agent stopped here" means reopen and continue the last task — even if it is marked DONE/archived — rather than treating it as finished and opening a fresh one. Confidence: 0.85
- When the user challenges a decision, give the exact reason backed by evidence (file:line, command output, the owner's own words) instead of only an apology. Confidence: 0.6
- Visual/card effects should be exposed as options the site owner can enable or disable from the Studio, not hard-coded into components. Confidence: 0.6
- Commits must be split per feature/issue — never one large commit that sweeps up unrelated work (e.g. several already-closed tasks sitting in the tree); follow the repo's commit rules. Confidence: 0.75
- UI corner radii must come from the theme's radius token (e.g. `--radius-card`) instead of hard-coded values like `rounded-full`/`rounded-xl`, so a theme with square or pill corners carries through every surface. Confidence: 0.75
