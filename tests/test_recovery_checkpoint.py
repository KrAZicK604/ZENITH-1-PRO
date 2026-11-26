"""Synthetic checkpoint checks; no independent signing keys or custody."""
import hashlib
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import recovery_checkpoint as checkpoints
import recovery_lab
import subscription_store as store
from clock_guard import retained_sample


class CheckpointGateTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.source = self.root / "source.sqlite3"
        env = patch.dict(os.environ, {"DATABASE_PATH": str(self.source)})
        env.start()
        self.addCleanup(env.stop)
        store.record_checkout("sub_a", "cs_a", "cus_a", "x@example.test", 100)
        with store.database(write=True) as db:
            store.put_receipt("evt_a", "a"*64, "checkout.session.completed", 100, True, db)
            self.assertEqual(retained_sample(db, Mock(sample=Mock(return_value=200))), 200)
            head = checkpoints.receipt_head(db)
        self.snapshot = self.root / "snapshot.sqlite3"
        receipt = recovery_lab.snapshot(self.source, self.snapshot)
        self.payload = {"schema": 1, "environment": "research-isolated",
                        "generation": 1, "snapshot_sha256": receipt["sha256"],
                        "receipt_head_sha256": head, "clock_high_water": 200,
                        "parent_checkpoint_sha256": "0"*64}

    def inspect(self, fields=None, raw=None, env="research-isolated"):
        payload = self.payload if fields is None else fields
        raw = (json.dumps(payload, sort_keys=True).encode()
               if raw is None else raw)
        return checkpoints.inspect_against_checkpoint(
            self.snapshot, raw, hashlib.sha256(raw).hexdigest(), env)

    def test_matching_snapshot_never_authorizes_activation(self):
        self.assertEqual(self.inspect()["status"], "ABSTAIN_EXTERNAL_PROVENANCE")
        self.assertEqual(self.inspect()["activation"], "BLOCKED_UNVERIFIED_FRESHNESS")

    def test_wrong_environment_or_checkpoint_head_rejected(self):
        with self.assertRaises(ValueError):
            self.inspect(env="another-environment")
        with self.assertRaises(ValueError):
            self.inspect({**self.payload, "receipt_head_sha256": "f"*64})
        with self.assertRaises(ValueError):
            self.inspect({**self.payload, "clock_high_water": 201})
        with self.assertRaises(ValueError):
            self.inspect(raw=b'{"schema":1,"schema":1}')

    def test_snapshot_tamper_and_sidecars_rejected(self):
        self.snapshot.write_bytes(self.snapshot.read_bytes()+b"tamper")
        with self.assertRaises(ValueError):
            self.inspect()
        self.snapshot.write_bytes(self.snapshot.read_bytes()[:-6])
        sidecar = Path(str(self.snapshot)+"-wal")
        sidecar.write_bytes(b"unexpected")
        with self.assertRaises(ValueError):
            self.inspect()

    def test_untrusted_checkpoint_digest_is_rejected(self):
        raw = json.dumps(self.payload).encode()
        with self.assertRaises(ValueError):
            checkpoints.inspect_against_checkpoint(
                self.snapshot, raw, "0"*64, "research-isolated")
