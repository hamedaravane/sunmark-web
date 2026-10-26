#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
compose=(docker compose)
if [ -n "${SUNMARK_COMPOSE_OVERRIDE:-}" ]; then compose+=(-f compose.yml -f "$SUNMARK_COMPOSE_OVERRIDE"); fi
docker info >/dev/null
"${compose[@]}" config --quiet
# The default API is an image dependency. Source builds are explicit and opt-in.
if [ "${SUNMARK_BUILD_BACKEND:-0}" = "1" ]; then "${compose[@]}" build api; fi
"${compose[@]}" build web
"${compose[@]}" up -d --wait postgres
"${compose[@]}" --profile tools run --rm -T migrate
"${compose[@]}" up -d --wait api web
echo "Open http://localhost:${WEB_PORT:-8081} on your desktop."
echo 'Use separate browser profiles for additional players. Stop with: docker compose stop'
