# Rule file example — configuration

Not installed. Copy this to `.agents/rules/config.md` when the repo has tunables beyond a few
constants.

1. **Every tunable is declared once, in one tier.** A constant is a domain invariant and a
   plain module. Environment is infrastructure, endpoints and secrets: validated at startup,
   fail loud, immutable for the process. A runtime setting is anything an operator may tune:
   in the database, changed through an admin API, no restart.
2. **Group by concern, not by case:** `image.width`, `api.prefix`, in all three tiers.
3. **A value earns a name when it crosses a file boundary or would be written twice.** A
   literal used once in the module that owns it stays inline.
4. **A default lives with its schema, once.** Never a second `?? fallback` at a call site.
5. **Pass settings in as parameters** so functions stay pure and testable.
6. **A change reaches every process:** publish an invalidation, do not wait for per-process
   caches to expire.
7. **Secrets stay in environment.** Never a runtime setting, never in an API response.
