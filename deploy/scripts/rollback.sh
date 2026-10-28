#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
load_config
[[ ${1:-} == --schema-compatible ]] || fail 'Review database/rules compatibility first, then use rollback.sh --schema-compatible; this never downgrades the database'
load_private_env "$SUNMARK_STATE_DIR/previous.env"
validate_image "$WEB_IMAGE" sunmark-web; validate_image "$API_IMAGE" sunmark-server
[[ "$RELEASE_DIR" == "$SUNMARK_INSTALL_DIR"/releases/* && -f "$RELEASE_DIR/deploy/scripts/deploy.sh" ]] || fail 'Previous deployment bundle is missing'
exec bash "$RELEASE_DIR/deploy/scripts/deploy.sh" "$WEB_IMAGE" "$API_IMAGE"
