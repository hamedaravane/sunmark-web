# Production deployment

This directory owns the single-VM production stack. It is separate from the desktop `compose.yml`. No credentials, domain, server or storage account are provisioned by committing these files.

The frontend and backend are released as images. The VM downloads them; it does not build the game. Every push to `main` automatically runs checks, exercises the production stack, publishes the frontend image and deploys that exact image digest. Deployments preserve the previous image pair and deployment bundle. Production deployment is restricted to `main` and uses the GitHub `production` environment without a manual approval gate.

## Services and resource budget

| Component     | Purpose                                                                           | Memory ceiling                       |
| ------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| Caddy         | Public HTTPS, automatic certificate renewal, compression and WebSocket forwarding | 128 MiB                              |
| Frontend      | Static PWA and same-origin API/socket proxy                                       | 128 MiB                              |
| API           | Server-authoritative matches                                                      | 512 MiB; Node heap capped at 320 MiB |
| PostgreSQL 18 | Durable sessions, games, receipts and outbox                                      | 512 MiB; 30 connections              |
| Host timers   | Monitoring, encrypted backups, restore drills and repository maintenance          | Per-service systemd limits           |

Only TCP 80/443 and UDP 443 are published by Compose. The API and database have no host ports. The database network and application network are private. API traffic to the database uses a dedicated non-superuser `sunmark` role, without database/role creation privileges; initialization and backup administration use `sunmark_admin` inside the database container. The application role owns its own database and migration schema.

Services have read-only root filesystems, bounded temporary storage, restart policies, PID/memory/CPU limits, and rotated local logs (three 10-MiB files per service). The total container memory ceilings are 1280 MiB; these are limits, not reservations or a capacity guarantee. Host/backup overhead still needs room. Measure on the actual 1-vCPU/2-GB VM before increasing traffic. Healthchecks report failures; they do not themselves restart an unhealthy process. Monitoring alerts the operator; restart policies cover process exits and VM reboots.

## First server setup

Use a fresh Ubuntu 24.04 x86-64 server, a public IPv4 address, a real domain, and an S3-compatible off-server bucket. For external notifications, also prepare an HTTPS JSON alert receiver and an external heartbeat/dead-man monitoring check. Verify the Arvan region can pull Docker Hub and GHCR images. No backend source checkout is required on the server.

1. Install an SSH public key through the provider or console. Confirm key login in a second terminal. Use `sshd-hardening.conf` to disable password login only after that check. Bootstrap deliberately does not change authentication or invent an SSH key.
2. Point an A record such as `play.yourdomain.ir` at the server. Allow HTTP/HTTPS through the provider firewall; keep SSH limited to the operator/automation access you intend. GitHub-hosted runners need an SSH route; an operator-only IP firewall requires deploying manually from that operator connection or arranging runner access.
3. Copy this `deploy/` directory to the server and run:

   ```sh
   sudo bash deploy/scripts/bootstrap.sh
   ```

   If SSH uses a socket/provisioner-managed custom port, pass it explicitly: `sudo SUNMARK_SSH_PORT=2222 bash deploy/scripts/bootstrap.sh`. Keep console access available during first setup.

   Bootstrap installs Ubuntu's signed Docker/Compose, Restic, Python, CA, UFW and security-update packages; creates protected configuration/state directories; generates database/encryption credentials without printing them; installs systemd units; and preserves existing firewall rules while opening the detected SSH ports and HTTP/HTTPS. It does not deploy the application or enable scheduled application work before the first successful deployment. Ubuntu must provide Compose >= 2.24.4.

4. Edit these root-owned, mode-0600 files using the server console or a trusted editor:

   - `/etc/sunmark/deploy.env`: replace the example hostname, ACME email and S3 Restic repository URL. Do not embed credentials in the URL.
   - `/etc/sunmark/backup.env`: bucket-scoped S3 access credentials. The example provider/region must be replaced with your actual storage settings.
   - `/etc/sunmark/monitor.env`: private HTTPS alert receiver and external heartbeat URL. Alerts POST JSON `{"text":"..."}`; this works with compatible incoming webhooks. Telegram's bot API needs a compatible relay/adapter. No notification destination is preconfigured.

   To defer external notifications, set `MONITOR_NOTIFICATIONS_ENABLED=0` in `/etc/sunmark/monitor.env`. Local health checks, status files and failure exit codes remain active, but no alerts or heartbeats are sent. Restore it to `1` and configure/test both destinations when enabling notifications. Explicit `--test-alert` and `--test-heartbeat` commands still send test requests regardless of this setting.

