# MCP Server Deployment Guide

How to update and publish `@reaudit/mcp-server` to GitHub and npm.

## Architecture

The MCP server source lives inside the main Reaudit monorepo at `mcp-server/`, but has a **separate public GitHub repository** for distribution:

- **Source (monorepo):** `/mcp-server/` in the main Reaudit repo
- **Public GitHub:** https://github.com/RoseSamaras/reaudit-mcp-server
- **npm package:** https://www.npmjs.com/package/@reaudit/mcp-server

The publish script syncs files from the monorepo to the standalone GitHub repo, then publishes to npm.

## Quick Start (Two-Step Process)

**npm publish requires browser-based 2FA, which only works from a real terminal (iTerm/Terminal.app). Cursor's integrated terminal cannot open the browser, so the publish must be split into two steps.**

### Step 1: Push to GitHub (from Cursor)

```bash
cd mcp-server
./scripts/publish.sh --github-only patch   # or minor / major / 1.2.3
```

### Step 2: Publish to npm (from iTerm / Terminal.app)

```bash
cd "/Users/rosesamaras/Cursor projects/airanking/mcp-server"
npm publish --access public --auth-type=web
```

This opens a browser tab → click **"Authenticate"** → done.

### All-in-one (only from a real terminal, NOT Cursor)

```bash
cd mcp-server
./scripts/publish.sh patch   # or minor / major / 1.2.3
```

## What the Script Does

1. **Bumps version** in `package.json`
2. **Builds** TypeScript (`npm run build`)
3. **Type-checks** (`tsc --noEmit`)
4. **Syncs to GitHub** — copies files to a staging directory, commits, and pushes to the standalone repo with a version tag
5. **Publishes to npm** — runs `npm publish --access public --auth-type=web` (opens browser for 2FA)

## Partial Releases

```bash
# Push to GitHub only (no npm publish) — works from Cursor
./scripts/publish.sh --github-only patch

# Publish to npm only (no GitHub push, uses current version) — must use real terminal
./scripts/publish.sh --npm-only
```

## Prerequisites

- **Node.js 18+** installed
- **npm** logged in as `reaudit` (`npm whoami` should return `reaudit`)
- **Git** with push access to `RoseSamaras/reaudit-mcp-server`
- **2FA** — the script uses `--auth-type=web` which opens your browser for authentication

### First-Time npm Login

```bash
npm login --auth-type=web
```

This opens your browser. Complete the authentication and you're set.

## Files Excluded from Public Repo

These files are **never** pushed to the public GitHub repo or npm:

| File | Reason |
|------|--------|
| `run.sh` | Contains local paths and client ID |
| `node_modules/` | Dependencies (users install their own) |
| `dist/` | Built output (npm publishes its own build) |
| `package-lock.json` | Regenerated on install |
| `.npmrc` | May contain auth tokens |
| `.DS_Store` | macOS metadata |

## Manual Steps (if script fails)

### 1. Bump version

```bash
cd mcp-server
npm version patch --no-git-tag-version
```

### 2. Build

```bash
npm run build
```

### 3. Push to GitHub

```bash
cd /tmp/reaudit-mcp-staging
git pull origin main

# Copy files from monorepo
rsync -a --exclude='node_modules' --exclude='dist' --exclude='package-lock.json' \
  --exclude='run.sh' --exclude='.DS_Store' --exclude='.npmrc' \
  "/Users/rosesamaras/Cursor projects/airanking/mcp-server/" .

git add -A
git commit -m "v1.0.1: Release @reaudit/mcp-server@1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

### 4. Publish to npm

```bash
cd "/Users/rosesamaras/Cursor projects/airanking/mcp-server"
npm publish --access public --auth-type=web
```

### 5. Verify

```bash
npm view @reaudit/mcp-server version
```

## Versioning Guidelines

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| Bug fixes, typo corrections | `patch` | 1.0.0 → 1.0.1 |
| New tools, features | `minor` | 1.0.1 → 1.1.0 |
| Breaking API changes | `major` | 1.1.0 → 2.0.0 |

## Troubleshooting

### "Access token expired or revoked"
Run `npm login --auth-type=web` to re-authenticate.

### "You cannot publish over the previously published versions"
The version already exists on npm. Bump the version first: `npm version patch --no-git-tag-version`

### "This operation requires a one-time password"
This means npm couldn't open a browser for 2FA. **You are probably running from Cursor's terminal.** Switch to iTerm / Terminal.app and run:
```bash
cd "/Users/rosesamaras/Cursor projects/airanking/mcp-server"
npm publish --access public --auth-type=web
```
A browser tab will open — click "Authenticate" and npm will complete the publish.

### CI workflow failing
The GitHub CI uses `npm install` (not `npm ci`), so no `package-lock.json` is needed. If CI fails, check the GitHub Actions tab for details.
