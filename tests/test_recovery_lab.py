"""Synthetic recovery evidence only. No live database access."""
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import recovery_lab as recovery
import subscription_store as ledger


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.db = self.root / "source.sqlite3"
        env = patch.dict(os.environ, {"DATABASE_PATH": str(self.db)})
        env.start()
        self.addCleanup(env.stop)
        ledger.record_checkout("sub_a", "cs_a", "cus_a", "a@example.com", 100)
        ledger.record_paid_invoice("in_a", "sub_a", "cus_a", 100, 1000, 101)

    def test_snapshot_restore_and_stale_authority(self):
        backup = self.root / "backup.sqlite3"
        receipt = recovery.snapshot(self.db, backup)
        ledger.block("sub_a", 200, terminal=True)
        restored = self.root / "restored.sqlite3"
        result = recovery.restore_to_quarantine(backup, restored, receipt["sha256"])
        self.assertEqual(result["activation"], "BLOCKED_UNVERIFIED_FRESHNESS")
        self.assertFalse(ledger.is_active("sub_a", 201))
        with patch.dict(os.environ, {"DATABASE_PATH": str(restored)}):
            self.assertTrue(ledger.is_active("sub_a", 201))  # stale backup hazard
        with self.assertRaises(FileExistsError):
            recovery.snapshot(self.db, backup)
        with self.assertRaises(ValueError):
            recovery.restore_to_quarantine(backup, self.root/"bad.sqlite3", "0"*64)

    def test_process_crash_rolls_back_uncommitted_receipt(self):
        code = ("import sqlite3,os,sys; db=sqlite3.connect(sys.argv[1]);"
                "db.execute('BEGIN IMMEDIATE');"
                "db.execute(\"INSERT INTO race_webhook_receipts VALUES ('evt_crash','hash','test',100,1)\");"
                "os._exit(17)")
        result = subprocess.run([sys.executable, "-I", "-c", code, str(self.db)], timeout=15)
        self.assertEqual(result.returncode, 17)
        with ledger.database() as db:
            self.assertIsNone(ledger.get_receipt("evt_crash", db))
        self.assertEqual(recovery.inspect_snapshot(self.db)["integrity"], "ok")

    def test_concurrent_journal_and_snapshot(self):
        def write(i):
            with ledger.database(write=True) as db:
                if ledger.get_receipt("evt_same", db) is not None:
                    return False
                ledger.put_receipt("evt_same", "a"*64, "test", 100, True, db)
                return True
        with ThreadPoolExecutor(max_workers=8) as pool:
            jobs = [pool.submit(write, i) for i in range(24)]
            snap = pool.submit(recovery.snapshot, self.db, self.root/"parallel.sqlite3")
            self.assertEqual(sum(job.result() for job in jobs), 1)
            self.assertEqual(snap.result()["integrity"], "ok")

    def test_invalid_database_rejected(self):
        bad = self.root/"invalid.sqlite3"
        bad.write_bytes(b"not a database")
        with self.assertRaises((sqlite3.Error, ValueError)):
            recovery.inspect_snapshot(bad)
