"""Offline research action gate; no HTTP route, payment or game mutation."""
import sqlite3
import time
import player_sessions as sessions
import subscription_store as ledger

LIMIT = 10
WINDOW = 60


def record_demo_action(token, request_id):
    """Atomically authorize and record one synthetic action; return boolean only.

    All authorization and receipt writes share the ledger's write lock.
    No external side effects are permitted inside this research gate.
    """
    if not isinstance(token, str) or not sessions._TOKEN.fullmatch(token):
        return False
    if not sessions._valid(request_id):
        return False
    try:
        with ledger.database(write=True) as db:
            now = int(time.time())
            sessions._schema(db)
            db.execute("""CREATE TABLE IF NOT EXISTS demo_action_receipts (
                player_id TEXT NOT NULL, request_id TEXT NOT NULL,
                accepted_at INTEGER NOT NULL,
                PRIMARY KEY(player_id,request_id))""")
            db.execute("""CREATE INDEX IF NOT EXISTS demo_action_time
                ON demo_action_receipts(player_id,accepted_at)""")
            row = db.execute("""SELECT b.player_id FROM player_sessions s
                JOIN player_bindings b ON b.player_id=s.player_id
                JOIN race_subscriptions r ON r.subscription_id=b.subscription_id
                    AND r.customer_id=b.customer_id
                JOIN race_paid_periods p ON p.subscription_id=r.subscription_id
                    AND p.customer_id=r.customer_id
                LEFT JOIN race_blocks k ON k.subscription_id=r.subscription_id
                WHERE s.digest=? AND s.revoked=0 AND s.issued<=? AND s.expires>?
                    AND r.checkout_event<=? AND p.paid_event<=?
                    AND p.period_start<=? AND p.period_end>?
                    AND (k.subscription_id IS NULL OR
                         (k.terminal=0 AND p.paid_event>k.blocked_event))
                LIMIT 1""", (sessions._digest(token),now,now,now,now,now,now)).fetchone()
            if not row:
                return False
            player = row[0]
            count, latest = db.execute("""SELECT COUNT(*),MAX(accepted_at)
                FROM demo_action_receipts WHERE player_id=? AND accepted_at>?""",
                (player,now-WINDOW)).fetchone()
            if count >= LIMIT or (latest is not None and latest > now):
                return False
            db.execute("INSERT INTO demo_action_receipts VALUES (?,?,?)",
                       (player,request_id,now))
            return True
    except (OSError, sqlite3.Error):
        return False
