# ZENITH-1-PRO — Mars Race subscription security gate

**PR-only change. No live Stripe billing objects or production services were changed.** Live Stripe catalogue inspected read-only November 11, 2026; recheck before deployment.

## Verified live product mapping

| Product | CAD | Term | Price ID | Payment Link ID |
| --- | ---: | --- | --- | --- |
| Mars Race | $29 | Monthly recurring | price_1UQdzi5TQIzi9HKPizM62pvD | plink_1URxrb5TQIzi9HKP8Ou9iaId |
| Complete Course | $199 | One-time | price_1URxv05TQIzi9HKPbpxT9ij7 | plink_1URxv85TQIzi9HKPgUjI6Zxm |
| School License | $999 | One-time | price_1URxvz5TQIzi9HKPUoUFEEhH | plink_1URxwK5TQIzi9HKPQe6kWnrY |

The repository had previously swapped Race and School URLs in .env.example; this branch corrects them.

## Signed event lifecycle

Host gunicorn cloud_webhook:app on a **persistent Python web service**, not the Vercel static frontend. Configure server-side STRIPE_WEBHOOK_SECRET (correct webhook signing secret), STRIPE_EXPECT_LIVEMODE (literal true or false), RACE_PAYMENT_LINK_ID, RACE_PRICE_ID, and DATABASE_PATH (absolute, durable, backed-up path). Sandbox and live modes have different secrets and object IDs. Never embed secrets in public frontend or source.

Set your Stripe classic webhook to https://YOUR-SERVER/webhook and enable:

- checkout.session.completed: bind exact paid CAD $29 subscription-mode checkout and configured Payment Link to its subscription and customer IDs. Checkout alone never grants access.
- invoice.paid: require exact CAD $29 paid invoice, one line, quantity one, exact Race Price ID and bounded month-long service period. A correct invoice and previously-bound checkout together can satisfy the *internal* active-period predicate.
- invoice.payment_failed: conservatively block access until a **later** qualifying paid invoice.
- customer.subscription.updated: block past_due, unpaid, paused, incomplete, incomplete_expired, canceled. Mere active/trialing status cannot grant.
- customer.subscription.deleted: permanently block that subscription ID, including if delivered before checkout.
- customer.subscription.paused: block.

Scheduling cancel_at_period_end does not itself revoke an already-paid interval; the term still expires and deletion blocks it at the end. A new subscription needs a new verified checkout.

The local ledger uses unique invoice and checkout keys, monotonic adverse-event timestamps, and terminal tombstones to withstand duplicate/out-of-order deliveries. Same-second invoice and adverse event remains blocked. Public email-based entitlement lookup remains disabled; subscription_store.is_active(subscription_id) is **internal only**, not an authenticated game account or public API.

Tax, discounts, proration, trials, multi-item invoices, incomplete line pagination, and unknown pricing fields deliberately abstain instead of accidentally granting. Support for such real-world cases requires separately reviewed policy and tests.

## Verification and remaining deployment gates

Run from repo root:

    python -B -m unittest discover -s tests -p 'test_*.py' -v
    python -B -m py_compile cloud_webhook.py subscription_store.py

The local source and mocked-event tests do not verify an actual Stripe signature or a deployed service. Before live enablement: test signed Stripe sandbox deliveries and schema versions, billing retries, cancellation timing, restart/persistence, backups, Stripe Tax settings, and reconciliation. Multiple server replicas require shared transactional storage, not per-instance SQLite.

**Not complete:** customer authentication, secure customer portal, game unlock integration, and migration of historical single-payment entitlement rows. No automatic grant to historical customers; do not trust redirects or caller-supplied email. This branch has no production release or monetary authority.

PAPER_ONLY; PROMOTION_BLOCKED; productionAuthority NONE. No payments, payouts or refunds initiated.
