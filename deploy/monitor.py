#!/usr/bin/env python3
"""Host-side monitoring; no extra public service or Docker socket in a container."""
import json
import os
from pathlib import Path
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request


def write_json(path, value):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as stream:
        json.dump(value, stream)
        temporary = stream.name
    os.replace(temporary, path)


def service_issues(output):
    rows = (
        json.loads(output)
        if output.strip().startswith("[")
        else [json.loads(line) for line in output.splitlines() if line.strip()]
    )
    found = {row["Service"]: row for row in rows}
    return [
        f"{name}: container missing or unhealthy"
        for name in ("postgres", "api", "web", "caddy")
        if name not in found
        or found[name].get("State") != "running"
        or found[name].get("Health") != "healthy"
    ]


def freshness(path, hours, now):
    try:
        age = now - float(path.read_text().strip())
        return age >= 0 and age <= hours * 3600
    except (OSError, ValueError):
        return False


def deliver(url, message):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("Configure an HTTPS alert receiver")
    request = urllib.request.Request(
        url,
        data=json.dumps({"text": message}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        if not 200 <= response.status < 300:
            raise ValueError("Alert receiver rejected delivery")


def heartbeat(url):
    parsed = urllib.parse.urlsplit(url)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.hostname.endswith(".example")
    ):
        raise ValueError("Configure the external HTTPS heartbeat")
    with urllib.request.urlopen(url, timeout=10) as response:
        if not 200 <= response.status < 300:
            raise ValueError("External heartbeat rejected delivery")


def collect(env, state, now):
    issues, metrics = [], {}
    maintenance = state / "maintenance"
    if freshness(maintenance, 0.25, now):
        return [], {"maintenance": True}
    if maintenance.exists():
        issues.append("Deployment maintenance exceeds 15 minutes")
    for unit in ("sunmark-backup", "sunmark-restore-check", "sunmark-prune", "sunmark"):
        try:
            result = subprocess.run(
                ["systemctl", "is-failed", "--quiet", unit + ".service"],
                capture_output=True,
                timeout=5,
            )
            if result.returncode == 0:
                issues.append(unit + " service failed")
        except (OSError, subprocess.SubprocessError):
            issues.append("Unable to inspect scheduled operation status")
            break
    try:
        result = subprocess.run(
            [
                str(Path(__file__).parent / "scripts/stack.sh"),
                "ps",
                "-a",
                "--format",
                "json",
            ],
            capture_output=True,
            text=True,
            check=True,
            timeout=15,
        )
        issues.extend(service_issues(result.stdout))
    except Exception:
        issues.append("Unable to inspect production containers")
    usage = shutil.disk_usage(state)
    metrics["load_1m"] = round(os.getloadavg()[0], 2)
    if metrics["load_1m"] > (os.cpu_count() or 1) * float(
        env.get("CPU_WARN_LOAD_PER_CORE", 2)
    ):
        issues.append("Sustained host CPU/load pressure exceeds threshold")
    metrics["disk_percent"] = round(100 * usage.used / usage.total, 1)
    fs = os.statvfs(state)
    metrics["inode_percent"] = (
        round(100 * (1 - fs.f_favail / fs.f_files), 1) if fs.f_files else 0
    )
    if max(metrics["disk_percent"], metrics["inode_percent"]) >= float(
        env.get("DISK_WARN_PERCENT", 85)
    ):
        issues.append("Disk or inode usage exceeds threshold")
    try:
        memory = dict(
            (line.split(":")[0], int(line.split()[1]))
            for line in Path("/proc/meminfo").read_text().splitlines()
        )
        metrics["memory_percent"] = round(
            100 * (1 - memory["MemAvailable"] / memory["MemTotal"]), 1
        )
        if metrics["memory_percent"] >= float(env.get("MEMORY_WARN_PERCENT", 90)):
            issues.append("Host memory pressure exceeds threshold")
    except (OSError, ValueError, KeyError):
        issues.append("Unable to inspect host memory")
    if not freshness(
        state / "backup-success", float(env.get("BACKUP_MAX_AGE_HOURS", 26)), now
    ):
        issues.append("Off-server backup is missing or stale")
    if not freshness(state / "restore-check-success", 192, now):
        issues.append("Restore drill is missing or older than eight days")
    domain = env["DOMAIN"]
    try:
        start = time.monotonic()
        with urllib.request.urlopen(
            f"https://{domain}/api/v1/health/ready", timeout=10
        ) as response:
            if response.status != 200 or json.load(response).get("status") != "ok":
                raise ValueError("Not ready")
        metrics["readiness_ms"] = round((time.monotonic() - start) * 1000)
    except Exception:
        issues.append("Public HTTPS/database readiness failed")
    try:
        with socket.create_connection((domain, 443), timeout=5) as connection:
            with ssl.create_default_context().wrap_socket(
                connection, server_hostname=domain
            ) as secure:
                days = (
                    ssl.cert_time_to_seconds(secure.getpeercert()["notAfter"]) - now
                ) / 86400
                metrics["tls_days_remaining"] = round(days, 1)
                if days <= float(env.get("TLS_WARN_DAYS", 14)):
                    issues.append("TLS certificate renewal needs attention")
    except Exception:
        issues.append("TLS certificate verification failed")
    return issues, metrics


def main():
    env = os.environ
    state = Path(env.get("SUNMARK_STATE_DIR", "/var/lib/sunmark"))
    state.mkdir(parents=True, exist_ok=True, mode=0o700)
    if "--test-alert" in sys.argv:
        deliver(
            env.get("ALERT_WEBHOOK_URL", ""),
            "Sunmark monitoring test: verify this message reached the operator.",
        )
        print("Test alert delivered; verify receipt with your alert provider")
        return 0
    if "--test-heartbeat" in sys.argv:
        heartbeat(env.get("HEARTBEAT_URL", ""))
        print("Heartbeat delivered; verify the external check is enabled")
        return 0
    now = time.time()
    issues, metrics = collect(env, state, now)
    if not issues and not metrics.get("maintenance"):
        try:
            heartbeat(env.get("HEARTBEAT_URL", ""))
        except Exception:
            issues.append("External heartbeat delivery failed or is unconfigured")
    status = {"checked_at": now, "issues": issues, "metrics": metrics}
    write_json(state / "monitor-status.json", status)
    try:
        previous = json.loads((state / "alert-state.json").read_text())
    except (OSError, ValueError):
        previous = {"issues": [], "sent_at": 0}
    changed = issues != previous["issues"]
    repeat = issues and now - previous["sent_at"] >= int(
        env.get("ALERT_REPEAT_SECONDS", 3600)
    )
    if not metrics.get("maintenance") and (changed or repeat):
        text = (
            "Sunmark alert: " + "; ".join(issues)
            if issues
            else "Sunmark recovered: all configured checks passed."
        )
        try:
            deliver(env.get("ALERT_WEBHOOK_URL", ""), text)
        except Exception:
            print(
                "Alert delivery failed; check the protected receiver configuration",
                file=sys.stderr,
            )
            return 2
        write_json(state / "alert-state.json", {"issues": issues, "sent_at": now})
    print(json.dumps(status))
    return 1 if issues else 0


if __name__ == "__main__":
    sys.exit(main())
