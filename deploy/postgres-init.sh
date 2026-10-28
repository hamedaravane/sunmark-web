#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
    --set=app_password="$(cat /run/secrets/app-password)" <<'SQL'
CREATE ROLE sunmark LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE sunmark OWNER sunmark;
REVOKE ALL ON DATABASE sunmark FROM PUBLIC;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
SQL
touch "$PGDATA/.sunmark-initialized"
