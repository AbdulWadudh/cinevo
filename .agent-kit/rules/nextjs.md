# Rule file — Next.js 16

This is not the Next.js in your training data: APIs, conventions and file structure differ.

1. **Read the shipped guide before writing code.** The docs are in
   `node_modules/next/dist/docs/`; open the page for the feature you are touching.
2. **Heed deprecation notices.** The renamed surfaces are the tell — middleware is
   `src/proxy.ts` here, and `params` / `searchParams` are async.
3. **Check the installed version, not the internet.** `.agent-kit/project.md` §Stack names
   the version; a pattern from another version is a guess until the local docs confirm it.
