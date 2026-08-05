# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Cinevo — production image (Next.js 16, standalone output)
#
#   docker build -t cinevo . --build-arg NEXT_PUBLIC_SUPABASE_URL=... (see below)
#   docker run -p 3000:3000 --env-file .env cinevo
#
# See README → "Deploy with Docker / Coolify" for the full variable list and
# which of them have to be present at BUILD time rather than run time.
# ─────────────────────────────────────────────────────────────────────────────


# ── Stage 1: dependencies ────────────────────────────────────────────────────
FROM node:24-alpine AS deps

# Next.js ships glibc-linked SWC binaries; libc6-compat is the musl shim.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# package.json's `postinstall` runs `prisma generate`, so the schema and
# prisma.config.ts must already be in place — the manifests alone aren't enough.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci


# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next build` inlines every NEXT_PUBLIC_* value into the browser bundle, so
# these must exist HERE — supplying them only at run time never reaches the
# client. In Coolify that means ticking "Build Variable?" on each one.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_TMDB_API_KEY
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_SITE_URL
# Server-side values any route prerendered during the build may read.
ARG TMDB_API_KEY
ARG TMDB_ACCESS_TOKEN
ARG DATABASE_URL
ARG DIRECT_URL

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_TMDB_API_KEY=${NEXT_PUBLIC_TMDB_API_KEY} \
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${NEXT_PUBLIC_VAPID_PUBLIC_KEY} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    TMDB_API_KEY=${TMDB_API_KEY} \
    TMDB_ACCESS_TOKEN=${TMDB_ACCESS_TOKEN} \
    DATABASE_URL=${DATABASE_URL} \
    DIRECT_URL=${DIRECT_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Runs `prisma generate && next build` (see package.json).
RUN npm run build


# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs

# `output: "standalone"` produces server.js plus a pruned node_modules; static
# assets and public/ are deliberately left out of it and copied separately.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma's generated client is reached through a runtime require() that the
# standalone tracer can miss. A few MB here beats a "did you run prisma
# generate?" crash on the first database query.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000

# /api/health is excluded from the proxy matcher, so probing it costs no
# Supabase round-trip and stays green while upstreams wobble.
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
