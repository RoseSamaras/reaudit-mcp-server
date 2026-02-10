#!/bin/bash
#
# Reaudit MCP Server - Publish Script
# Builds, pushes to GitHub, and publishes to npm.
#
# Usage:
#   ./scripts/publish.sh patch        # 1.0.0 -> 1.0.1
#   ./scripts/publish.sh minor        # 1.0.0 -> 1.1.0
#   ./scripts/publish.sh major        # 1.0.0 -> 2.0.0
#   ./scripts/publish.sh 1.2.3        # explicit version
#   ./scripts/publish.sh --github-only patch   # push to GitHub without npm publish
#   ./scripts/publish.sh --npm-only           # publish current version to npm only

set -euo pipefail

# Config
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$(dirname "$SCRIPT_DIR")"
GITHUB_REPO="https://github.com/RoseSamaras/reaudit-mcp-server.git"
STAGING_DIR="/tmp/reaudit-mcp-staging"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# Parse flags
GITHUB_ONLY=false
NPM_ONLY=false

while [[ "${1:-}" == --* ]]; do
  case "$1" in
    --github-only) GITHUB_ONLY=true; shift ;;
    --npm-only)    NPM_ONLY=true; shift ;;
    *) err "Unknown flag: $1" ;;
  esac
done

VERSION_ARG="${1:-}"

# Validate
cd "$MCP_DIR" || err "Cannot find mcp-server directory at $MCP_DIR"

if [[ "$NPM_ONLY" == false && -z "$VERSION_ARG" ]]; then
  echo "Usage: ./scripts/publish.sh [--github-only|--npm-only] <patch|minor|major|x.y.z>"
  echo ""
  echo "Examples:"
  echo "  ./scripts/publish.sh patch           # bump patch, push GitHub + npm"
  echo "  ./scripts/publish.sh minor           # bump minor, push GitHub + npm"
  echo "  ./scripts/publish.sh 2.0.0           # set version, push GitHub + npm"
  echo "  ./scripts/publish.sh --github-only patch   # push to GitHub only"
  echo "  ./scripts/publish.sh --npm-only            # publish current version to npm"
  exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")
log "Current version: $CURRENT_VERSION"

# ─── Step 1: Version bump ────────────────────────────────────────────
if [[ "$NPM_ONLY" == false ]]; then
  case "$VERSION_ARG" in
    patch|minor|major)
      npm version "$VERSION_ARG" --no-git-tag-version --quiet
      ;;
    *)
      npm version "$VERSION_ARG" --no-git-tag-version --quiet --allow-same-version
      ;;
  esac
  NEW_VERSION=$(node -p "require('./package.json').version")
  log "Version bumped: $CURRENT_VERSION → $NEW_VERSION"
else
  NEW_VERSION="$CURRENT_VERSION"
  log "Publishing current version: $NEW_VERSION"
fi

# ─── Step 2: Build & type check ──────────────────────────────────────
log "Building..."
npm run build
log "Build succeeded"

log "Type checking..."
npx tsc --noEmit
log "Type check passed"

# ─── Step 3: Push to GitHub ──────────────────────────────────────────
if [[ "$NPM_ONLY" == false ]]; then
  log "Preparing GitHub push..."

  # Create or update staging directory
  if [[ -d "$STAGING_DIR/.git" ]]; then
    cd "$STAGING_DIR"
    git checkout main 2>/dev/null || true
  else
    rm -rf "$STAGING_DIR"
    git clone "$GITHUB_REPO" "$STAGING_DIR"
    cd "$STAGING_DIR"
  fi

  # Clean old files (except .git)
  find "$STAGING_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

  # Sync files from monorepo (excluding sensitive/dev files)
  rsync -a \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='package-lock.json' \
    --exclude='run.sh' \
    --exclude='.DS_Store' \
    --exclude='.npmrc' \
    "$MCP_DIR/" "$STAGING_DIR/"

  # Commit and push
  cd "$STAGING_DIR"
  git add -A

  if git diff --cached --quiet; then
    warn "No changes to commit to GitHub"
  else
    git commit -m "v${NEW_VERSION}: Release @reaudit/mcp-server@${NEW_VERSION}"
    git tag -f "v${NEW_VERSION}"
    git push origin main
    git push origin "v${NEW_VERSION}" --force
    log "Pushed to GitHub with tag v${NEW_VERSION}"
  fi

  cd "$MCP_DIR"
fi

# ─── Step 4: Publish to npm ──────────────────────────────────────────
if [[ "$GITHUB_ONLY" == false ]]; then
  log "Publishing to npm..."

  # Check npm auth
  NPM_USER=$(npm whoami 2>/dev/null || true)
  if [[ -z "$NPM_USER" ]]; then
    warn "Not logged in to npm. Logging in..."
    npm login --auth-type=web
  else
    log "Logged in to npm as: $NPM_USER"
  fi

  npm publish --access public --auth-type=web
  log "Published @reaudit/mcp-server@${NEW_VERSION} to npm"
fi

# ─── Done ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  @reaudit/mcp-server@${NEW_VERSION} released!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
if [[ "$GITHUB_ONLY" == false ]]; then
  echo "  npm:    https://www.npmjs.com/package/@reaudit/mcp-server"
fi
if [[ "$NPM_ONLY" == false ]]; then
  echo "  GitHub: https://github.com/RoseSamaras/reaudit-mcp-server"
fi
echo "  Install: npm install -g @reaudit/mcp-server"
echo ""
