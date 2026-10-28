#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "$0")/common.sh"
load_config; load_backup
lock_operation
restic prune --max-unused 10%
restic check
