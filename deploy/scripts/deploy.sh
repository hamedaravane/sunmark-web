#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
load_config
[[ $# == 2 ]] || fail 'Usage: deploy.sh WEB_IMAGE@sha256:... API_IMAGE@sha256:...'
validate_image "$1" sunmark-web; validate_image "$2" sunmark-server
expected_api=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["image"])' "$DEPLOY_DIR/backend-image.json")
[[ "$2" == "$expected_api" ]] || fail 'Backend image differs from this reviewed release bundle'
lock_operation
for secret in postgres-password app-password database-url; do
    [[ -s "$SUNMARK_CONFIG_DIR/secrets/$secret" ]] || fail "Missing secret file: $secret"
done
[[ -f "$SUNMARK_CONFIG_DIR/postgres-init.sh" ]] || fail 'Run bootstrap to install the stable PostgreSQL initialization file'
load_backup
restic snapshots --quiet >/dev/null || fail 'Initialize and verify the off-server Restic repository first'
candidate=$(mktemp "$SUNMARK_STATE_DIR/releases/release.XXXXXX.env")
RELEASE_DIR=$(dirname "$DEPLOY_DIR")
[[ "$RELEASE_DIR" =~ ^[a-zA-Z0-9_./-]+$ ]] || fail 'Release path contains unsupported characters'
printf 'WEB_IMAGE=%s\nAPI_IMAGE=%s\nRELEASE_DIR=%s\n' "$1" "$2" "$RELEASE_DIR" > "$candidate"
export SUNMARK_RELEASE_FILE=$candidate
load_release
compose config --quiet
compose pull postgres api web caddy
revision=$(basename "$RELEASE_DIR")
if [[ "$revision" =~ ^[a-f0-9]{40}$ ]]; then
    image_revision=$(docker_local image inspect "$WEB_IMAGE" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
    [[ "$image_revision" == "$revision" ]] || fail 'Frontend image revision does not match the deployment bundle'
fi
date +%s > "$SUNMARK_STATE_DIR/maintenance"
trap 'rm -f "$SUNMARK_STATE_DIR/maintenance"' EXIT
# Back up an existing healthy database before Compose can recreate it, including
# when its pinned PostgreSQL image changes. Stop writers before the backup.
postgres_id=$(compose ps -a -q postgres)
if [[ -n "$postgres_id" ]]; then
    health=$(docker_local inspect "$postgres_id" --format '{{.State.Health.Status}}')
    [[ "$health" == healthy ]] || fail 'Existing PostgreSQL is unhealthy; recover it before deploying'
    compose stop web api
    "$DEPLOY_DIR/scripts/backup.sh"
fi
compose up -d --wait --wait-timeout 120 postgres
if [[ -z "$postgres_id" ]]; then
    "$DEPLOY_DIR/scripts/backup.sh"
fi
# Never automatically downgrade the database after a failed migration.
compose --profile tools run --rm -T migrate
compose up -d --wait --wait-timeout 180 api web caddy
python3 - "$DOMAIN" <<'PY'
import json, sys, time, urllib.request
for attempt in range(18):
    try:
        with urllib.request.urlopen('https://' + sys.argv[1] + '/api/v1/health/ready', timeout=10) as r:
            if json.load(r).get('status') == 'ok':
                break
    except Exception:
        pass
    time.sleep(5)
else:
    raise SystemExit('Public HTTPS readiness failed; release record was not advanced')
PY
# Preserve a schema-current off-server backup before recording a successful release.
"$DEPLOY_DIR/scripts/backup.sh"
if [[ -f "$SUNMARK_STATE_DIR/current.env" ]]; then
    cp "$SUNMARK_STATE_DIR/current.env" "$SUNMARK_STATE_DIR/previous.env"
fi
cp "$candidate" "$SUNMARK_STATE_DIR/current.env.tmp"
mv "$SUNMARK_STATE_DIR/current.env.tmp" "$SUNMARK_STATE_DIR/current.env"
ln -sfn "$RELEASE_DIR" "$SUNMARK_INSTALL_DIR/current.next"
mv -Tf "$SUNMARK_INSTALL_DIR/current.next" "$SUNMARK_INSTALL_DIR/current"
if command -v systemctl >/dev/null && [[ -d /run/systemd/system ]]; then
    install -m 0644 "$DEPLOY_DIR"/systemd/* /etc/systemd/system/
    systemctl daemon-reload
    systemctl enable sunmark.service sunmark-backup.timer sunmark-monitor.timer sunmark-restore-check.timer sunmark-prune.timer
    systemctl start sunmark.service
    systemctl start sunmark-backup.timer sunmark-monitor.timer sunmark-restore-check.timer sunmark-prune.timer
fi
echo "Release recorded: $candidate"
echo 'Verify a real match and run restore.sh latest before opening promotion'
