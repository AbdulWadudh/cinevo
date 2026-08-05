# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Cinevo — production image (Next.js 16, standalone output).
#
# Debian slim rather than Alpine on purpose: Next's SWC binary, lightningcss and
# @tailwindcss/oxide each ship a separate musl build, and that's a whole class of
# install failure not worth carrying to save ~40MB.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:26-slim AS builder
WORKDIR /app

# Manifests first, so the install layer survives source-only edits. prisma/ comes
# along because `postinstall` runs `prisma generate` and needs the schema.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma

# `npm install`, not `npm ci`, and not by preference. npm generating this lockfile
# on Windows cannot record a tree that satisfies `npm ci` on Linux: the wasm32
# fallbacks of @tailwindcss/oxide and sharp need a hoisted @emnapi/core and
# @emnapi/runtime, and npm won't add either from a Windows host — not even with
# --package-lock-only --os=linux. `npm ci` then aborts with EUSAGE before the
# build starts. `npm install` honours every version the lockfile does pin and
# resolves only those gaps, which is exactly what Vercel has been doing all along
# (its default install command), hence why this never surfaced there.
RUN npm install --no-audit --no-fund

COPY . .

# `next build` inlines NEXT_PUBLIC_* into the browser bundle, so these have to
# exist now — set only at run time they never reach the client. The TMDB pair is
# here because /gallery and /reveal prerender against the API. Coolify injects an
# ARG/ENV per environment variable itself; these keep `docker build` equivalent.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG TMDB_API_KEY
ARG TMDB_ACCESS_TOKEN
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY} \
    TMDB_API_KEY=${TMDB_API_KEY} \
    TMDB_ACCESS_TOKEN=${TMDB_ACCESS_TOKEN} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:26-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0

# standalone is server.js plus a traced node_modules; it excludes static/ and
# public/ by design, hence the two extra copies. `node` is the unprivileged uid
# 1000 every official Node image ships, so there's no useradd to get wrong.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
