#!/usr/bin/env bash
# Deploy script for Laboratory Freezer Management System
#
# On fresh server: docker compose up -d --build
#   - MySQL auto-created, schema migrations run on backend startup
#   - Root user (root/root123) created automatically
#   - No manual DB setup needed
#
# For re-deployment: ./deploy.sh
#   - Pulls latest code, rebuilds, restarts
#   - Schema migrations are idempotent (safe to re-run)
#   - Existing data preserved in Docker volume
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"

cd "$(dirname "$0")"

git pull --ff-only origin "$BRANCH"
docker compose up -d --build
docker compose ps
