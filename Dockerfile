# syntax=docker/dockerfile:1.7
# Multi-stage build for apps/saas (Next.js monorepo with pnpm + Turborepo)

ARG NODE_VERSION=22

# ─── Stage 1: base ────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# ─── Stage 2: install deps ────────────────────────────────────────────────────
FROM base AS installer
WORKDIR /app

# Copy workspace manifests (enables pnpm to resolve the workspace graph)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Apps
COPY apps/saas/package.json      ./apps/saas/
COPY apps/marketing/package.json ./apps/marketing/
COPY apps/docs/package.json      ./apps/docs/
COPY apps/mail-preview/package.json ./apps/mail-preview/

# Packages
COPY packages/aacsearch-mcp/package.json ./packages/aacsearch-mcp/
COPY packages/ai/package.json            ./packages/ai/
COPY packages/ai-core/package.json       ./packages/ai-core/
COPY packages/api/package.json           ./packages/api/
COPY packages/auth/package.json          ./packages/auth/
COPY packages/billing-wallet/package.json ./packages/billing-wallet/
COPY packages/database/package.json      ./packages/database/
COPY packages/i18n/package.json          ./packages/i18n/
COPY packages/logs/package.json          ./packages/logs/
COPY packages/mail/package.json          ./packages/mail/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/payments/package.json      ./packages/payments/
COPY packages/search/package.json        ./packages/search/
COPY packages/search-client/package.json ./packages/search-client/
COPY packages/storage/package.json       ./packages/storage/
COPY packages/ui/package.json            ./packages/ui/
COPY packages/utils/package.json         ./packages/utils/
COPY packages/widget/package.json        ./packages/widget/

# Tooling
COPY tooling/scripts/package.json    ./tooling/scripts/
COPY tooling/tailwind/package.json   ./tooling/tailwind/
COPY tooling/typescript/package.json ./tooling/typescript/

# docs postinstall needs full source (imports packages/api/v1/openapi.ts) — skip it here
RUN pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm rebuild

# ─── Stage 3: source ──────────────────────────────────────────────────────────
FROM installer AS source
WORKDIR /app

# Copy only what saas build + docs postinstall need
# Apps
COPY apps/saas      ./apps/saas
COPY apps/docs      ./apps/docs
COPY apps/marketing ./apps/marketing
COPY apps/mail-preview ./apps/mail-preview

# Packages (all since dependencies are cross-cutting)
COPY packages/aacsearch-mcp ./packages/aacsearch-mcp
COPY packages/ai           ./packages/ai
COPY packages/ai-core      ./packages/ai-core
COPY packages/api          ./packages/api
COPY packages/auth         ./packages/auth
COPY packages/billing-wallet ./packages/billing-wallet
COPY packages/database     ./packages/database
COPY packages/i18n         ./packages/i18n
COPY packages/logs         ./packages/logs
COPY packages/mail         ./packages/mail
COPY packages/notifications ./packages/notifications
COPY packages/payments     ./packages/payments
COPY packages/search       ./packages/search
COPY packages/search-client ./packages/search-client
COPY packages/storage      ./packages/storage
COPY packages/ui           ./packages/ui
COPY packages/utils        ./packages/utils
COPY packages/widget       ./packages/widget

# Tooling
COPY tooling ./tooling

# Tsconfig needed for builds
COPY tsconfig.json ./

# Generate Prisma client (engineType = "client" — no binary needed)
RUN pnpm --filter @repo/database generate

# Docs postinstall needs full source tree — run it now
RUN pnpm --filter docs exec node --import tsx scripts/generate-api-ref.ts && \
    pnpm --filter docs exec fumadocs-mdx

# ─── Stage 4: build ─────────────────────────────────────────────────────────────
FROM source AS builder

# Build saas app in standalone mode so the runner stage is minimal
ENV NEXT_OUTPUT_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter saas build

# ─── Stage 5: runner ──────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Standalone output already bundles required node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/saas/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/saas/.next/static     ./apps/saas/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/saas/public           ./apps/saas/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --quiet --spider http://localhost:3000/api/health || exit 1

CMD ["node", "apps/saas/server.js"]
