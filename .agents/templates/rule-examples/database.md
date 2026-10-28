# Rule file example — data and migrations

Not installed. Copy this to `.agents/rules/database.md` when the repo owns a database.
Delete a line that is not true here; a rule that is merely aspirational teaches the agent
something false.

1. **Migrations are append-only.** Never edit a migration that has run anywhere. Write a new one.
2. **Queries go through the data layer.** Controllers and handlers do not contain SQL or ORM
   calls; they call the query module named in `docs/ARCH_MAP.md`.
3. **Destructive commands need an explicit yes.** A drop, truncate, mass update or restore is
   confirmed by the user in the conversation first, every time, even in a script.
4. **Schema changes update the knowledge docs in the same task.** `docs/` describes the shape
   that exists, not the shape you are hoping for.
