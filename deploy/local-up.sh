#!/bin/sh
set -eu
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  umask 077
  backup_dir="${HOME}/.local/share/lingyuan-lab/backups"
  mkdir -p "$backup_dir"
  random_hex() { od -An -tx1 -N "$1" /dev/urandom | tr -d ' \n'; }
  cat >.env <<EOF
POSTGRES_PASSWORD=$(random_hex 24)
RATE_LIMIT_SALT=$(random_hex 32)
BACKUP_DIR=$backup_dir
WEB_PORT=8080
EOF
fi

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose --env-file .env -f compose.yaml -f compose.local.yaml "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose --env-file .env -f compose.yaml -f compose.local.yaml "$@"; }
else
  printf 'Docker Compose is required.\n' >&2
  exit 1
fi
compose build api web
compose up -d --wait db
compose run --rm api lingyuan-admin migrate
compose run --rm api lingyuan-admin sync-topics /app/frontend/src/content/questions
compose up -d --wait api web
port=$(sed -n 's/^WEB_PORT=//p' .env | tail -n 1)
printf 'Local site: http://localhost:%s\n' "${port:-8080}"
