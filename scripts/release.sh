#!/usr/bin/env bash
# ── ZypherCenter — Release Build Script ───────────────────────────────────────
# Builds amd64 Docker images and pushes them to a container registry.
#
# Usage:
#   ./scripts/release.sh                      # build + push :latest
#   VERSION=0.1.0 ./scripts/release.sh        # build + push :0.1.0 and :latest
#   PUSH=false ./scripts/release.sh           # build only, no push (local test)
#
# Required env:
#   DOCKER_USER   — your Docker Hub username (or full registry prefix)
#                   e.g. "zyphersystems"  →  docker.io/zyphersystems/...
#                   e.g. "ghcr.io/myorg" →  ghcr.io/myorg/...
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DOCKER_USER="${DOCKER_USER:-}"
VERSION="${VERSION:-latest}"
PUSH="${PUSH:-true}"
PLATFORM="linux/amd64"

if [[ -z "$DOCKER_USER" ]]; then
  echo "ERROR: DOCKER_USER is not set."
  echo "  Export your Docker Hub username before running:"
  echo "    export DOCKER_USER=yourusername"
  echo "    ./scripts/release.sh"
  exit 1
fi

API_IMAGE="${DOCKER_USER}/zyphercenter-api"
WEB_IMAGE="${DOCKER_USER}/zyphercenter-web"

echo "============================================================"
echo " ZypherCenter Release Build"
echo "------------------------------------------------------------"
echo "  API image : ${API_IMAGE}"
echo "  Web image : ${WEB_IMAGE}"
echo "  Version   : ${VERSION}"
echo "  Platform  : ${PLATFORM}"
echo "  Push      : ${PUSH}"
echo "============================================================"
echo ""

# Ensure we're building from the repo root
cd "$(dirname "$0")/.."

# ── Build API ─────────────────────────────────────────────────────────────────
echo "▶ Building API..."
docker build \
  --platform "$PLATFORM" \
  -t "${API_IMAGE}:${VERSION}" \
  $([ "$VERSION" != "latest" ] && echo "-t ${API_IMAGE}:latest" || echo "") \
  -f apps/api/Dockerfile \
  .
echo "✓ API image built"
echo ""

# ── Build Web ─────────────────────────────────────────────────────────────────
echo "▶ Building Web..."
docker build \
  --platform "$PLATFORM" \
  -t "${WEB_IMAGE}:${VERSION}" \
  $([ "$VERSION" != "latest" ] && echo "-t ${WEB_IMAGE}:latest" || echo "") \
  -f apps/web/Dockerfile \
  .
echo "✓ Web image built"
echo ""

# ── Push ──────────────────────────────────────────────────────────────────────
if [[ "$PUSH" == "true" ]]; then
  echo "▶ Pushing images..."
  docker push "${API_IMAGE}:${VERSION}"
  docker push "${WEB_IMAGE}:${VERSION}"
  if [[ "$VERSION" != "latest" ]]; then
    docker push "${API_IMAGE}:latest"
    docker push "${WEB_IMAGE}:latest"
  fi
  echo ""
  echo "✓ Images pushed:"
  echo "    ${API_IMAGE}:${VERSION}"
  echo "    ${WEB_IMAGE}:${VERSION}"
  [ "$VERSION" != "latest" ] && echo "    ${API_IMAGE}:latest" && echo "    ${WEB_IMAGE}:latest"
else
  echo "ℹ PUSH=false — images built locally, not pushed."
  echo ""
  echo "  Local images:"
  docker images "${API_IMAGE}" --format "    {{.Repository}}:{{.Tag}}  ({{.Size}})"
  docker images "${WEB_IMAGE}" --format "    {{.Repository}}:{{.Tag}}  ({{.Size}})"
fi

echo ""
echo "Done."
