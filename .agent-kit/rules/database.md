# Rule file — Data and migrations

PostgreSQL through Prisma; the client and the connection layer are named in
`.agent-kit/project.md` §Stack and §Entry points.

1. **Migrations are append-only.** Never edit a directory under `prisma/migrations/` that has
   run anywhere. A schema change is `prisma/schema.prisma` plus a new timestamped migration
   directory, and the change file names it.
2. **Queries go through `src/lib/db.ts`.** No SQL and no second Prisma client in a component,
   action or route handler.
3. **Destructive commands need an explicit yes.** A drop, truncate, mass update or restore is
   confirmed by the owner in the conversation first, every time.
4. **Never edit the generated Prisma client.** `npm run build` runs `prisma generate`; the
   fix belongs in `schema.prisma`.
