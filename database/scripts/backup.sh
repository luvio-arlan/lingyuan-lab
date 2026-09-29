#!/bin/sh
# Daily PostgreSQL custom-format backup; run once per day from cron or a timer.
set -eu
umask 077

: "${PGDATABASE:?Set PGDATABASE to the database name}"
: "${BACKUP_DIR:?Set BACKUP_DIR to the backup directory}"

mkdir -p "$BACKUP_DIR"
temporary_file=$(mktemp "$BACKUP_DIR/.lingyuan-backup.XXXXXX")
trap 'rm -f "$temporary_file"' EXIT HUP INT TERM

pg_dump -Fc --file "$temporary_file" "$PGDATABASE"
pg_restore --list "$temporary_file" >/dev/null

backup_file="$BACKUP_DIR/lingyuan-$(date -u '+%Y%m%dT%H%M%SZ')-$$.dump"
mv "$temporary_file" "$backup_file"
trap - EXIT HUP INT TERM

# -mtime +13 means completed 24-hour periods >= 14; retain at least 14 days.
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'lingyuan-*.dump' -mtime +13 -delete
printf '%s\n' "$backup_file"
