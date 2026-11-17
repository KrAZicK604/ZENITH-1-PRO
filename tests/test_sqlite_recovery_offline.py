"""Offline SQLite restart/backup/recovery tests; no deployed database or Stripe calls."""
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import subscription_store as store

START = 1800000000
END = START + 30 * 86400


class SQLiteRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "persistent" / "ledger.sqlite3"
        env = patch.dict(os.environ, {"DATABASE_PATH": str(self.path)})
        env.start()
        self.addCleanup(env.stop)

    def populate(self):
        self.assertTrue(store.record_checkout("sub_recovery", "cs_recovery",
                                              "cus_recovery", "n@example.invalid", START))
        self.assertTrue(store.record_paid_invoice("in_recovery", "sub_recovery",
                                                   "cus_recovery", START, END, START + 10))

    def test_reopen_persists_evidence_without_regrant(self):
        self.populate()
        self.assertTrue(store.is_active("sub_recovery", START + 20))
        with store.database() as db:
            self.assertEqual(db.execute("PRAGMA integrity_check").fetchone(), ("ok",))
        self.assertTrue(store.is_active("sub_recovery", START + 20))
        self.assertFalse(store.is_active("sub_recovery", END))

    def test_backup_and_restore_preserves_revocation(self):
        self.populate()
        store.block("sub_recovery", START + 30, terminal=True)
        self.assertFalse(store.is_active("sub_recovery", START + 40))
        backup_path = Path(self.tmp.name) / "backup.sqlite3"
        with store.database() as source, sqlite3.connect(str(backup_path)) as target:
            source.backup(target)
            self.assertEqual(target.execute("PRAGMA integrity_check").fetchone(), ("ok",))
        restored_path = Path(self.tmp.name) / "restored.sqlite3"
        restored_path.write_bytes(backup_path.read_bytes())
        with patch.dict(os.environ, {"DATABASE_PATH": str(restored_path)}):
            self.assertFalse(store.is_active("sub_recovery", START + 40))
            with store.database() as db:
                self.assertEqual(db.execute("SELECT COUNT(*) FROM race_webhook_receipts").fetchone()[0], 0)
            self.assertFalse(store.is_active("sub_recovery", END))

    def test_transaction_failure_rolls_back_evidence(self):
        with self.assertRaises(RuntimeError):
            with store.database(write=True) as db:
                self.assertTrue(store.record_checkout("sub_recovery", "cs_recovery",
                                                       "cus_recovery", "n@example.invalid",
                                                       START, db=db))
                raise RuntimeError("synthetic crash before commit")
        self.assertFalse(store.is_active("sub_recovery", START + 20))
        with store.database() as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM race_subscriptions").fetchone()[0], 0)

    def test_corrupted_database_fails_closed(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_bytes(b"not a SQLite database")
        with self.assertRaises(sqlite3.DatabaseError):
            store.is_active("sub_recovery", START + 20)

    def test_receipt_survives_reopen_and_detects_duplicate(self):
        with store.database(write=True) as db:
            store.put_receipt("evt_offline", "a" * 64, "invoice.paid", START + 10, True, db)
        with store.database() as db:
            self.assertEqual(store.get_receipt("evt_offline", db),
                             ("a" * 64, "invoice.paid", START + 10, 1))
        with self.assertRaises(sqlite3.IntegrityError):
            with store.database(write=True) as db:
                store.put_receipt("evt_offline", "b" * 64, "invoice.paid", START + 10, True, db)


if __name__ == "__main__":
    unittest.main()
