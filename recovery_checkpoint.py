"""Offline snapshot-checkpoint consistency checker. Never authorizes activation.

The expected checkpoint SHA must be independently sourced and authenticated
outside this code. Its presence alone NEVER establishes external custody.
"""
import hashlib
import hmac
import json
import re
import sqlite3
from contextlib import closing
from pathlib import Path

from recovery_lab import inspect_snapshot, _readonly

HEX64 = re.compile(r"[0-9a-f]{64}")
FIELDS = {"schema", "environment", "generation", "snapshot_sha256",
          "receipt_head_sha256", "clock_high_water", "parent_checkpoint_sha256"}


def _pairs_unique(items):
    obj = {}
    for key, value in items:
        if key in obj:
            raise ValueError("duplicate checkpoint key")
        obj[key] = value
    return obj


def receipt_head(db):
    """Synthetic sorted-set digest, NOT an append-only chain or trusted log."""
    rows = db.execute("""SELECT event_id,raw_sha256,event_type,event_created,handled
        FROM race_webhook_receipts ORDER BY event_id""").fetchall()
    encoded = json.dumps(rows, separators=(",", ":"), ensure_ascii=True).encode("ascii")
    return hashlib.sha256(encoded).hexdigest()


def inspect_against_checkpoint(snapshot_path, checkpoint_raw,
                               expected_checkpoint_sha256, environment):
    """Local structural equality only; unconditional external-provenance ABSTAIN."""
    if (not isinstance(checkpoint_raw, bytes) or
            not 1 <= len(checkpoint_raw) <= 65536 or
            not isinstance(expected_checkpoint_sha256, str) or
            HEX64.fullmatch(expected_checkpoint_sha256) is None or
            not isinstance(environment, str) or not environment):
        raise ValueError("invalid checkpoint inputs")
    if not hmac.compare_digest(hashlib.sha256(checkpoint_raw).hexdigest(),
                               expected_checkpoint_sha256):
        raise ValueError("checkpoint digest mismatch")
    data = json.loads(checkpoint_raw.decode("utf-8"),
                      object_pairs_hook=_pairs_unique)
    if not isinstance(data, dict) or set(data) != FIELDS:
        raise ValueError("checkpoint schema mismatch")
    if (type(data["schema"]) is not int or data["schema"] != 1 or
            data["environment"] != environment or
            type(data["generation"]) is not int or data["generation"] < 1 or
            type(data["clock_high_water"]) is not int or
            data["clock_high_water"] < 0 or
            any(not isinstance(data[key], str) or HEX64.fullmatch(data[key]) is None
                for key in ("snapshot_sha256", "receipt_head_sha256",
                            "parent_checkpoint_sha256"))):
        raise ValueError("invalid checkpoint fields")
    path = Path(snapshot_path).resolve(strict=True)
    if any(Path(str(path)+suffix).exists() for suffix in ("-wal", "-shm", "-journal")):
        raise ValueError("snapshot has SQLite sidecar")
    with path.open("rb") as stream:
        snapshot_hash = hashlib.file_digest(stream, "sha256").hexdigest()
    if not hmac.compare_digest(snapshot_hash, data["snapshot_sha256"]):
        raise ValueError("snapshot digest mismatch")
    inspect_snapshot(path)
    with closing(_readonly(path)) as db:
        state = db.execute("""SELECT high_water,failed
            FROM clock_continuity WHERE singleton=1""").fetchone()
        if state is None or state != (data["clock_high_water"], 0):
            raise ValueError("clock evidence mismatch or failed")
        if not hmac.compare_digest(receipt_head(db), data["receipt_head_sha256"]):
            raise ValueError("webhook journal mismatch")
    return {"snapshot_sha256": snapshot_hash,
            "checkpoint_sha256": expected_checkpoint_sha256,
            "generation": data["generation"],
            "status": "ABSTAIN_EXTERNAL_PROVENANCE",
            "activation": "BLOCKED_UNVERIFIED_FRESHNESS"}
