#!/usr/bin/env bash
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Run bootstrap as root on the new Ubuntu server' >&2; exit 1; }
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]] || { echo 'This bootstrap supports Ubuntu 24.04 only' >&2; exit 1; }
deploy_source=$(cd -- "$(dirname -- "$0")/.." && pwd -P)
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 restic python3 openssl ca-certificates ufw unattended-upgrades
systemctl enable --now docker
install -d -m 0700 /etc/sunmark /etc/sunmark/secrets /var/lib/sunmark /var/lib/sunmark/backups /var/lib/sunmark/releases
install -d -m 0755 /opt/sunmark/releases/bootstrap
if [[ ! -e /etc/sunmark/deploy.env ]]; then install -m 0600 "$deploy_source/.env.example" /etc/sunmark/deploy.env; fi
if [[ ! -e /etc/sunmark/backup.env ]]; then install -m 0600 "$deploy_source/backup.env.example" /etc/sunmark/backup.env; fi
if [[ ! -e /etc/sunmark/monitor.env ]]; then install -m 0600 "$deploy_source/monitor.env.example" /etc/sunmark/monitor.env; fi
# Keep the database mount stable across release bundles. PostgreSQL initialization
# is a first-install operation; future changes need an explicit migration review.
if [[ ! -e /etc/sunmark/postgres-init.sh ]]; then install -m 0755 "$deploy_source/postgres-init.sh" /etc/sunmark/postgres-init.sh; fi
# Compose's file-backed secrets are bind mounts: the node user must read the mounted
# file. The containing host directory is 0700, so other host users cannot reach it.
for name in postgres-password app-password restic-password; do
    if [[ ! -e "/etc/sunmark/secrets/$name" ]]; then
        openssl rand -hex 32 > "/etc/sunmark/secrets/$name"
        chmod 0444 "/etc/sunmark/secrets/$name"
    fi
done
if [[ ! -e /etc/sunmark/secrets/database-url ]]; then
    printf 'postgresql://sunmark:%s@postgres:5432/sunmark' "$(cat /etc/sunmark/secrets/app-password)" > /etc/sunmark/secrets/database-url
    chmod 0444 /etc/sunmark/secrets/database-url
fi
if [[ ! -e /opt/sunmark/current ]]; then
    cp -a "$deploy_source" /opt/sunmark/releases/bootstrap/deploy
    chown -R root:root /opt/sunmark/releases/bootstrap
    chmod -R go-w /opt/sunmark/releases/bootstrap
    ln -s /opt/sunmark/releases/bootstrap /opt/sunmark/current
fi
install -m 0644 "$deploy_source"/systemd/* /etc/systemd/system/
systemctl daemon-reload
# Preserve existing rules and discover the active SSH ports before enabling UFW.
ssh_configuration=$(/usr/sbin/sshd -T)
ssh_ports=$(awk '$1 == "port" {print $2}' <<< "$ssh_configuration")
[[ -n "$ssh_ports" ]] || { echo 'Cannot establish the SSH port; firewall was not enabled' >&2; exit 1; }
while read -r port; do ufw allow "$port/tcp"; done <<< "$ssh_ports"
if [[ -n ${SUNMARK_SSH_PORT:-} ]]; then
    [[ "$SUNMARK_SSH_PORT" =~ ^[0-9]+$ ]] || { echo 'Invalid SUNMARK_SSH_PORT' >&2; exit 1; }
    ufw allow "$SUNMARK_SSH_PORT/tcp"
fi
ufw allow 80/tcp; ufw allow 443/tcp; ufw allow 443/udp
ufw --force enable
echo 'Bootstrap complete. No application was deployed and no credentials were printed.'
echo 'Edit the three private /etc/sunmark/*.env files, save the Restic password offline,'
echo 'initialize Restic, configure DNS/SSH/GitHub secrets, then deploy exact image digests.'
