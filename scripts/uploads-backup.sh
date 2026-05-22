#!/bin/sh
set -eu

UPLOADS_DIR="${UPLOADS_DIR:-/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_AT_HOUR="${BACKUP_AT_HOUR:-3}"
RUN_ON_START="${RUN_ON_START:-true}"

mkdir -p "$UPLOADS_DIR" "$BACKUP_DIR"

log_time() {
  date '+%Y-%m-%dT%H:%M:%S%z'
}

run_backup() {
  timestamp="$(date +%Y%m%d_%H%M%S)"
  output="$BACKUP_DIR/uploads_${timestamp}.tar.gz"
  tmp_output="${output}.tmp"

  echo "[$(log_time)] Starting uploads backup: $output"
  tar -C "$UPLOADS_DIR" -czf "$tmp_output" .
  mv "$tmp_output" "$output"
  find "$BACKUP_DIR" -type f -name "uploads_*.tar.gz" -mtime +"$BACKUP_RETENTION_DAYS" -delete
  echo "[$(log_time)] Uploads backup completed: $output"
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
  run_backup || echo "[$(log_time)] Initial uploads backup failed; scheduler will keep running."
fi

while true; do
  sleep_seconds="$(seconds_until_next_run)"
  echo "[$(log_time)] Next uploads backup in ${sleep_seconds}s at ${BACKUP_AT_HOUR}:00."
  sleep "$sleep_seconds"
  run_backup || echo "[$(log_time)] Scheduled uploads backup failed; will retry on next schedule."
done
