#!/usr/bin/env bash
# ── ZypherCenter — Release Build Script ───────────────────────────────────────
# Builds a single amd64 image and pushes it to GitHub Container Registry (GHCR).
#
# Usage:
#   ./scripts/release.sh                      # build + push :latest
#   VERSION=0.1.0 ./scripts/release.sh        # build + push :0.1.0 and :latest
#   PUSH=false ./scripts/release.sh           # build only, no push (local test)
#
# Auth (one-time setup):
#   echo $GITHUB_TOKEN | docker login ghcr.io -u GITHUB_USERNAME --password-stdin
#
# The GITHUB_TOKEN needs the "write:packages" scope.
# Create one at: https://github.com/settings/tokens
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

IMAGE="ghcr.io/zypher-systems/zyphercenter"
VERSION="${VERSION:-latest}"
PUSH="${PUSH:-true}"
PLATFORM="linux/amd64"

echo "============================================================"
echo " ZypherCenter Release Build"
echo "------------------------------------------------------------"
echo "  Image    : ${IMAGE}"
echo "  Version  : ${VERSION}"
echo "  Platform : ${PLATFORM}"
echo "  Push     : ${PUSH}"
echo "============================================================"
echo ""

# Ensure we're building from the repo root
cd "$(dirname "$0")/.."

# ── Build ─────────────────────────────────────────────────────────────────────
echo "▶ Building image..."

TAG_ARGS="-t ${IMAGE}:${VERSION}"
if [[ "$VERSION" != "latest" ]]; then
  TAG_ARGS="$TAG_ARGS -t ${IMAGE}:latest"
fi

docker build \
  --platform "$PLATFORM" \
  $TAG_ARGS \
  -f Dockerfile \
  .

echo "✓ Image built"
echo ""

# ── Push ──────────────────────────────────────────────────────────────────────
if [[ "$PUSH" == "true" ]]; then
  echo "▶ Pushing to GHCR..."
  docker push "${IMAGE}:${VERSION}"
  if [[ "$VERSION" != "latest" ]]; then
    docker push "${IMAGE}:latest"
  fi
  echo ""
  echo "✓ Pushed:"
  echo "    ${IMAGE}:${VERSION}"
  [[ "$VERSION" != "latest" ]] && echo "    ${IMAGE}:latest"
  echo ""
  echo "  Users can now deploy with:"
  echo "    docker run -d -p 80:80 \\"
  echo "      -e PROXMOX_HOST=https://YOUR_PROXMOX:8006 \\"
  echo "      -e SESSION_SECRET=\$(openssl rand -hex 32) \\"
  echo "      --name zyphercenter --restart unless-stopped \\"
  echo "      ${IMAGE}:${VERSION}"
else
  echo "ℹ PUSH=false — image built locally, not pushed."
  docker images "$IMAGE" --format "    {{.Repository}}:{{.Tag}}  ({{.Size}})"
fi

echo ""
echo "Done."
