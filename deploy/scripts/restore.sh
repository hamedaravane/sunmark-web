#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
load_config; load_release; load_backup
snapshot=${1:-latest}
[[ "$snapshot" == latest || "$snapshot" =~ ^[a-f0-9]{8,64}$ ]] || fail 'Expected latest or a Restic snapshot ID'
replace=false
if [[ ${2:-} != '' ]]; then
    [[ ${2:-} == --replace-production && ${3:-} == RESTORE_SUNMARK ]] || fail 'Replacement requires: --replace-production RESTORE_SUNMARK'
    replace=true
fi
lock_operation
temporary=$(mktemp "$SUNMARK_STATE_DIR/backups/restore.XXXXXX")
database="sunmark_restore_check_$(date +%s)_$$"
cleanup() {
    compose exec -T postgres dropdb -U sunmark_admin --if-exists "$database" >/dev/null || true
    rm -f -- "$temporary"
}
trap cleanup EXIT
if [[ "$snapshot" == latest ]]; then
    snapshot=$(restic snapshots --tag sunmark --json | python3 -c 'import json,sys; rows=json.load(sys.stdin); assert rows, "No application backups"; print(max(rows,key=lambda r:r["time"])["id"])')
fi
restic dump "$snapshot" "$SUNMARK_STATE_DIR/backups/sunmark.dump" > "$temporary"
compose exec -T postgres createdb -U sunmark_admin -O sunmark "$database"
compose exec -T postgres pg_restore -U sunmark_admin --role=sunmark -d "$database" --single-transaction --exit-on-error --no-owner --no-acl < "$temporary"
ready=$(compose exec -T postgres psql -U sunmark_admin -d "$database" -Atc "select to_regclass('online_matches') is not null and to_regclass('guest_sessions') is not null and to_regclass('command_receipts') is not null and to_regclass('match_outbox') is not null")
[[ "$ready" == t ]] || fail 'Restored database lacks the application schema'
if ! $replace; then
    date +%s > "$SUNMARK_STATE_DIR/restore-check-success"
    echo 'Restore drill passed in an isolated database; production was not replaced'
    exit 0
fi
# Preserve the current database before any destructive replacement, off server.
compose stop web api
compose exec -T postgres pg_dump -U sunmark_admin -d sunmark -Fc --no-owner --no-acl > "$SUNMARK_STATE_DIR/backups/pre-restore.dump"
restic backup --quiet --tag sunmark-pre-restore "$SUNMARK_STATE_DIR/backups/pre-restore.dump"
compose exec -T postgres dropdb -U sunmark_admin --force sunmark
compose exec -T postgres createdb -U sunmark_admin -O sunmark sunmark
compose exec -T postgres pg_restore -U sunmark_admin --role=sunmark -d sunmark --single-transaction --exit-on-error --no-owner --no-acl < "$temporary"
compose up -d --wait --wait-timeout 180 api web caddy
echo 'Database restored; verify public readiness and player recovery before reopening traffic'
