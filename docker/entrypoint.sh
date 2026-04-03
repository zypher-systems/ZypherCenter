#!/bin/sh
# ZypherCenter entrypoint — runs the API and nginx in a single container.
# nginx (port 80) proxies /api/* to the local Node process (port 3001).
set -e

echo "[zyphercenter] Starting API server..."
node /app/apps/api/dist/index.js &

echo "[zyphercenter] Starting nginx..."
exec nginx -g 'daemon off;'
