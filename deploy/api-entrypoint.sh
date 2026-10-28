#!/bin/sh
set -eu
DATABASE_URL=$(cat /run/secrets/database-url)
export DATABASE_URL
exec "$@"
