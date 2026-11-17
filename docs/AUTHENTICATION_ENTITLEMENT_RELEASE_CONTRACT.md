# Mars Race authentication and entitlement integration contract

Status: **DESIGN ONLY — PROMOTION_BLOCKED; productionAuthority NONE**.

## Trust boundaries

1. The game client is untrusted. Never accept its supplied player ID, Stripe customer ID, subscription ID, email, checkout success redirect, or paid flag as authority.
2. A separately operated authentication service MUST verify a provider-issued token server-side (signature, issuer, audience, expiry, nonce/session where applicable, revocation policy). The trusted identity is the issuer-qualified immutable subject, not an email address.
3. A server-controlled database MUST map that verified subject to one Stripe customer and subscription using an authorized, authenticated account-linking flow. Never create this binding solely from a checkout redirect, email match, or arbitrary client parameter.
4. The webhook service MUST validate Stripe signatures and mode, exact expected price/payment-link, paid invoice period, and revocation events. A checkout event alone cannot grant access.
5. The game backend MUST fetch the binding itself and call the internal entitlement predicate. Any missing identity, binding, invoice, durable storage, or provider verification must deny access. Do not expose an unauthenticated entitlement lookup.
6. A signed-in player with no verified binding is **not entitled**. The binding service must prevent one customer's subscription from being attached to multiple unrelated subjects without an independently reviewed migration/recovery protocol.
7. Authenticate every protected game action server-side. A client-side paywall or cached flag is not an authorization boundary. Session expiration and cancellation must invalidate cached authorization.
8. Use a separately managed durable database with least-privilege credentials, migrations, retention controls, encrypted backups, restart/replay tests and independently checked restore. The local SQLite path alone does not establish production durability.

## Required external evidence before any production integration

- Provider and issuer selected, documented, and independently reviewed; keys and revocation handled.
- Real authenticated test-player login and adversarial token tests (wrong issuer/audience, expired, forged, cross-account).
- Explicit authorized account-linking ceremony, replay and account-takeover resistance.
- Genuine Stripe-generated test-mode checkout, invoice, failure and cancellation deliveries, with independently recorded event IDs, not locally fabricated event dictionaries.
- Staging persistent database survives restarts and restores while preserving revocations and deduplicated event receipts.
- Actual deployed game/API route access tests: unauthenticated, wrong user, paid, unpaid, canceled, expired and offline.
- Independent reviewer approval, enforced branch rules, exact-head CI and controlled release authorization.

## Prohibited shortcuts

No live payments or customer events without authorization. No public entitlement API based on an email or subscription ID. No merging draft safety PRs as a substitute for review. No assumption that Vercel's static frontend hosts the Flask webhook or persistent SQLite database. No claim of certification from self-authored synthetic tests.
