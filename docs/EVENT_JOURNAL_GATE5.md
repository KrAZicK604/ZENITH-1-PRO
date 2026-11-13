# Gate 5 — webhook event integrity, restart and replay

**Scope:** ZENITH Mars Race, CAD $29 per month. Experimental review branch only. No production deployment, payout, Stripe billing change or customer notification is authorized.

## Core invariants

1. Verify Stripe's `Stripe-Signature` over the exact raw request body using the installed Stripe SDK. A header alone is not trusted.
2. Require a valid Stripe `evt_` identifier, correct configured Stripe mode, event type and positive `created` timestamp for monitored subscription events.
3. Inside one SQLite `BEGIN IMMEDIATE` transaction, check a signed event-ID receipt; apply the subscription ledger effect; and store the event receipt (ID, SHA-256 of raw request, type, created timestamp, handled flag). No raw payload is stored in the receipt table.
4. An identical signed retransmission gets a safe 200 duplicate acknowledgement without a second business effect. A different signed body/type/timestamp reusing the ID gets a 409 conflict and is not processed. This does not establish external sender identity when a signing secret is compromised.
5. If effect or receipt write fails, roll back together and return 503 so Stripe can retry. Domain record uniqueness and terminal-block monotonicity remain in effect.
6. No browser-side or caller-provided email is an authority to query subscription eligibility. The internal subscription-ID predicate is **not** a game-login system.

## Executed-in-CI checks

The `tests/test_webhook_journal.py` suite uses locally generated HMAC-SHA256 signed bytes through the real Stripe SDK and tests: exact-body receipts, duplicate acknowledgements, altered signed event-ID collisions, repurposed cancellation attempts, injected journal disk errors and atomic rollback, concurrent parallel same-event deliveries, concurrent invoice/checkout arrival, fresh isolated Python process reopening the SQLite DB, SQLite backup snapshot restore and integrity check, malformed IDs, and unsupported event non-mutation.

Companion suites continue covering checkout/price mapping, signature timestamps, wrong signing keys, subscription expiry, out-of-order renewal and terminal cancellation.

**Important limitations:** these are local tests, not a live Stripe-generated webhook. A freshly reopened SQLite file and successful backup restore under local tests do not prove a future cloud host has durable disks, an independent backup custodian, trusted timestamps or crash-consistent backups. The SQLite journal digest is not externally signed or independently anchored. Concurrent tests on one local SQLite file do not establish horizontal scaling on multiple machines.

## Ongoing CI after authorized merge

The Python security workflow includes a **weekly, read-only** regression schedule at Monday 11:23 UTC. GitHub scheduled workflows run on the default branch only; it does **not** run from this draft branch or automatically merge and release anything. Its normal workflow permissions are `contents: read`, and no live Stripe keys are required. A passing test does not grant production approval.

## Gate 6 — actual source-authenticated Stripe sandbox evidence (BLOCKED)

1. Select a real Stripe **test-mode/sandbox** account and configure an actual recurring CAD $29/month test Price and Payment Link. No sandbox is currently exposed by the connected Stripe account list; do not use the live account for trial charges.
2. Obtain a real sandbox webhook endpoint signing secret and configure it directly on a controlled nonproduction backend. Never paste it into chat or GitHub. Use a durable database, protected environment variables, and a separate service identity.
3. Deliver Stripe-generated `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated` and `customer.subscription.deleted` events through the real webhook pipeline. Validate the **actual** API-version-specific invoice line schema and paid-period semantics. Check retries and order changes.
4. Collect privacy-minimized receipts: event IDs, timestamps, HTTP status, digest, subscription state transition, and independent delivery evidence; no Stripe secrets, card data or unredacted customer email. Compare to independent Stripe Dashboard delivery logs.
5. Perform real host restart, concurrent workers, durable backup/restore, cancellation-at-period-end, taxes/discounts/proration, and outage/recovery drills. Explicitly verify revocation on refunds/chargebacks before considering any economic or game-reward feature.
6. Freeze and independently review the deployment policy, operating credentials, keys, access controls, incident playbook and rollback gate. No production promotion or live charging as part of this protocol.

## Gate 7+ — authenticated gameplay and long-duration operations (FUTURE)

Design a first-party authenticated game identity linked to Stripe customer ownership using a reviewed authentication provider; do not infer identity from an email or checkout redirect. Build restricted server-to-server entitlements and a secure Stripe Customer Portal integration, with audit and abuse controls. For ongoing operations, measure missed invoices, stuck retries, revoked access latency, customer cancellation propagation and false-positive/false-negative access decisions. Establish access-incident alerts, refund/dispute handlers, periodic source-controlled checks and independent configuration review before release.

Unresolved: actual external Stripe sandbox, real persistent host identity/storage, customer login, subscription portal, refunds/disputes, live operation and long-term reliability statistics. This gate is **PAPER_ONLY / PROMOTION_BLOCKED / productionAuthority NONE**.
