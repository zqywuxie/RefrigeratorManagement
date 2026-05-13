#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-mysql}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-biofridge_password}"
DB_NAME="${DB_NAME:-biofridge}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_AT_HOUR="${BACKUP_AT_HOUR:-3}"
RUN_ON_START="${RUN_ON_START:-true}"

mkdir -p "$BACKUP_DIR"

run_backup() {
  timestamp="$(date +%Y%m%d_%H%M%S)"
  output="$BACKUP_DIR/${DB_NAME}_${timestamp}.sql.gz"
  tmp_output="${output}.tmp"

  echo "[$(date -Iseconds)] Starting MySQL backup: $output"
  MYSQL_PWD="$DB_PASSWORD" mysqldump \
    -h "$DB_HOST" \
    -P "$DB_PORT" \
    -u "$DB_USER" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    "$DB_NAME" | gzip > "$tmp_output"
  mv "$tmp_output" "$output"
  find "$BACKUP_DIR" -type f -name "${DB_NAME}_*.sql.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
  echo "[$(date -Iseconds)] MySQL backup completed: $output"
}

seconds_until_next_run() {
  now_epoch="$(date +%s)"
  today="$(date +%Y-%m-%d)"
  target_epoch="$(date -d "$today $BACKUP_AT_HOUR:00:00" +%s)"
  if [ "$target_epoch" -le "$now_epoch" ]; then
    target_epoch=$((target_epoch + 86400))
  fi
  echo $((target_epoch - now_epoch))
}

if [ "$RUN_ON_START" = "true" ]; then
  run_backup || echo "[$(date -Iseconds)] Initial backup failed; scheduler will keep running."
fi

while true; do
  sleep_seconds="$(seconds_until_next_run)"
  echo "[$(date -Iseconds)] Next MySQL backup in ${sleep_seconds}s at ${BACKUP_AT_HOUR}:00."
  sleep "$sleep_seconds"
  run_backup || echo "[$(date -Iseconds)] Scheduled backup failed; will retry on next schedule."
done
