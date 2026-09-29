#!/bin/sh
set -eu
script=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)/backup-and-alert.sh
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT HUP INT TERM

cat >"$scratch/docker" <<'EOF'
#!/bin/sh
exit 1
EOF
cat >"$scratch/docker-compose" <<'EOF'
#!/bin/sh
printf 'backup\n' >>"$MOCK_LOG"
exit "${MOCK_BACKUP_STATUS:-0}"
EOF
cat >"$scratch/curl" <<'EOF'
#!/bin/sh
for argument do last=$argument; done
if [ "$last" = - ]; then
  IFS= read -r config
  last=${config#url = \"}
  last=${last%\"}
fi
printf '%s\n' "$last" >>"$MOCK_LOG"
case "$last" in
  */start) exit "${MOCK_START_STATUS:-0}" ;;
  *event/notify*) printf '{"code":"%s"}\n' "${MOCK_ALIYUN_CODE:-200}"; exit 0 ;;
esac
exit 0
EOF
chmod +x "$scratch/docker" "$scratch/docker-compose" "$scratch/curl"

export PATH="$scratch:$PATH" MOCK_LOG="$scratch/log"
export BACKUP_HEALTHCHECK_URL=https://monitor.example/ping/test

sh "$script"
test "$(cat "$MOCK_LOG")" = "$(printf '%s\n' \
  'https://monitor.example/ping/test/start' backup \
  'https://monitor.example/ping/test')"

: >"$MOCK_LOG"
export MOCK_BACKUP_STATUS=7
if sh "$script"; then
  printf 'Expected backup failure\n' >&2
  exit 1
else
  test "$?" -eq 7
fi
test "$(cat "$MOCK_LOG")" = "$(printf '%s\n' \
  'https://monitor.example/ping/test/start' backup \
  'https://monitor.example/ping/test/fail')"

: >"$MOCK_LOG"
export MOCK_BACKUP_STATUS=0 MOCK_START_STATUS=1
if sh "$script"; then
  printf 'Expected monitor failure to produce nonzero status\n' >&2
  exit 1
fi
test "$(cat "$MOCK_LOG")" = "$(printf '%s\n' \
  'https://monitor.example/ping/test/start' backup \
  'https://monitor.example/ping/test')"

: >"$MOCK_LOG"
unset BACKUP_HEALTHCHECK_URL
sh "$script"
test "$(cat "$MOCK_LOG")" = backup

: >"$MOCK_LOG"
export BACKUP_ALIYUN_ALERT_URL='https://metrichub-cms-cn-hangzhou.aliyuncs.com/event/notify?token=test&level=WARN'
export BACKUP_ALIYUN_ALERT_KEYWORD=LingyuanBackup
sh "$script"
test "$(cat "$MOCK_LOG")" = backup

: >"$MOCK_LOG"
export MOCK_BACKUP_STATUS=7
if sh "$script"; then
  printf 'Expected Alibaba CloudMonitor backup failure\n' >&2
  exit 1
else
  test "$?" -eq 7
fi
test "$(cat "$MOCK_LOG")" = "$(printf '%s\n' backup "$BACKUP_ALIYUN_ALERT_URL")"

: >"$MOCK_LOG"
export MOCK_ALIYUN_CODE=403
if sh "$script" 2>"$scratch/error"; then
  printf 'Expected failed backup status despite rejected alert\n' >&2
  exit 1
else
  test "$?" -eq 7
fi
grep -q 'rejected the backup failure alert' "$scratch/error"

printf 'Backup alert success, backup failure, monitor failure, no-monitor and Alibaba CloudMonitor paths passed\n'
