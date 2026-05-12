#!/usr/bin/env bash
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"

cd "$(dirname "$0")"

git pull --ff-only origin "$BRANCH"
docker compose up -d --build
docker compose exec -T backend npm run seed
docker compose ps
