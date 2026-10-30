"""Exercise deployment failure gates without SSH, containers, or real credentials."""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

DEPLOY = Path(__file__).resolve().parents[1]
API = json.loads((DEPLOY / "backend-image.json").read_text())["image"]
WEB = "ghcr.io/hamedaravane/sunmark-web@sha256:" + "a" * 64


class DeploymentFailureTests(unittest.TestCase):
    def run_fixture(self, failure, api=API):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            config = root / "config"
            state = root / "state"
            tools = root / "bin"
            for path in [config / "secrets", state, tools, root / "install"]:
                path.mkdir(parents=True, exist_ok=True)
            for name in [
                "postgres-password",
                "app-password",
                "database-url",
                "restic-password",
            ]:
                (config / "secrets" / name).write_text("fixture-only")
            (config / "deploy.env").write_text(
                f"DOMAIN=play.example.test\nACME_EMAIL=admin@example.test\nSUNMARK_STATE_DIR={state}\nSUNMARK_INSTALL_DIR={root}/install\nRESTIC_REPOSITORY=s3:https://storage.example.test/test\nRESTIC_PASSWORD_FILE={config}/secrets/restic-password\n"
            )
            (config / "backup.env").write_text("")
            (config / "postgres-init.sh").write_text("#!/bin/sh\n")
            for path in config.glob("*.env"):
                path.chmod(0o600)
            current = state / "current.env"
            current.write_text("previous-release-fixture\n")
            current.chmod(0o600)
            log = root / "commands"
            for name in ["docker", "restic"]:
                tool = tools / name
                tool.write_text(
                    """#!/bin/bash
printf '%s %s\n' "$(basename "$0")" "$*" >> "$COMMAND_LOG"
if [[ "$FAIL_AT" == pull && "$*" == *"pull postgres api web caddy"* ]]; then exit 43; fi
if [[ "$*" == *"run --rm -T migrate"* ]]; then exit 42; fi
if [[ "$FAIL_AT" == backup && "$(basename "$0") $*" == "restic backup"* ]]; then exit 44; fi
if [[ "$FAIL_AT" == retention && "$(basename "$0") $*" == "restic forget"* ]]; then exit 45; fi
if [[ "$FAIL_AT" == storage && "$(basename "$0") $*" == "restic snapshots"* ]]; then exit 46; fi
if [[ "$FAIL_AT" == interrupt && "$*" == *"stop web api"* ]]; then kill -TERM "$PPID"; fi
if [[ "$*" == *"ps -a -q postgres"* && "$FAIL_AT" != fresh ]]; then printf fixture-postgres; fi
if [[ "$*" == *"inspect fixture-postgres"* ]]; then
    if [[ "$FAIL_AT" == unhealthy ]]; then printf unhealthy; else printf healthy; fi
fi
if [[ "$*" == *"pg_dump"* ]]; then printf fixture-archive; fi
exit 0
"""
                )
                tool.chmod(0o755)
            result = subprocess.run(
                ["bash", str(DEPLOY / "scripts/deploy.sh"), WEB, api],
                env={
                    **os.environ,
                    "SUNMARK_CONFIG_DIR": str(config),
                    "PATH": str(tools) + ":" + os.environ["PATH"],
                    "FAIL_AT": failure,
                    "COMMAND_LOG": str(log),
                },
                capture_output=True,
                text=True,
                timeout=15,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(current.read_text(), "previous-release-fixture\n")
            self.assertFalse((state / "previous.env").exists())
            self.assertFalse((state / "maintenance").exists())
            return log.read_text() if log.exists() else ""

    def test_pull_failure_never_stops_writers(self):
        log = self.run_fixture("pull")
        self.assertNotIn("stop web api", log)
        self.assertNotIn("pg_dump", log)

    def test_storage_failure_never_stops_writers(self):
        log = self.run_fixture("storage")
        self.assertLess(log.index("restic unlock"), log.index("restic snapshots"))
        self.assertNotIn("--remove-all", log)
        self.assertNotIn("stop web api", log)
        self.assertNotIn("pg_dump", log)

    def test_migration_failure_preserves_release_and_does_not_restart_writers(self):
        log = self.run_fixture("migrate")
        self.assertLess(log.index("stop web api"), log.index("pg_dump"))
        self.assertLess(log.index("restic backup"), log.index("120 postgres"))
        self.assertLess(log.index("restic backup"), log.index("run --rm -T migrate"))
        self.assertNotIn("180 api web caddy", log)
        self.assertNotIn("start --wait", log)

    def test_unhealthy_database_is_not_recreated_or_stopped(self):
        log = self.run_fixture("unhealthy")
        self.assertNotIn("stop web api", log)
        self.assertNotIn("120 postgres", log)

    def test_failed_backup_prevents_database_recreation(self):
        log = self.run_fixture("backup")
        self.assertIn("stop web api", log)
        self.assertNotIn("120 postgres", log)
        self.assertNotIn("run --rm -T migrate", log)
        self.assertLess(
            log.index("restic backup"),
            log.index("start --wait --wait-timeout 120 api web"),
        )

    def test_retention_failure_restarts_existing_writers(self):
        log = self.run_fixture("retention")
        self.assertIn("start --wait --wait-timeout 120 api web", log)
        self.assertNotIn("120 postgres", log)
        self.assertNotIn("run --rm -T migrate", log)

    def test_interrupted_stop_restarts_existing_writers(self):
        log = self.run_fixture("interrupt")
        self.assertIn("start --wait --wait-timeout 120 api web", log)
        self.assertNotIn("120 postgres", log)
        self.assertNotIn("run --rm -T migrate", log)

    def test_first_install_initializes_database_before_backup(self):
        log = self.run_fixture("fresh")
        self.assertNotIn("stop web api", log)
        self.assertLess(log.index("120 postgres"), log.index("pg_dump"))
        self.assertLess(log.index("restic backup"), log.index("run --rm -T migrate"))

    def test_unreviewed_backend_is_rejected_before_container_operations(self):
        log = self.run_fixture(
            "none", "ghcr.io/hamedaravane/sunmark-server@sha256:" + "b" * 64
        )
        self.assertEqual(log, "")

    def test_storage_timeout_terminates_an_unresponsive_command(self):
        with tempfile.TemporaryDirectory() as directory:
            restic = Path(directory) / "restic"
            restic.write_text("#!/bin/sh\nexec sleep 30\n")
            restic.chmod(0o755)
            result = subprocess.run(
                [
                    "bash",
                    "-c",
                    'source "$1"; restic_bounded 0.1s snapshots',
                    "fixture",
                    str(DEPLOY / "scripts/common.sh"),
                ],
                env={**os.environ, "PATH": directory + ":" + os.environ["PATH"]},
                capture_output=True,
                text=True,
                timeout=3,
            )
            self.assertEqual(result.returncode, 124)


if __name__ == "__main__":
    unittest.main()
