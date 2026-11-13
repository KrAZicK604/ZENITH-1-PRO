# Gate 4 — Local cryptographic webhook verification (not external attestation)

**Target:** ZENITH-1-PRO, $29 CAD/month Mars Race subscription. This gate uses no live charges, payment modifications, or production deployment.

## Assumptions frozen for this gate

- A trusted webhook event is authenticated using the installed Stripe Python SDK's `stripe.Webhook.construct_event`, *not a mocked method*.
- A local test independently constructs the Stripe-style `t=timestamp,v1=HMAC_SHA256(secret,timestamp + "." + raw_payload)` header. This proves the application's payload/signature validation path with a locally held test secret, **not actual delivery from Stripe**.
- The event must match explicit test/live mode and the configured Payment Link/Price ID; the real checkout requires CAD $29, subscription mode and payment status paid.
- Verified invoice evidence alone cannot activate access without a matching checkout subscription/customer; checkout alone cannot activate access.
- Positive access requires `checkout_event <= now`, `paid_event <= now`, `period_start <= now < period_end`, customer ID agreement, and no later block or terminal cancel.
- A paid invoice after a non-terminal block can restore access; a terminal cancel cannot.
- An absolute durable database path must be configured; this is an assumption about deployment, **not a proof of real disk durability**.

## Test plan

Run `python -B -m unittest discover -s tests -p 'test_*.py' -v` on an isolated Python 3.12 runner with repo dependencies. `tests/test_webhook_crypto.py` exercises actual Stripe SDK signature verification, wrong key, changed bytes, stale timestamp, malformed signed payload, wrong mode, school link mismatch, future evidence, payment failure/recovery, terminal cancellation and separate SQLite connections. `tests/test_subscription_store.py` checks original and revised temporal invariants.

The `tests/test_cloud_webhook_security.py` tests still mock `construct_event` on purpose; both categories must pass. All tests use locally authored data; no network or live Stripe API calls occur during tests.

## Counterexample addressed

Prior `subscription_store.is_active(sub, now)` accepted a paid event with `paid_event > now` if its invoice's *billing period* covered `now`. With a late event insert or historical query, access could be attributed to a time before verified payment evidence existed. This gate now additionally constrains event timestamps to `<= now`, preserving non-anticipatory authorization. Checkout evidence has the same requirement.

## Fail-closed configuration

`.env.example` now defaults to **test mode** and deliberately unusable `REPLACE` placeholders. The handler explicitly rejects template signing secrets and placeholder object IDs before parsing any event. A live deployment must intentionally configure its actual `whsec_`, `plink_`, `price_`, `DATABASE_PATH` and `STRIPE_EXPECT_LIVEMODE=true`. Never commit those secrets.

## Remaining unmet external gate

1. Use a *separate Stripe sandbox/test-mode* account or sandbox resources to create real sandbox Payment Link and monthly Price ID and a sandbox webhook destination.
2. Deliver Stripe-generated, signed `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, and `customer.subscription.deleted` events to a nonproduction persistent host. Check the *actual* current Stripe invoice schema, sandbox retry delays and event order.
3. Independently review identity/account ownership; build authenticated game entitlement lookup and secure customer subscription management. No unauthenticated `/check/<email>` endpoint.
4. Independently test service restart, database durability, simultaneous webhook delivery, backups, horizontal replicas and replay/clock provenance.
5. Review currency/tax/discount/proration implications; these are deliberately not supported by the exact $29 CAD ledger policy.
6. Only afterward, with explicit approval and appropriate operational checks, consider production release.

No external signed Stripe event delivery, authenticated game unlock, physically trusted clock, or end-to-end customer subscription management is established here.

Status: `PAPER_ONLY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`.
