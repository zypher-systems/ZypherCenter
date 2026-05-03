#!/bin/sh
# ZypherCenter entrypoint — runs the API and nginx in a single container.
# nginx (port 80) proxies /api/* to the local Node process (port 3001).
set -e

echo "[zyphercenter] Starting API server..."
node /app/apps/api/dist/index.js &

# BUG-03: Wait for the API to be ready before starting nginx.
# Without this, nginx may return 502 during the ~1-3s API startup window.
echo "[zyphercenter] Waiting for API to be ready..."
until node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 0.5
done

echo "[zyphercenter] API is ready. Starting nginx..."
exec nginx -g 'daemon off;'
