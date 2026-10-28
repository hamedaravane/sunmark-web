#!/usr/bin/env bash
set -euo pipefail
umask 077
DEPLOY_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)
SUNMARK_CONFIG_DIR=${SUNMARK_CONFIG_DIR:-/etc/sunmark}

fail() { echo "sunmark: $*" >&2; exit 1; }
load_private_env() {
    local file=$1 owner mode
    [[ -f "$file" && ! -L "$file" ]] || fail "Missing regular configuration file: $file"
    owner=$(stat -c %u "$file"); mode=$(stat -c %a "$file")
    [[ "$owner" == 0 || "$owner" == "$EUID" ]] || fail "Untrusted file owner: $file"
    (( (8#$mode & 077) == 0 )) || fail "Configuration must have mode 0600: $file"
    set -a
    # Trusted, private operator configuration, never a network-supplied file.
    source "$file"
    set +a
}
load_config() {
    load_private_env "$SUNMARK_CONFIG_DIR/deploy.env"
    SUNMARK_STATE_DIR=${SUNMARK_STATE_DIR:-/var/lib/sunmark}
    SUNMARK_INSTALL_DIR=${SUNMARK_INSTALL_DIR:-/opt/sunmark}
    export SUNMARK_CONFIG_DIR SUNMARK_STATE_DIR
    [[ ${DOMAIN:-} =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && "$DOMAIN" == *.* ]] || fail 'DOMAIN must be a hostname without scheme, path or port'
    [[ "$DOMAIN" != *.example && "$DOMAIN" != *.invalid ]] || fail 'Replace the example domain'
    [[ ${ACME_EMAIL:-} == *@* ]] || fail 'ACME_EMAIL is required'
    for path in "$SUNMARK_STATE_DIR" "$SUNMARK_INSTALL_DIR" "$SUNMARK_CONFIG_DIR"; do
        [[ "$path" == /* && "$path" != / && "$path" != *$'\n'* ]] || fail 'Configuration paths must be absolute'
    done
    mkdir -p "$SUNMARK_STATE_DIR/releases" "$SUNMARK_STATE_DIR/backups"
}
validate_image() {
    local value=$1 repository=$2
    [[ "$value" =~ ^ghcr\.io/hamedaravane/$repository@sha256:[a-f0-9]{64}$ ]] || fail "Expected immutable ghcr.io/hamedaravane/$repository@sha256 digest"
}
load_release() {
    SUNMARK_RELEASE_FILE=${SUNMARK_RELEASE_FILE:-$SUNMARK_STATE_DIR/current.env}
    load_private_env "$SUNMARK_RELEASE_FILE"
    validate_image "${WEB_IMAGE:-}" sunmark-web
    validate_image "${API_IMAGE:-}" sunmark-server
}
lock_operation() {
    # A child backup reuses the deployer's inherited open-file-description lock.
    # Standalone timers open their own descriptor and serialize with deployments.
    if [[ -e /proc/$$/fd/9 && $(readlink /proc/$$/fd/9) == "$SUNMARK_STATE_DIR/operation.lock" ]]; then
        flock -n 9 || fail 'Inherited operation lock is unavailable'
    else
        exec 9>"$SUNMARK_STATE_DIR/operation.lock"
        flock -w 300 9 || fail 'Another deployment/backup/restore is running'
    fi
}
docker_local() {
    env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
        docker --host=unix:///var/run/docker.sock "$@"
}
compose() {
    docker_local compose --project-name "${COMPOSE_PROJECT_NAME:-sunmark-production}" \
        --env-file "$SUNMARK_CONFIG_DIR/deploy.env" --env-file "$SUNMARK_RELEASE_FILE" \
        -f "$DEPLOY_DIR/compose.production.yml" "$@"
}
load_backup() {
    load_private_env "$SUNMARK_CONFIG_DIR/backup.env"
    [[ ${RESTIC_REPOSITORY:-} == s3:https://* ]] || fail 'Use an off-server HTTPS S3-compatible Restic repository'
    [[ -s ${RESTIC_PASSWORD_FILE:-} ]] || fail 'Restic encryption password file is missing'
    export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE
    export GOMAXPROCS=1
}
