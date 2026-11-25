"""Offline recovery lab. Never activates a restored database or changes DATABASE_PATH."""
import hashlib
import os
from pathlib import Path
import sqlite3
import time
from contextlib import closing
from datetime import datetime, timezone

REQUIRED = {"race_subscriptions", "race_paid_periods", "race_blocks", "race_webhook_receipts"}


def _readonly(path):
    return sqlite3.connect(Path(path).resolve(strict=True).as_uri()+"?mode=ro", uri=True)


def inspect_snapshot(path):
    with closing(_readonly(path)) as db:
        integrity = db.execute("PRAGMA integrity_check").fetchall()
        tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if integrity != [("ok",)] or not REQUIRED <= tables:
            raise ValueError("invalid ledger snapshot")
        if db.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("foreign key violation")
    return {"integrity": "ok", "activation": "BLOCKED_UNVERIFIED_FRESHNESS"}


def snapshot(source, destination):
    """Consistent online SQLite backup into a new quarantine file; no overwrite."""
    source = Path(source).resolve(strict=True)
    destination = Path(destination).absolute()
    started = time.monotonic_ns()
    fd = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    os.close(fd)
    try:
        with closing(_readonly(source)) as src, closing(sqlite3.connect(destination)) as dst:
            src.backup(dst, pages=128, sleep=0.01)
        result = inspect_snapshot(destination)
        with destination.open("rb") as stream:
            result["sha256"] = hashlib.file_digest(stream, "sha256").hexdigest()
            os.fsync(stream.fileno())
        result.update(utc=datetime.now(timezone.utc).isoformat(),
                      elapsed_ns=time.monotonic_ns()-started,
                      clock="UTC_HOST_UNATTESTED")
        return result
    except BaseException:
        destination.unlink(missing_ok=True)
        raise


def restore_to_quarantine(source, destination, expected_sha256):
    """Verify retained digest, then copy through SQLite backup; never activate."""
    with Path(source).open("rb") as stream:
        actual = hashlib.file_digest(stream, "sha256").hexdigest()
    if actual != expected_sha256:
        raise ValueError("snapshot digest mismatch")
    return snapshot(source, destination)
