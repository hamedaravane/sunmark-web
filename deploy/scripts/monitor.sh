#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
load_config
load_private_env "$SUNMARK_CONFIG_DIR/monitor.env"
exec python3 "$DEPLOY_DIR/monitor.py" "$@"
