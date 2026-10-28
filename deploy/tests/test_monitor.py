import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

DEPLOY = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("monitor", DEPLOY / "monitor.py")
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class MonitorTests(unittest.TestCase):
    def test_healthy_services_and_missing_container(self):
        rows = [
            {"Service": name, "State": "running", "Health": "healthy"}
            for name in ["api", "web", "postgres", "caddy"]
        ]
        self.assertEqual(monitor.service_issues(json.dumps(rows)), [])
        rows.pop()
        self.assertEqual(
            monitor.service_issues("\n".join(map(json.dumps, rows))),
            ["caddy: container missing or unhealthy"],
        )

    def test_running_but_unhealthy_is_a_failure(self):
        rows = [
            {"Service": name, "State": "running", "Health": "unhealthy"}
            for name in ["api", "web", "postgres", "caddy"]
        ]
        self.assertEqual(len(monitor.service_issues(json.dumps(rows))), 4)

    def test_freshness_rejects_missing_stale_and_future_success_markers(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "success"
            self.assertFalse(monitor.freshness(path, 1, 10000))
            for value, expected in [
                ("9990", True),
                ("1", False),
                ("11000", False),
                ("invalid", False),
            ]:
                path.write_text(value)
                self.assertEqual(monitor.freshness(path, 1, 10000), expected)

    def test_atomic_json_status(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "status.json"
            monitor.write_json(path, {"issues": ["api failed"]})
            monitor.write_json(path, {"issues": []})
            self.assertEqual(json.loads(path.read_text()), {"issues": []})
            self.assertEqual(len(list(Path(directory).iterdir())), 1)

    def test_webhook_rejects_cleartext_without_a_network_request(self):
        with patch.object(monitor.urllib.request, "urlopen") as request:
            with self.assertRaises(ValueError):
                monitor.deliver("http://alerts.example.test", "test")
            request.assert_not_called()

    def test_failure_retry_recovery_and_deduplication(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(
            os.environ,
            {
                "SUNMARK_STATE_DIR": directory,
                "ALERT_WEBHOOK_URL": "https://alerts.example.test",
            },
        ), patch.object(monitor, "collect") as collect, patch.object(
            monitor, "deliver"
        ) as deliver, patch.object(
            monitor.time, "time", return_value=10000
        ), patch.object(
            monitor, "heartbeat"
        ):
            collect.return_value = (["API unhealthy"], {})
            deliver.side_effect = OSError("fixture failure")
            self.assertEqual(monitor.main(), 2)
            self.assertFalse((Path(directory) / "alert-state.json").exists())
            deliver.side_effect = None
            self.assertEqual(monitor.main(), 1)
            self.assertEqual(monitor.main(), 1)
            self.assertEqual(deliver.call_count, 2)
            collect.return_value = ([], {})
            self.assertEqual(monitor.main(), 0)
            self.assertIn("recovered", deliver.call_args.args[1])

    def test_maintenance_suppresses_delivery(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(
            os.environ, {"SUNMARK_STATE_DIR": directory}
        ), patch.object(
            monitor, "collect", return_value=([], {"maintenance": True})
        ), patch.object(
            monitor, "deliver"
        ) as deliver:
            self.assertEqual(monitor.main(), 0)
            deliver.assert_not_called()

    def test_heartbeat_failure_is_an_alert(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(
            os.environ, {"SUNMARK_STATE_DIR": directory}
        ), patch.object(monitor, "collect", return_value=([], {})), patch.object(
            monitor, "heartbeat", side_effect=ValueError("fixture")
        ), patch.object(
            monitor, "deliver"
        ) as deliver:
            self.assertEqual(monitor.main(), 1)
            self.assertIn("heartbeat", deliver.call_args.args[1])


class ConfigurationTests(unittest.TestCase):
    def test_nested_backup_reuses_operation_lock_but_another_operation_cannot_enter(
        self,
    ):
        with tempfile.TemporaryDirectory() as directory:
            script = """source "$1"; SUNMARK_STATE_DIR="$2"; lock_operation
bash -c 'source "$1"; SUNMARK_STATE_DIR="$2"; lock_operation' nested "$1" "$2"
if flock -n "$2/operation.lock" -c true; then exit 1; fi
"""
            result = subprocess.run(
                [
                    "bash",
                    "-c",
                    script,
                    "test",
                    str(DEPLOY / "scripts/common.sh"),
                    directory,
                ],
                capture_output=True,
                timeout=5,
            )
            self.assertEqual(result.returncode, 0, result.stderr.decode())

    def test_backend_pin_matches_frontend_contract(self):
        pin = json.loads((DEPLOY / "backend-image.json").read_text())
        contract = json.loads((DEPLOY.parent / "contracts/backend.json").read_text())
        self.assertEqual(pin["commit"], contract["commit"])
        self.assertRegex(
            pin["image"], r"^ghcr.io/hamedaravane/sunmark-server@sha256:[a-f0-9]{64}$"
        )

    def test_mutable_images_are_rejected(self):
        common = DEPLOY / "scripts/common.sh"
        for value in [
            "ghcr.io/hamedaravane/sunmark-web:latest",
            "other.example/web@sha256:" + "a" * 64,
            "ghcr.io/hamedaravane/sunmark-web@sha256:short",
        ]:
            result = subprocess.run(
                [
                    "bash",
                    "-c",
                    'source "$1"; validate_image "$2" sunmark-web',
                    "test",
                    str(common),
                    value,
                ],
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)

    def test_private_configuration_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.env"
            path.write_text("EXAMPLE=value\n")
            path.chmod(0o644)
            command = [
                "bash",
                "-c",
                'source "$1"; load_private_env "$2"',
                "test",
                str(DEPLOY / "scripts/common.sh"),
                str(path),
            ]
            self.assertNotEqual(
                subprocess.run(command, capture_output=True).returncode, 0
            )
            path.chmod(0o600)
            self.assertEqual(subprocess.run(command, capture_output=True).returncode, 0)


if __name__ == "__main__":
    unittest.main()
