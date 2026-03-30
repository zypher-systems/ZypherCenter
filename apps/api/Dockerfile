FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# Copy workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/proxmox-types/package.json ./packages/proxmox-types/
COPY apps/api/package.json ./apps/api/
# Required so pnpm applies patches recorded in package.json
COPY patches ./patches

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/proxmox-types ./packages/proxmox-types
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

# Build
RUN pnpm --filter @zyphercenter/proxmox-types build
RUN pnpm --filter @zyphercenter/api build

# ── Runtime image ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
RUN corepack enable pnpm
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/proxmox-types/package.json ./packages/proxmox-types/
COPY apps/api/package.json ./apps/api/
COPY patches ./patches

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/packages/proxmox-types/dist ./packages/proxmox-types/dist

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
