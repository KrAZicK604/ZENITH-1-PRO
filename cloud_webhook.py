"""Signed Stripe webhook for ZENITH $29 CAD/month Mars Race subscriptions.

Only paid billing intervals can grant. No public identity/entitlement lookup.
Use a persistent DATABASE_PATH and server-side Stripe signing secret.
"""
import os
import sqlite3

import stripe
from flask import Flask, jsonify, request

import subscription_store as store

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024


def _field(obj, name, default=None):
    return obj.get(name, default) if isinstance(obj, dict) else getattr(obj, name, default)


def _identifier(value, prefix):
    """Reject empty, example and placeholder IDs before processing signed billing data."""
    if not (isinstance(value, str) and value.startswith(prefix) and len(value) > len(prefix)):
        return False
    upper = value.upper()
    return not any(token in upper for token in ("YOUR_", "REPLACE", "PLACEHOLDER", "EXAMPLE"))


def _webhook_secret(value):
    """A copied template secret is not configuration."""
    return (isinstance(value, str) and value.startswith("whsec_")
            and len(value) > len("whsec_")
            and not any(token in value.upper() for token in
                        ("YOUR_", "REPLACE", "PLACEHOLDER", "EXAMPLE")))


def _event_created(event):
    val = _field(event, "created")
    return val if type(val) is int and val > 0 else None


def _configured():
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    link = os.getenv("RACE_PAYMENT_LINK_ID", "")
    price = os.getenv("RACE_PRICE_ID", "")
    expected_mode = os.getenv("STRIPE_EXPECT_LIVEMODE", "")
    if (not _webhook_secret(secret) or
        not _identifier(link, "plink_") or not _identifier(price, "price_") or
        expected_mode not in ("true", "false")):
        return None
    return secret, link, price, expected_mode == "true"


def _subscription_from_invoice(invoice):
    parent = _field(invoice, "parent", {}) or {}
    details = _field(parent, "subscription_details", {}) or {}
    sub = _field(details, "subscription") or _field(invoice, "subscription")
    return _field(sub, "id") if not isinstance(sub, str) else sub


def _invoice_price_id(line):
    price = _field(line, "price")
    if price:
        return _field(price, "id") if not isinstance(price, str) else price
    pricing = _field(line, "pricing", {}) or {}
    details = _field(pricing, "price_details", {}) or {}
    v = _field(details, "price")
    return _field(v, "id") if not isinstance(v, str) else v


def _paid_period(invoice, required_price):
    """Conservative exact $29 CAD monthly period; no silent tax/proration support."""
    if (_field(invoice, "status") != "paid" or _field(invoice, "paid") is not True or
        _field(invoice, "currency") != "cad" or
        type(_field(invoice, "amount_paid")) is not int or _field(invoice, "amount_paid") != 2900 or
        type(_field(invoice, "total")) is not int or _field(invoice, "total") != 2900 or
        _field(invoice, "billing_reason") not in ("subscription_create", "subscription_cycle")):
        return None
    lines = _field(invoice, "lines", {}) or {}
    if _field(lines, "has_more", True) is not False:
        return None
    items = _field(lines, "data", [])
    if not isinstance(items, (list, tuple)) or len(items) != 1:
        return None
    line = items[0]
    if (_invoice_price_id(line) != required_price or _field(line, "quantity") != 1 or
        _field(line, "proration", False) is True):
        return None
    period = _field(line, "period", {}) or {}
    start, end = _field(period, "start"), _field(period, "end")
    if type(start) is not int or type(end) is not int or start <= 0 or not start < end:
        return None
    if end - start > 35 * 24 * 3600:
        return None
    return start, end


def _handle_checkout(session, created, link):
    if _field(session, "payment_link") != link:
        return False
    details = _field(session, "customer_details", {}) or {}
    email = _field(details, "email") or _field(session, "customer_email")
    sid = _field(session, "id")
    sub = _field(session, "subscription")
    customer = _field(session, "customer")
    if (_field(session, "mode") != "subscription" or
        _field(session, "payment_status") != "paid" or
        type(_field(session, "amount_total")) is not int or _field(session, "amount_total") != 2900 or
        _field(session, "currency") != "cad" or
        not _identifier(sid, "cs_") or not _identifier(sub, "sub_") or
        not _identifier(customer, "cus_") or
        not isinstance(email, str) or not email.strip()):
        return False
    return store.record_checkout(sub, sid, customer, email.strip().casefold(), created)


def _handle_invoice_paid(invoice, created, price):
    sub = _subscription_from_invoice(invoice)
    iid = _field(invoice, "id")
    cus = _field(invoice, "customer")
    period = _paid_period(invoice, price)
    if not (_identifier(sub, "sub_") and _identifier(iid, "in_") and
            _identifier(cus, "cus_") and period is not None):
        return False
    return store.record_paid_invoice(iid, sub, cus, *period, created)


@app.get("/")
def health():
    return jsonify({"service": "zenith-subscription-webhook", "status": "online"})


@app.post("/webhook")
def stripe_webhook():
    config = _configured()
    if config is None:
        return jsonify({"error": "webhook_not_configured"}), 503
    secret, link, price, live = config
    signature = request.headers.get("Stripe-Signature", "")
    if not signature:
        return jsonify({"error": "missing_signature"}), 400
    try:
        event = stripe.Webhook.construct_event(request.get_data(), signature, secret)
    except (ValueError, stripe.SignatureVerificationError):
        return jsonify({"error": "invalid_signature"}), 400

    if _field(event, "livemode") is not live:
        return jsonify({"error": "wrong_stripe_mode"}), 400
    typ = _field(event, "type")
    monitored = {
        "checkout.session.completed", "invoice.paid", "invoice.payment_failed",
        "customer.subscription.updated", "customer.subscription.deleted",
        "customer.subscription.paused",
    }
    if typ not in monitored:
        return jsonify({"received": True, "handled": False}), 200
    created = _event_created(event)
    obj = _field(_field(event, "data", {}), "object", {})
    if created is None or not obj:
        return jsonify({"error": "malformed_event"}), 400
    try:
        if typ == "checkout.session.completed":
            accepted = _handle_checkout(obj, created, link)
        elif typ == "invoice.paid":
            accepted = _handle_invoice_paid(obj, created, price)
        else:
            if typ == "invoice.payment_failed":
                sub = _subscription_from_invoice(obj)
            else:
                sub = _field(obj, "id")
            if not _identifier(sub, "sub_"):
                return jsonify({"error": "unrecognized_subscription"}), 400
            if typ == "customer.subscription.updated":
                status = _field(obj, "status")
                if status in ("past_due", "unpaid", "paused", "incomplete", "incomplete_expired", "canceled"):
                    store.block(sub, created, terminal=status == "canceled")
                    accepted = True
                elif status in ("active", "trialing"):
                    accepted = False  # never independently grants access
                else:
                    return jsonify({"error": "unknown_subscription_status"}), 400
            else:
                store.block(sub, created, terminal=typ == "customer.subscription.deleted")
                accepted = True
    except (OSError, sqlite3.Error):
        app.logger.exception("Subscription evidence storage unavailable")
        return jsonify({"error": "storage_unavailable"}), 503
    return jsonify({"received": True, "handled": accepted}), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "10000")))
