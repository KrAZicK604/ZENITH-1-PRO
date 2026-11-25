import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock
from clock_guard import retained_sample


class RetainedClockTests(unittest.TestCase):
    def test_reopen_and_latch(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root)/"clock.sqlite3"
            for value, expected in [(100,100),(101,101),(99,None),(200,None)]:
                db = sqlite3.connect(path)
                try:
                    db.execute("BEGIN IMMEDIATE")
                    self.assertEqual(retained_sample(db, Mock(sample=Mock(return_value=value))), expected)
                    db.commit()
                finally:
                    db.close()

    def test_requires_transaction(self):
        db = sqlite3.connect(":memory:")
        try:
            with self.assertRaises(ValueError):
                retained_sample(db)
        finally:
            db.close()
