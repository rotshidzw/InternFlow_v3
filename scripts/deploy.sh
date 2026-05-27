#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env.production ]]; then
  echo "Missing .env.production. Copy .env.production.example first." >&2
  exit 1
fi

corepack enable
pnpm install --frozen-lockfile
pnpm --filter @internflow/db db:generate
pnpm --filter @internflow/db db:migrate:deploy
pnpm --filter @internflow/web build

docker compose -f docker-compose.prod.yml build

docker compose -f docker-compose.prod.yml up -d app

echo "Deployment completed. Verify with: curl -I http://127.0.0.1"
