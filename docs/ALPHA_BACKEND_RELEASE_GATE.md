# ZENITH ALPHA — Backend release gate (design only)

**Status:** PAPER_ONLY / PAID_RACES_DISABLED / MULTIPLAYER_UNVERIFIED / PRODUCTION_AUTHORITY_NONE.

This is a contract for future server-side integration, not a deployed Stripe integration. Preserve the free local demo. Do not infer payment, player identity, live presence or payouts from browser state, query strings, room labels or client scores.

## Required backend contract

1. **Identity:** authenticated server sessions, secure cookies, CSRF protection, expiry, revocation, rate limits.
2. **Catalog:** server allowlist of Stripe price IDs, amount, currency, recurring interval; verify whether $29 is a subscription or one-time payment before offering checkout.
3. **Checkout:** authenticated POST endpoint creates Stripe Checkout Session using server-controlled price and player reference; return hosted checkout URL only.
4. **Webhook:** verify Stripe signature against *raw request bytes* and endpoint secret. Reject wrong signature, timestamp, account, mode, price, amount, currency, customer or status. Redirects never prove payment.
5. **Entitlement:** transactional DB with unique Stripe event/object IDs, authenticated player binding, effective period; idempotent handling, out-of-order reconciliation, expiry/refund/dispute/cancellation revocation.
6. **Race admission:** server checks authenticated player, valid entitlement, race eligibility and policy before allowing paid entry. Browser never grants access.
7. **Presence:** server-derived authenticated heartbeat with TTL and unique-player policy; show UNAVAILABLE when not verifiable.
8. **Money:** show only reconciled financial records with currency and date; distinguish gross, fees, refunds, pending, available, and prize liabilities. No assumed daily payouts.
9. **Compliance:** paid-entry prizes blocked pending age/jurisdiction, contest/gambling, provider, official-rules and dispute review.
10. **Security:** server-side secrets, HTTPS, origin isolation, least privilege, audit logs, rollback and independent review.

## Adversarial staging tests required

- `?payment=success` and localStorage forgery: **DENY**.
- Invalid/old/wrong-account/wrong-mode webhook: **DENY**.
- Duplicate/reordered events and concurrent joins: no duplicate entitlement or award.
- Unpaid, refunded, disputed, expired or canceled entitlement: **DENY**.
- Wrong product, amount, interval, currency or player binding: **DENY**.
- Unauthorized room/race, stale session, CSRF or forged identity: **DENY**.
- Presence unavailable, stale or duplicated: display **UNAVAILABLE**, not invented counts.
- Stripe/database outage: **fail closed** for paid admission.
- Accepted entitlement must be backed by a verifiable player/payment/catalog/period audit trail.

**Release:** ABSTAIN until existing backend is inspected, terms approved, real Stripe test-mode events exercised, staging tests pass and human release authorization is obtained. This document does not authorize checkout, funds collection, merge or deployment.
