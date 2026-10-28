#!/usr/bin/env bash
# Requires Docker Compose >=2.24.4, Node 24, Restic, and a prebuilt production web image.
# Runs only a unique disposable project and removes its volumes on exit.
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")/.." && pwd -P)
temporary=$(mktemp -d)
restic_real=$(command -v restic)
export SUNMARK_CONFIG_DIR=$temporary/config SUNMARK_STATE_DIR=$temporary/state
export COMPOSE_PROJECT_NAME="sunmark-deploy-test-$$"
export WEB_IMAGE=${SUNMARK_TEST_WEB_IMAGE:-sunmark-web:deployment-test}
export API_IMAGE
API_IMAGE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["image"])' "$root/backend-image.json")
export DOMAIN=localhost ACME_EMAIL=admin@example.test
mkdir -p "$temporary/config/secrets" "$temporary/state" "$temporary/bin"
install -m 0755 "$root/postgres-init.sh" "$temporary/config/postgres-init.sh"
for name in postgres-password app-password restic-password; do openssl rand -hex 32 > "$temporary/config/secrets/$name"; done
printf 'postgresql://sunmark:%s@postgres:5432/sunmark' "$(cat "$temporary/config/secrets/app-password")" > "$temporary/config/secrets/database-url"
chmod 0444 "$temporary/config/secrets/"*
cat > "$temporary/override.yml" <<'YAML'
services:
  api:
    environment:
      CORS_ORIGINS: https://localhost:18443
  caddy:
    ports: !override
      - '127.0.0.1:18080:80'
      - '127.0.0.1:18443:443'
YAML
compose_test() { docker compose -p "$COMPOSE_PROJECT_NAME" -f "$root/compose.production.yml" -f "$temporary/override.yml" "$@"; }
cleanup() {
    status=$?
    # This project contains generated fixture credentials only, never operator secrets.
    if (( status != 0 )); then compose_test logs --tail 35 postgres caddy >&2 || true; fi
    compose_test down --volumes --remove-orphans >/dev/null
    rm -rf -- "$temporary"
}
trap cleanup EXIT
compose_test up -d --wait --wait-timeout 120 postgres
compose_test exec -T postgres psql -U sunmark_admin -d postgres -Atc "select rolname from pg_roles where rolname='sunmark'"
compose_test --profile tools run --rm -T migrate
compose_test up -d --wait --wait-timeout 180 api web caddy
caddy=$(compose_test ps -q caddy)
docker cp "$caddy:/data/caddy/pki/authorities/local/root.crt" "$temporary/root.crt"
export NODE_EXTRA_CA_CERTS=$temporary/root.crt
export SUNMARK_TEST_COOKIE_FILE=$temporary/session-cookie
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const base='https://localhost:18443';
for (const [path,status] of [['/',200],['/api/v1/health/ready',200],['/docs-json',404]]) {
    const response=await fetch(base+path); assert.equal(response.status,status,path);
}
const response=await fetch(base+'/api/v1/online/session',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Deployment smoke'})});
assert.equal(response.status,201);
assert.match(response.headers.get('set-cookie'),/HttpOnly/);
assert.match(response.headers.get('set-cookie'),/Secure/);
writeFileSync(process.env.SUNMARK_TEST_COOKIE_FILE,response.headers.get('set-cookie').split(';')[0],{mode:0o600});
assert.equal(response.headers.get('cache-control'),'no-store');
const art=await fetch(base+'/assets/backgrounds/main-menu.webp');
assert.equal(art.status,200); assert.match(art.headers.get('cache-control'),/max-age=3600/);
assert.match(art.headers.get('strict-transport-security'),/max-age=/);
console.log('Trusted HTTPS, production frontend, API readiness, secure session cookies and cache policy passed');
JS
role=$(compose_test exec -T postgres psql -U sunmark_admin -d sunmark -Atc "select rolsuper or rolcreatedb or rolcreaterole from pg_roles where rolname='sunmark'")
[[ "$role" == f ]]
if [[ ${SUNMARK_TEST_LIVE_CLIENTS:-0} == 1 ]]; then
    (cd "$root/.." && SUNMARK_TEST_API_URL=https://localhost:18443 SUNMARK_TEST_WEB_ORIGIN=https://localhost:18443 npm run test:api -- --testNamePattern 'four real|HTTP and socket|a host')
fi
compose_test restart postgres api web caddy
compose_test up -d --wait --wait-timeout 180
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const r=await fetch('https://localhost:18443/api/v1/online/session',{headers:{Cookie:readFileSync(process.env.SUNMARK_TEST_COOKIE_FILE,'utf8')}});
assert.equal(r.status,200); assert.equal((await r.json()).name,'Deployment smoke');
console.log('All-service restart preserved guest identity and database readiness');
JS
# Host scripts use the real production config; only the Restic transport is replaced
# by a local encrypted fixture repository. No real S3 account is contacted.
cat > "$temporary/config/deploy.env" <<EOF
DOMAIN=play.example.test
ACME_EMAIL=admin@example.test
SUNMARK_CONFIG_DIR=$SUNMARK_CONFIG_DIR
SUNMARK_STATE_DIR=$SUNMARK_STATE_DIR
SUNMARK_INSTALL_DIR=$temporary/install
COMPOSE_PROJECT_NAME=$COMPOSE_PROJECT_NAME
RESTIC_REPOSITORY=s3:https://backup.example.test/sunmark
RESTIC_PASSWORD_FILE=$temporary/config/secrets/restic-password
EOF
: > "$temporary/config/backup.env"
printf 'WEB_IMAGE=ghcr.io/hamedaravane/sunmark-web@sha256:%064d\nAPI_IMAGE=%s\n' 0 "$API_IMAGE" > "$temporary/state/current.env"
chmod 0600 "$temporary/config/"*.env "$temporary/state/current.env"
RESTIC_REPOSITORY="$temporary/restic" RESTIC_PASSWORD_FILE="$temporary/config/secrets/restic-password" "$restic_real" init --quiet
cat > "$temporary/bin/restic" <<EOF
#!/bin/sh
export RESTIC_REPOSITORY='$temporary/restic'
export RESTIC_PASSWORD_FILE='$temporary/config/secrets/restic-password'
exec '$restic_real' "\$@"
EOF
chmod +x "$temporary/bin/restic"
export PATH="$temporary/bin:$PATH"
"$root/scripts/backup.sh"
# A newer safety snapshot must not displace the latest application backup.
printf safety > "$temporary/state/backups/pre-restore.dump"
restic backup --quiet --tag sunmark-pre-restore "$temporary/state/backups/pre-restore.dump"
"$root/scripts/restore.sh" latest
test -s "$temporary/state/backup-success"
test -s "$temporary/state/restore-check-success"
# Failed off-server upload must not advance freshness or report backup success.
printf '1\n' > "$temporary/state/backup-success"
before=1
printf '#!/bin/sh\nexit 1\n' > "$temporary/bin/restic"
if "$root/scripts/backup.sh"; then echo 'Backup incorrectly passed after upload failure' >&2; exit 1; fi
[[ $(cat "$temporary/state/backup-success") == "$before" ]]
echo 'PostgreSQL least privilege, encrypted backup/restore drill and failed-upload handling passed'
