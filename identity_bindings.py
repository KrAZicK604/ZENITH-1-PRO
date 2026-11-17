"""Internal-only immutable identity bindings; not a signup or authentication API.

Only a trusted server-side account-linking ceremony may call bind_once.
Do not pass client-supplied identity/customer/subscription identifiers.
"""
import hmac
import re

import subscription_store as ledger

_SUBJECT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:@/-]{2,127}$")
_CUSTOMER = re.compile(r"^cus_[A-Za-z0-9_]{3,128}$")
_SUBSCRIPTION = re.compile(r"^sub_[A-Za-z0-9_]{3,128}$")


def _valid(subject, customer, subscription):
    return (isinstance(subject, str) and _SUBJECT.fullmatch(subject) is not None
            and isinstance(customer, str) and _CUSTOMER.fullmatch(customer) is not None
            and isinstance(subscription, str) and _SUBSCRIPTION.fullmatch(subscription) is not None)


def _schema(db):
    db.execute("""CREATE TABLE IF NOT EXISTS race_player_bindings (
        subject TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL UNIQUE,
        subscription_id TEXT NOT NULL UNIQUE
    )""")


def bind_once(verified_subject, customer_id, subscription_id):
    """Idempotent for identical records; reject any remapping or reuse.

    Requires a separate, authenticated and authorized account-linking ceremony.
    This helper intentionally does NOT infer identity from Stripe/email.
    """
    if not _valid(verified_subject, customer_id, subscription_id):
        return False
    with ledger.database(write=True) as db:
        _schema(db)
        existing = db.execute(
            "SELECT subject,customer_id,subscription_id FROM race_player_bindings "
            "WHERE subject=? OR customer_id=? OR subscription_id=?",
            (verified_subject, customer_id, subscription_id),
        ).fetchall()
        if existing:
            return len(existing) == 1 and existing[0] == (
                verified_subject, customer_id, subscription_id)
        db.execute("INSERT INTO race_player_bindings VALUES (?,?,?)",
                   (verified_subject, customer_id, subscription_id))
        return True


def lookup(verified_subject):
    """Internal server lookup. Missing, malformed or unbound subject => None."""
    if not isinstance(verified_subject, str) or _SUBJECT.fullmatch(verified_subject) is None:
        return None
    with ledger.database() as db:
        _schema(db)
        row = db.execute(
            "SELECT subject,customer_id,subscription_id FROM race_player_bindings "
            "WHERE subject=?", (verified_subject,),
        ).fetchone()
    if row is None or not hmac.compare_digest(row[0], verified_subject):
        return None
    return {"subject": row[0], "customer_id": row[1], "subscription_id": row[2]}
