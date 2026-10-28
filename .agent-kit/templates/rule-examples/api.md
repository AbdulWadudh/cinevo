# Rule file example — API versioning

Not installed. Copy this to `.agent-kit/rules/api.md` when the repo serves HTTP.

1. **Version every route from the first commit:** `/api/v1/...`. Only `/health` is exempt.
2. **Third-party handlers mounted in get versioned too**, through their `basePath`.
3. **Bump only for a breaking change.** Additive changes stay on the current version.
4. **Non-HTTP transports carry a matching version field** — a WS envelope `v`, a queue job
   `schemaVersion`. Path and payload versions move together.
5. **It goes in on day one.** Retrofitting a prefix once clients exist is itself a breaking
   change.
