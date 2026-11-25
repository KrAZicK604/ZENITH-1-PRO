"""Internal research-only identity/session primitives. No HTTP routes or login provider.
Only a trusted server-side identity adapter may call bind_verified or issue.
Never pass browser-supplied identity, customer, subscription or clock values.
"""
import hashlib
import re
import secrets
import sqlite3
import time

import subscription_store as ledger

_ID = re.compile(r"[A-Za-z0-9_-]{1,128}", re.ASCII)
_TOKEN = re.compile(r"[A-Za-z0-9_-]{43}", re.ASCII)
MAX_TTL = 3600


def _valid(value, prefix=""):
    return (isinstance(value, str) and _ID.fullmatch(value) is not None
            and value.startswith(prefix) and len(value) > len(prefix))


def _schema(db):
    db.execute("""CREATE TABLE IF NOT EXISTS player_bindings (
        player_id TEXT PRIMARY KEY, customer_id TEXT NOT NULL UNIQUE,
        subscription_id TEXT NOT NULL UNIQUE)""")
    db.execute("""CREATE TABLE IF NOT EXISTS player_sessions (
        digest TEXT PRIMARY KEY, player_id TEXT NOT NULL,
        issued INTEGER NOT NULL, expires INTEGER NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)),
        CHECK(expires > issued))""")


def bind_verified(player_id, customer_id, subscription_id):
    """Trusted provisioning only; immutable binding; no email-based linking."""
    if not (_valid(player_id) and _valid(customer_id, "cus_")
            and _valid(subscription_id, "sub_")):
        return False
    try:
        with ledger.database(write=True) as db:
            _schema(db)
            evidence = db.execute(
                "SELECT 1 FROM race_subscriptions WHERE subscription_id=? AND customer_id=?",
                (subscription_id, customer_id)).fetchone()
            if not evidence:
                return False
            existing = db.execute(
                "SELECT customer_id,subscription_id FROM player_bindings WHERE player_id=?",
                (player_id,)).fetchone()
            if existing:
                return existing == (customer_id, subscription_id)
            db.execute("INSERT INTO player_bindings VALUES (?,?,?)",
                       (player_id, customer_id, subscription_id))
            return True
    except (OSError, sqlite3.Error):
        return False


def _digest(token):
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def issue(player_id, ttl=900):
    """Call only after independent authentication of player_id by trusted adapter."""
    if not _valid(player_id) or type(ttl) is not int or not 1 <= ttl <= MAX_TTL:
        return None
    now = int(time.time())
    token = secrets.token_urlsafe(32)
    try:
        with ledger.database(write=True) as db:
            _schema(db)
            if not db.execute("SELECT 1 FROM player_bindings WHERE player_id=?",
                              (player_id,)).fetchone():
                return None
            db.execute("INSERT INTO player_sessions VALUES (?,?,?,?,0)",
                       (_digest(token), player_id, now, now + ttl))
        return token
    except (OSError, sqlite3.Error):
        return None


def revoke(token):
    if not isinstance(token, str) or not _TOKEN.fullmatch(token):
        return False
    try:
        with ledger.database(write=True) as db:
            _schema(db)
            return db.execute("UPDATE player_sessions SET revoked=1 WHERE digest=?",
                              (_digest(token),)).rowcount == 1
    except (OSError, sqlite3.Error):
        return False


def eligible(token):
    """Read-only research predicate, not a deployed game authorization decision."""
    if not isinstance(token, str) or not _TOKEN.fullmatch(token):
        return False
    now = int(time.time())
    try:
        with ledger.database() as db:
            row = db.execute("""SELECT b.subscription_id,b.customer_id
                FROM player_sessions s JOIN player_bindings b ON b.player_id=s.player_id
                WHERE s.digest=? AND s.revoked=0 AND s.issued<=? AND s.expires>?""",
                (_digest(token), now, now)).fetchone()
        return bool(row and ledger.is_active_for_customer(*row, now=now))
    except (OSError, sqlite3.Error):
        return False