5. Save `/etc/sunmark/secrets/restic-password` somewhere safe outside this VM. Losing it makes encrypted backups unrecoverable. Preserve the other server credentials securely as well. The secrets directory is mode 0700. File-backed Compose secrets are read-only bind mounts, so individual mounted credential files are readable inside their intended non-root container; the private parent prevents other host users accessing them.
6. Initialize and verify the off-server repository once:

   ```sh
   sudo bash -c 'set -a; source /etc/sunmark/deploy.env; source /etc/sunmark/backup.env; set +a; restic init; restic snapshots'
   ```

   If it already exists, skip `init` and verify `snapshots`. TLS verification remains enabled. Give the storage identity only the bucket/prefix permissions Restic needs. Provider-specific S3 compatibility and access must be verified using the real account.

## GitHub setup and deployment

The `Check, publish and deploy production` workflow runs checks, deployment validation and the disposable HTTPS/backup smoke test before publishing `ghcr.io/hamedaravane/sunmark-web:<commit>`. It passes the published immutable digest directly to the reusable deployment workflow from the same commit; no copying digests, SSH commands or manual dispatch is needed for routine releases. If checks or publication fail, deployment does not run. Release runs and production deployments are serialized so updates cannot overlap. The existing backend workflow publishes backend images independently.

Deployment SSH connections send encrypted keep-alives every 15 seconds and tolerate eight missed replies, with bounded connection attempts. This supports long, quiet backup/image-pull phases while retaining strict host verification.

New GHCR packages can start private. Make the runtime packages public for anonymous server pulls, or perform a normal protected registry login on the server with read-only package credentials. Do not put registry tokens in this repository or workflow inputs.

Configure the GitHub `production` environment with a deployment branch policy allowing only the `main` branch, no required reviewers or wait timer, and add:

| Secret               | Value                                                          |
| -------------------- | -------------------------------------------------------------- |
| `DEPLOY_HOST`        | Server IPv4 or DNS hostname                                    |
| `DEPLOY_USER`        | Dedicated operator/deployment account with noninteractive sudo |
| `DEPLOY_PORT`        | SSH port, optional (defaults to 22)                            |
| `DEPLOY_SSH_KEY`     | Dedicated private deployment key                               |
| `DEPLOY_KNOWN_HOSTS` | Verified OpenSSH known-hosts entry for this server/port        |

Verify the host-key fingerprint against the Arvan console/server's `/etc/ssh/ssh_host_ed25519_key.pub`. Do not blindly trust a runtime `ssh-keyscan`. The deployment identity can install code/manage Docker as root; protect this key and restrict the production environment accordingly.

Push or merge to `main` to release automatically. Treat acceptance into `main` as approval to deploy, including schema/rules/migration compatibility review. The deployment derives the backend digest from `backend-image.json`; the pin's commit must match `contracts/backend.json`. When updating the backend, deliberately update the shared contract pin and reviewed image digest together. The server also checks the web image's revision label matches the uploaded deployment bundle. `Deploy production release` remains available as a manual recovery entry point on `main`, using a compatible frontend digest from that same commit. Manually running the release workflow on `main` also checks, publishes and deploys.

Deployment acquires a lock, validates protected settings and pulls images. For an existing database, it requires a healthy PostgreSQL container, stops writers and uploads an encrypted backup before Compose can restart or update PostgreSQL. On first install, it initializes PostgreSQL and backs up the empty database. It then applies migrations explicitly, waits for all services, checks public HTTPS/database readiness, and uploads a schema-current backup. Only then does it record the current/previous versions, switch `/opt/sunmark/current`, refresh systemd units and enable timers. Certificate issuance can take a few minutes; DNS and ports must already work.

If a step fails, it stops before advancing the release record. Writers may remain stopped, or candidate containers may already be running after a failed post-start check. Inspect the named service and deployment output; use the documented recovery path rather than assuming an automatic rollback. A fresh database with failed initialization stays unhealthy through a marker check; never delete a data volume containing real matches to fix that.

The workflow uploads bundles beneath the operator's protected home directory, then installs them under `/opt/sunmark/releases/<frontend-commit>`. No Git checkout or application build is needed on the VM. Old bundles are retained for rollback; remove obsolete bundles/images deliberately while preserving current and previous versions. Never use `docker compose down -v` on production.

## Monitoring and operation

After the first successful release:

```sh
sudo /opt/sunmark/current/deploy/scripts/restore.sh latest
sudo /opt/sunmark/current/deploy/scripts/monitor.sh
```

When external notifications are enabled, also run:

```sh
sudo /opt/sunmark/current/deploy/scripts/monitor.sh --test-alert
sudo /opt/sunmark/current/deploy/scripts/monitor.sh --test-heartbeat
```

Verify receipt in the alert destination and enable the external dead-man check at one-minute intervals with at least five minutes of grace. The host monitor cannot send anything after total VM/network loss; the external check detects missing healthy heartbeats. Configure planned maintenance there when needed. These external accounts require operator setup. With notifications disabled, inspect the local status and journal manually.

