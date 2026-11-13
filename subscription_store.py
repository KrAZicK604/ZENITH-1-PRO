"""Local fail-closed Stripe subscription evidence ledger.

This database is NOT an identity service. Only caller-verified Stripe webhook
events may record evidence. A checkout alone does not grant access.
"""
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path


def connect():
    configured = os.environ.get("DATABASE_PATH", "")
    if not configured or not os.path.isabs(configured):
        raise OSError("DATABASE_PATH must be an absolute path on persistent storage")
    db_path = Path(configured)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(db_path), timeout=10)
    db.execute("PRAGMA busy_timeout=10000")
    db.execute("""CREATE TABLE IF NOT EXISTS race_subscriptions (
        subscription_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL,
        email TEXT NOT NULL,
        checkout_event INTEGER NOT NULL
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS race_paid_periods (
        invoice_id TEXT PRIMARY KEY,
        subscription_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        period_start INTEGER NOT NULL,
        period_end INTEGER NOT NULL,
        paid_event INTEGER NOT NULL,
        CHECK (period_end > period_start)
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS race_blocks (
        subscription_id TEXT PRIMARY KEY,
        blocked_event INTEGER NOT NULL,
        terminal INTEGER NOT NULL CHECK (terminal IN (0,1))
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS race_webhook_receipts (
        event_id TEXT PRIMARY KEY,
        raw_sha256 TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_created INTEGER NOT NULL,
        handled INTEGER NOT NULL CHECK (handled IN (0,1))
    )""")
    return db


@contextmanager
def database(write=False):
    """Explicit write transaction; BEGIN IMMEDIATE serializes concurrent webhook events."""
    db = connect()
    try:
        if write:
            db.execute("BEGIN IMMEDIATE")
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def get_receipt(event_id, db):
    """Fetch a minimal receipt; no raw Stripe data or customer PII is stored."""
    return db.execute(
        "SELECT raw_sha256,event_type,event_created,handled "
        "FROM race_webhook_receipts WHERE event_id=?", (event_id,)
    ).fetchone()


def put_receipt(event_id, raw_sha256, event_type, event_created, handled, db):
    db.execute("INSERT INTO race_webhook_receipts VALUES (?,?,?,?,?)",
               (event_id, raw_sha256, event_type, event_created, int(bool(handled))))


def record_checkout(subscription_id, session_id, customer_id, email, event_created, db=None):
    """Bind checkout evidence; can share atomic webhook transaction."""
    if db is None:
        with database(write=True) as connection:
            return record_checkout(subscription_id, session_id, customer_id, email,
                                   event_created, db=connection)
    row = (subscription_id, session_id, customer_id, email, event_created)
    by_sub = db.execute("SELECT session_id,customer_id,email FROM race_subscriptions WHERE subscription_id=?",
                        (subscription_id,)).fetchone()
    by_session = db.execute("SELECT subscription_id FROM race_subscriptions WHERE session_id=?",
                            (session_id,)).fetchone()
    if by_sub or by_session:
        return by_sub == (session_id, customer_id, email) and by_session == (subscription_id,)
    db.execute("INSERT INTO race_subscriptions VALUES (?,?,?,?,?)", row)
    return True


def record_paid_invoice(invoice_id, subscription_id, customer_id, start, end, created, db=None):
    """Record paid evidence; can share atomic webhook transaction."""
    if db is None:
        with database(write=True) as connection:
            return record_paid_invoice(invoice_id, subscription_id, customer_id,
                                       start, end, created, db=connection)
    row = (invoice_id, subscription_id, customer_id, start, end, created)
    existing = db.execute(
        "SELECT invoice_id,subscription_id,customer_id,period_start,period_end,paid_event "
        "FROM race_paid_periods WHERE invoice_id=?", (invoice_id,)).fetchone()
    if existing:
        return existing == row
    db.execute("INSERT INTO race_paid_periods VALUES (?,?,?,?,?,?)", row)
    return True


def block(subscription_id, created, terminal=False, db=None):
    """Monotonic revocation in the event's transaction."""
    if db is None:
        with database(write=True) as connection:
            return block(subscription_id, created, terminal=terminal, db=connection)
    db.execute("""INSERT INTO race_blocks VALUES (?,?,?)
        ON CONFLICT(subscription_id) DO UPDATE SET
        blocked_event=MAX(blocked_event,excluded.blocked_event),
        terminal=MAX(terminal,excluded.terminal)""",
        (subscription_id, created, 1 if terminal else 0))


def is_active(subscription_id, now=None):
    """Internal-only: require matching paid period and no later adverse event.

    No public HTTP endpoint or unauthenticated email-based entitlement lookup.
    """
    now = int(time.time()) if now is None else int(now)
    with database() as db:
        row = db.execute("""SELECT 1 FROM race_subscriptions s
            JOIN race_paid_periods p ON p.subscription_id=s.subscription_id
              AND p.customer_id=s.customer_id
            LEFT JOIN race_blocks b ON b.subscription_id=s.subscription_id
            WHERE s.subscription_id=? AND p.period_start<=? AND p.period_end>?
              AND s.checkout_event<=? AND p.paid_event<=?
              AND (b.subscription_id IS NULL OR
                   (b.terminal=0 AND p.paid_event>b.blocked_event))
            LIMIT 1""", (subscription_id, now, now, now, now)).fetchone()
    return row is not None
