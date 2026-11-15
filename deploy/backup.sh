#!/bin/sh
# Nightly PostgreSQL backup with rotation (self-host option, item 12). Runs in the `backup` service.
# Each run writes /backups/daily/<db>-<time>.dump (pg_dump custom format, includes uploaded files,
# which live in the database), checks it can be read, keeps the newest KEEP_DAILY daily copies, and
# on Sundays also keeps a copy in /backups/weekly (newest KEEP_WEEKLY). ./backups on the host is
# where IT copies backups off the server.
set -eu
: "${BACKUP_AT:=02:00}" "${KEEP_DAILY:=7}" "${KEEP_WEEKLY:=4}"
mkdir -p /backups/daily /backups/weekly

run_backup() {
  stamp=$(date +%Y-%m-%dT%H%M)
  file="/backups/daily/${PGDATABASE}-${stamp}.dump"
  pg_dump --format=custom --no-owner --file="$file.partial"
  pg_restore --list "$file.partial" > /dev/null   # refuse to keep an unreadable dump
  mv "$file.partial" "$file"
  if [ "$(date +%u)" = "7" ]; then cp "$file" /backups/weekly/; fi
  ls -1t /backups/daily/*.dump 2>/dev/null | tail -n +$((KEEP_DAILY + 1)) | xargs -r rm -f
  ls -1t /backups/weekly/*.dump 2>/dev/null | tail -n +$((KEEP_WEEKLY + 1)) | xargs -r rm -f
  echo "$(date -Iseconds) backup ok: $file ($(du -h "$file" | cut -f1))"
}

run_backup   # one at start-up, so a fresh install is covered straight away
while true; do
  now=$(date +%s)
  next=$(date -d "today $BACKUP_AT" +%s)
  [ "$next" -le "$now" ] && next=$(date -d "tomorrow $BACKUP_AT" +%s)
  sleep $((next - now))
  run_backup || echo "$(date -Iseconds) BACKUP FAILED" >&2
done
