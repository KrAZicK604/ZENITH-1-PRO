"""Verified Stripe Checkout webhook for ZENITH race access.

Requires STRIPE_WEBHOOK_SECRET and a persistent DATABASE_PATH mounted on durable storage.
No unauthenticated email-based entitlement lookup is exposed.
"""
import os
import sqlite3
from pathlib import Path

import stripe
from flask import Flask, jsonify, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024


def _database_path():
    return Path(os.environ.get("DATABASE_PATH", "zenith_entitlements.sqlite3"))


def _connect():
    db = _database_path()
    db.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(db), timeout=10)
    connection.execute("PRAGMA busy_timeout=10000")
    connection.execute("""
        CREATE TABLE IF NOT EXISTS entitlements (
            session_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            product TEXT NOT NULL,
            amount INTEGER NOT NULL,
            currency TEXT NOT NULL
        )
    """)
    return connection


def _field(obj, name, default=None):
    return obj.get(name, default) if isinstance(obj, dict) else getattr(obj, name, default)


@app.get("/")
def health():
    return jsonify({"service": "zenith-webhook", "status": "online"})


@app.post("/webhook")
def stripe_webhook():
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    if not secret.startswith("whsec_") or "YOUR_" in secret:
        return jsonify({"error": "webhook_not_configured"}), 503

    signature = request.headers.get("Stripe-Signature", "")
    if not signature:
        return jsonify({"error": "missing_signature"}), 400
    try:
        event = stripe.Webhook.construct_event(request.get_data(), signature, secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        return jsonify({"error": "invalid_webhook"}), 400

    if _field(event, "type") != "checkout.session.completed":
        return jsonify({"received": True}), 200

    session = _field(_field(event, "data", {}), "object", {})
    # Asynchronous payment methods must wait for an independently verified paid event.
    if _field(session, "payment_status") != "paid":
        return jsonify({"received": True, "granted": False}), 200

    session_id = _field(session, "id")
    amount = _field(session, "amount_total")
    currency = _field(session, "currency")
    details = _field(session, "customer_details", {}) or {}
    email = _field(details, "email") or _field(session, "customer_email")
    expected_link = os.environ.get("RACE_PAYMENT_LINK_ID", "")
    link_id = _field(session, "payment_link")
    # Product attribution must be configured and must match the session.
    if not expected_link or not expected_link.startswith("plink_"):
        return jsonify({"error": "race_payment_link_not_configured"}), 503
    if link_id != expected_link:
        return jsonify({"received": True, "granted": False}), 200
    if (not isinstance(session_id, str) or not session_id.startswith("cs_")
            or not isinstance(email, str) or not email.strip()
            or type(amount) is not int or amount != 2900
            or str(currency).lower() != "cad"):
        return jsonify({"received": True, "granted": False}), 200

    try:
        with _connect() as db:
            db.execute(
                "INSERT OR IGNORE INTO entitlements "
                "(session_id,email,product,amount,currency) VALUES (?,?,?,?,?)",
                (session_id, email.strip().lower(), "race_29", amount, "cad"),
            )
    except (sqlite3.Error, OSError):
        app.logger.exception("Failed to persist entitlement")
        # Stripe retries non-2xx responses. Never acknowledge an unpersisted grant.
        return jsonify({"error": "storage_unavailable"}), 503
    return jsonify({"received": True, "granted": True}), 200


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", "10000")))
