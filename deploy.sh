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

if [ ! -f .env ]; then
  echo "Missing .env file. Create it from .env.docker.example before deploying." >&2
  exit 1
fi

git pull --ff-only origin "$BRANCH"
docker compose up -d --build --remove-orphans
docker compose ps

echo
echo "Deployment started."
echo "Health checks:"
echo "  Frontend: http://127.0.0.1:${FRONTEND_PORT:-80}/healthz"
echo "  Backend:  docker compose exec backend node -e \"fetch('http://127.0.0.1:3001/api/health').then(r => r.text().then(t => console.log(r.status, t)))\""
