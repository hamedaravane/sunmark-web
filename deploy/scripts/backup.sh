#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
load_config; load_release; load_backup
lock_operation
dump="$SUNMARK_STATE_DIR/backups/sunmark.dump"
temporary=$(mktemp "$SUNMARK_STATE_DIR/backups/dump.XXXXXX")
trap 'rm -f -- "$temporary"' EXIT
compose exec -T postgres pg_dump -U sunmark_admin -d sunmark -Fc --no-owner --no-acl > "$temporary"
compose exec -T postgres pg_restore --list < "$temporary" >/dev/null
mv -- "$temporary" "$dump"
restic_bounded 300s backup --quiet --tag sunmark "$dump"
restic_bounded 90s forget --quiet --tag sunmark --keep-daily 7 --keep-weekly 4 --keep-monthly 3
restic_bounded 90s forget --quiet --tag sunmark-pre-restore --keep-last 3
# Mark success only after the encrypted off-server upload and retention succeeded.
date +%s > "$SUNMARK_STATE_DIR/backup-success.tmp"
mv "$SUNMARK_STATE_DIR/backup-success.tmp" "$SUNMARK_STATE_DIR/backup-success"
echo 'Encrypted database backup uploaded'
