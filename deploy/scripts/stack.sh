#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
load_config
load_release
# Do not print expanded config: it is operational metadata, not a diagnostics dump.
compose "$@"
