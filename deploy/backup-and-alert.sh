#!/bin/sh
# Run daily from a system timer. Optional monitors report backup failures.
set -eu
cd "$(dirname "$0")"

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose --env-file .env -f compose.yaml --profile maintenance "$@"; }
else
  compose() { docker-compose --env-file .env -f compose.yaml --profile maintenance "$@"; }
fi

if [ -n "${BACKUP_ALIYUN_ALERT_URL:-}" ]; then
  case "$BACKUP_ALIYUN_ALERT_URL" in
    'https://metrichub-cms-cn-hangzhou.aliyuncs.com/event/notify?'*) ;;
    *) printf 'BACKUP_ALIYUN_ALERT_URL must be the Hangzhou CloudMonitor alert URL\n' >&2; exit 2 ;;
  esac
  newline=$(printf '\n_')
  newline=${newline%_}
  carriage_return=$(printf '\r')
  case "$BACKUP_ALIYUN_ALERT_URL" in
    *'"'*|*'\'*|*"$newline"*|*"$carriage_return"*)
      printf 'BACKUP_ALIYUN_ALERT_URL contains unsupported characters\n' >&2
      exit 2 ;;
  esac
  case "${BACKUP_ALIYUN_ALERT_KEYWORD:-}" in
    ''|*[!A-Za-z0-9_-]*)
      printf 'BACKUP_ALIYUN_ALERT_KEYWORD must contain only letters, digits, _ or -\n' >&2
      exit 2 ;;
  esac
  if compose run --rm backup; then
    exit 0
  else
    result=$?
  fi
  payload=$(printf '{"ruleName":"LingyuanBackup","title":"Lingyuan backup failed","message":"Lingyuan backup failed %s"}' "$BACKUP_ALIYUN_ALERT_KEYWORD")
  if response=$(printf 'url = "%s"\n' "$BACKUP_ALIYUN_ALERT_URL" | \
      curl --fail --silent --max-time 10 --retry 2 \
      --header 'Content-Type: application/json' --data "$payload" --config -); then
    if printf '%s' "$response" | python3 -c 'import json,sys; response=json.load(sys.stdin); sys.exit(0 if str(response.get("code")) == "200" else 1)'; then
      printf 'Alibaba CloudMonitor accepted the backup failure alert\n' >&2
    else
      printf 'Alibaba CloudMonitor rejected the backup failure alert\n' >&2
    fi
  else
    printf 'Could not send backup failure alert to Alibaba CloudMonitor\n' >&2
  fi
  exit "$result"
fi

if [ -z "${BACKUP_HEALTHCHECK_URL:-}" ]; then
  printf 'Backup monitor not configured; running backup without remote notification\n' >&2
  compose run --rm backup
  exit
fi
case "$BACKUP_HEALTHCHECK_URL" in
  https://*) ;;
  *) printf 'BACKUP_HEALTHCHECK_URL must use HTTPS\n' >&2; exit 2 ;;
esac

start_ping_failed=0
curl --fail --silent --show-error --max-time 10 --retry 2 \
  --request POST "${BACKUP_HEALTHCHECK_URL}/start" >/dev/null || start_ping_failed=1
if compose run --rm backup; then
  curl --fail --silent --show-error --max-time 10 --retry 2 \
    --request POST "$BACKUP_HEALTHCHECK_URL" >/dev/null
  [ "$start_ping_failed" -eq 0 ]
else
  result=$?
  curl --fail --silent --show-error --max-time 10 --retry 2 \
    --request POST "${BACKUP_HEALTHCHECK_URL}/fail" >/dev/null || true
  exit "$result"
fi
