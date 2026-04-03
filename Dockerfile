# ── Stage 1: Build API ────────────────────────────────────────────────────────
FROM node:22-alpine AS api-builder
RUN corepack enable pnpm
WORKDIR /build

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/proxmox-types/package.json ./packages/proxmox-types/
COPY apps/api/package.json ./apps/api/
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/proxmox-types ./packages/proxmox-types
COPY apps/api ./apps/api

RUN pnpm --filter @zyphercenter/proxmox-types build
RUN pnpm --filter @zyphercenter/api build

# ── Stage 2: Build Web ────────────────────────────────────────────────────────
FROM node:22-alpine AS web-builder
RUN corepack enable pnpm
WORKDIR /build

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/proxmox-types/package.json ./packages/proxmox-types/
COPY apps/web/package.json ./apps/web/
COPY patches ./patches
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/proxmox-types ./packages/proxmox-types
COPY apps/web ./apps/web

RUN pnpm --filter @zyphercenter/web build

# ── Stage 3: Production runtime ───────────────────────────────────────────────
# Single Alpine container: nginx (port 80) + Node.js API (port 3001, internal)
# nginx proxies /api/* to localhost:3001 — users only ever need port 80.
FROM node:22-alpine AS runtime

RUN apk add --no-cache nginx

# Install production-only API deps
RUN corepack enable pnpm
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/proxmox-types/package.json ./packages/proxmox-types/
COPY apps/api/package.json ./apps/api/
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod

# Copy compiled API + types
COPY --from=api-builder /build/apps/api/dist ./apps/api/dist
COPY --from=api-builder /build/packages/proxmox-types/dist ./packages/proxmox-types/dist

# Copy compiled React SPA into nginx document root
COPY --from=web-builder /build/apps/web/dist /usr/share/nginx/html

# nginx config: proxies /api/ to the local Node process at 127.0.0.1:3001
COPY docker/nginx.single.conf /etc/nginx/http.d/default.conf

# Process entrypoint: starts Node API then execs nginx
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
# CORS is irrelevant in single-container mode (same origin through nginx)
# but set a default so the env schema doesn't warn.
ENV CORS_ORIGIN=http://localhost

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/entrypoint.sh"]
