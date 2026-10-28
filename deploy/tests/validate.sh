#!/usr/bin/env bash
set -euo pipefail
root=$(cd -- "$(dirname -- "$0")/.." && pwd -P)
temporary=$(mktemp -d)
trap 'rm -rf -- "$temporary"' EXIT
for script in "$root"/scripts/*.sh; do test -x "$script"; bash -n "$script"; done
sh -n "$root/api-entrypoint.sh"; sh -n "$root/postgres-init.sh"
test -r "$root/Caddyfile"
python3 - "$root" <<'PY'
import os, pathlib, sys
root=pathlib.Path(sys.argv[1])
for name in ['Caddyfile', 'api-entrypoint.sh', 'postgres-init.sh']:
    assert (root/name).stat().st_mode & 4, f'{name} must be readable by its container user'
PY
mkdir "$temporary/secrets"
install -m 0755 "$root/postgres-init.sh" "$temporary/postgres-init.sh"
for name in postgres-password app-password database-url; do printf fixture > "$temporary/secrets/$name"; done
export DOMAIN=play.example.test ACME_EMAIL=admin@example.test SUNMARK_CONFIG_DIR=$temporary
export WEB_IMAGE=ghcr.io/hamedaravane/sunmark-web@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export API_IMAGE
API_IMAGE=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["image"])' "$root/backend-image.json")
docker compose -f "$root/compose.production.yml" config --format json > "$temporary/compose.json"
python3 - "$temporary/compose.json" <<'PY'
import json, sys
c = json.load(open(sys.argv[1])); services = c['services']
assert set(services) == {'api', 'postgres', 'web', 'caddy'}
for name, service in services.items():
    assert '@sha256:' in service['image'], name
    assert service['read_only'] and int(service['mem_limit']) > 0 and int(service['pids_limit']) > 0, name
    assert service['restart'] == 'unless-stopped', name
    assert all(mount.startswith('/') for mount in service.get('tmpfs', [])), name
    if name != 'caddy': assert not service.get('ports'), name
assert c['networks']['database']['internal']
assert c['networks']['application']['internal']
assert services['api']['environment']['SESSION_COOKIE_SECURE'] == 'true'
assert services['api']['environment']['DOCS_ENABLED'] == 'false'
assert 'DATABASE_URL' not in services['api']['environment']
assert services['api']['environment']['CORS_ORIGINS'] == 'https://play.example.test'
assert any(v.get('source', '').endswith('/postgres-init.sh') and '/deploy/' not in v['source'] for v in services['postgres']['volumes'] if v['type'] == 'bind')
assert all('PASSWORD' not in key or key.endswith('_FILE') for key in services['postgres']['environment'])
print('Production network, secrets, image, resource and restart configuration verified')
PY
caddy=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["services"]["caddy"]["image"])' "$temporary/compose.json")
docker run --rm --network none -e DOMAIN -e ACME_EMAIL -v "$root/Caddyfile:/etc/caddy/Caddyfile:ro" "$caddy" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
