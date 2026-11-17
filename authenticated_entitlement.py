"""Internal-only entitlement boundary; no public route and no identity provider.

The caller MUST authenticate a player using an independently configured provider
and resolve a server-side, trusted binding to the Stripe customer/subscription.
Do not use email, query parameters, or checkout redirect data as identity.
"""
import hmac
import re

import subscription_store as ledger

_SUBJECT = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:@-]{2,127}$")
_STRIPE = re.compile(r"^(?:cus|sub)_[A-Za-z0-9_]{3,128}$")


def entitled(verified_subject, trusted_binding, now=None):
    """Return False unless an authenticated subject matches a trusted binding.

    trusted_binding is a server-fetched dict with keys subject, customer_id,
    subscription_id; it MUST NOT originate from a client request. Storage errors
    propagate to the caller, which must deny access (never default to True).
    """
    if not isinstance(verified_subject, str) or not _SUBJECT.fullmatch(verified_subject):
        return False
    if not isinstance(trusted_binding, dict):
        return False
    subject = trusted_binding.get("subject")
    customer = trusted_binding.get("customer_id")
    subscription = trusted_binding.get("subscription_id")
    if not isinstance(subject, str) or not _SUBJECT.fullmatch(subject):
        return False
    if not hmac.compare_digest(verified_subject, subject):
        return False
    if not isinstance(customer, str) or not _STRIPE.fullmatch(customer) or not customer.startswith("cus_"):
        return False
    if not isinstance(subscription, str) or not _STRIPE.fullmatch(subscription) or not subscription.startswith("sub_"):
        return False
    with ledger.database() as db:
        row = db.execute(
            "SELECT customer_id FROM race_subscriptions WHERE subscription_id=?",
            (subscription,),
        ).fetchone()
    if row is None or not hmac.compare_digest(row[0], customer):
        return False
    return ledger.is_active(subscription, now=now)