The minute monitor checks all four service health states, verified public HTTPS/database readiness, certificate expiry, disk/inodes, memory/load, off-server backup freshness and weekly restore-drill freshness. Alerts send on change, repeat hourly and send recovery notices. Failed alert delivery is retried on the next run. A maintenance marker suppresses local checks for up to 15 minutes; stale maintenance raises an alert. Local JSON status lives at `/var/lib/sunmark/monitor-status.json`; it is not exposed publicly. Alert URLs/credentials are not included in its output.

```sh
sudo systemctl list-timers 'sunmark-*'
sudo journalctl -u sunmark-monitor -u sunmark-backup -u sunmark-restore-check --since today
sudo /opt/sunmark/current/deploy/scripts/stack.sh ps
sudo /opt/sunmark/current/deploy/scripts/stack.sh logs --tail 100 api
```

Arvan's VM monitoring is useful alongside this. Game-level completion, abuse limits, analytics and abandonment policies remain application work; this directory does not implement them. Test the actual player journey and target-server capacity before promotion.

## Backups and disaster recovery

Nightly backups run at 00:30 UTC (04:00 Tehran), with up to ten minutes of jitter. They produce a consistent custom-format `pg_dump`, verify its archive header, encrypt/upload with Restic, and retain 7 daily, 4 weekly and 3 monthly snapshots. Three pre-restore safety snapshots are retained separately. The monitor marks freshness only after upload/retention succeeds. A dump left on the VM is not reported as an off-server backup.

The weekly Sunday restore drill (02:00 UTC) downloads the latest application backup into a uniquely named temporary database, restores it under the application owner and checks the four required application tables, then removes that temporary database. Weekly pruning/integrity checks run at 03:00 UTC. Locks serialize backups/restore/prune; systemd limits resource usage. Missing/stale backups and drills alert the operator.

Actual replacement is deliberately explicit and causes downtime:

```sh
sudo /opt/sunmark/current/deploy/scripts/restore.sh SNAPSHOT_ID --replace-production RESTORE_SUNMARK
```

This first verifies the downloaded snapshot in a temporary database, then stops writers and uploads a safety backup of the current database before replacing `sunmark`. It never drops the production database until those checks pass. It restarts the stack afterward. Restoring an older snapshot loses newer accepted moves; communicate that recovery decision and test real player reconnects. Daily backups imply up to roughly a day's data loss; this is not point-in-time recovery or high availability.

For a lost VM, bootstrap a replacement, restore the protected Restic credentials/password, install the compatible release bundle, initialize the database, then use the explicit restore procedure and validate HTTPS/player recovery before changing DNS/opening traffic. Keep credentials and the exact release record outside the failed VM. Provider/server loss, actual S3 access and a real rebuild still require a deployment-time drill.

## Rollback and maintenance

For a previous application release whose schema/rules are still compatible:

```sh
sudo /opt/sunmark/current/deploy/scripts/rollback.sh --schema-compatible
```

This reuses the previous deployment bundle and exact image pair through the normal backed-up deployment path. It does not downgrade migrations or rewrite persisted rules versions. If the database is incompatible, use a reviewed forward fix or a compatible application-plus-backup restore with the acknowledged data-loss window. Never automatically restore a database on a failed deployment.

Bootstrap installs the database initialization script once at `/etc/sunmark/postgres-init.sh`, so switching release bundles does not change PostgreSQL's mount or force a database restart. It runs only for an empty data directory. Review future initialization changes separately; existing databases need explicit migrations. PostgreSQL major-version upgrades require a separate tested dump/restore or upgrade plan; do not simply change the image pin against the existing volume.

Changing password files does not rotate credentials already stored in PostgreSQL. Rotate the role and its protected connection file together in a reviewed maintenance window. Review OS/Docker/Restic security updates and pinned Caddy/PostgreSQL/image versions regularly, retain space for backup dumps, and watch disk alerts. Updating this directory is not evidence that any cloud resource, backup receiver, certificate or deployment is live.

## Local validation

```sh
python3 -m unittest discover -s deploy/tests -v
bash deploy/tests/validate.sh
docker build --target runtime -t sunmark-web:deployment-test .
SUNMARK_TEST_LIVE_CLIENTS=1 bash deploy/tests/integration.sh
```

The integration test uses a unique disposable Compose project with loopback ports 18080/18443 and a locally trusted Caddy certificate. It exercises the actual production web image, published backend, database role/migrations, HTTPS, secure cookies, private docs, cache policy, three live-client scenarios, session persistence after all services restart, real encrypted Restic backup and isolated restore, plus failed-upload freshness handling. Only its own volumes are removed. Its backup transport is a local encrypted fixture repository, not the operator's S3 account. It does not certify Arvan capacity, publicly issued certificates, browser/device behavior or alert-provider delivery.
