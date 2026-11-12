# Gate 6.1 — Browser-played Mars Race, sandbox tax-inclusive preflight

**Scope:** Nonproduction Qoiin Stripe sandbox `acct_1U2sFM5ibR43v2XM`, 2026-11-12; observed account state and preparation. This is a successor to Gate 5's historical documentation and supersedes its earlier statement that no sandbox account was available. **Do not merge or deploy without review.**

## Authoritative sandbox catalog (read back with Stripe GET)

- Product: `prod_VcHyGbFH4lmgNJ` — ZENITH Mars Race — Browser Subscription (Sandbox).
- Product tax code: `txcd_10201004` — *Video Games - streamed - subscription - with conditional rights*. Current delivery is browser gameplay; a downloadable edition is future scope and needs renewed tax classification before launch.
- Recurring price: `price_1Ub3Oo5ibR43v2XMkYaCtRiI` — `cad`, **2900 minor units**, `month`, `interval_count=1`, `licensed`, `tax_behavior=inclusive`, `livemode=false`.
- Inclusive means applicable tax is part of **CAD $29.00**, not automatically charged on top. This does **not** prove tax is computed, collected, remitted, or legally compliant.
- The separately governed LIVE Qoiin account and its original IDs are unchanged; the sandbox price is not a production link.

## Blocker observed at Stripe, not merely theoretical

Read-only sandbox Stripe Tax status was `pending` with `status_details.pending.missing_fields=["head_office"]`; sandbox Tax Registration list had **0** records. A request to create a Payment Link with `line_items=[{price: verified sandbox price, quantity:1}]` and `automatic_tax.enabled=true` failed at Stripe:

> You must have a valid head office address to enable automatic tax calculation in test mode.

A first pilot request also failed because `customer_creation` is incompatible with a recurring-price Payment Link; that option was removed before the tax-status rejection. **Neither failed request created a Payment Link.** Do not silently retry with `automatic_tax.enabled=false`, apply arbitrary fixed rates, or invent a business address. Tax setup was expressly deferred by the project owner. Stripe Tax does not collect applicable tax where no tax registration is configured.

## Safe completed engineering preparation

- `.env.sandbox.example` pins the exact verified sandbox Price ID; payment-link ID, webhook signing secret, and durable DB path remain **empty**, ensuring the webhook's `_configured()` returns unavailable. It is not an executable deployment manifest.
- `sandbox_gate6_preflight.py` is an offline, **read-only** configuration-shape inspector. It never talks to Stripe, checks `STRIPE_EXPECT_LIVEMODE=false`, and refuses a wrong price or missing link/secret/absolute path. Its strongest result is `LOCAL_CONFIG_ONLY_NOT_EXTERNAL_VERIFIED`, **never** `READY_FOR_PRODUCTION`. An absolute path does not verify filesystem persistence.
- `tests/test_sandbox_tax_inclusive.py` uses synthetically constructed tax-bearing checkout/invoice objects with locally generated HMAC-SHA256 signatures and the real Stripe Python SDK verifier. Valid gross `2900` with synthetic tax included can grant a period only after matching signed checkout plus paid invoice; gross `3300`, live-mode events, wrong prices, and missing links must not grant. The synthetic `400` tax minor-units fixture is **not** a Canadian tax rate, legal tax opinion, or actual Stripe Tax output.
- No customer, invoice, transaction, subscription, secret, active Payment Link, webhook endpoint, production service, or payout has been created.

## Next future gates (not executed)

1. When ready, enter a **real, accurate head-office address** into the Qoiin sandbox's Stripe Tax settings. Add *only* tax registrations reflecting jurisdictions where the business has actually registered. Re-read Tax Settings status; do not treat a configured price as proof of tax collection.
2. Create an **automatic-tax-enabled, sandbox-only** monthly Payment Link tied to the exact sandbox Price ID. Verify its line items, price, `livemode=false`, currency and tax settings. Do not publish to customers; preserve existing live links unchanged.
3. Set up a protected, isolated nonproduction Python webhook host and **independently demonstrated persistent** database; use real private sandbox signing secrets, not source files. Register a test webhook endpoint **only after its actual hostname and security controls exist**. No guessed URLs.
4. Generate real sandbox checkout, invoice, renewal, failure and cancellation events; compare independent Stripe delivery logs, received event IDs, receipt SHA-256, SQL state, restart/backup results and tax-inclusive gross payment. The current local signed tests do not satisfy that requirement.
5. Independently review identity, cancellation, refund/dispute handling, tax calculations, and contradictory/out-of-order evidence before production deployment.

**Status:** `PAPER_ONLY`, `ABSTAIN_EXTERNAL_PROVENANCE`, `PROMOTION_BLOCKED`, `productionAuthority NONE`. Source history and live Stripe billing unchanged.
