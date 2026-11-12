# Gate 7 — Qoiin sandbox readiness and payment-reversal falsification

Research date: 2026-11-12 UTC calendar (host timestamp not independently attested). This branch modifies no Stripe objects and no live subscriptions. Current nonproduction verdict: **BLOCKED FOR REAL RACE WEBHOOK DELIVERY**. Production authority: **NONE**.

## Source-scoped sandbox evidence

Read-only connected Stripe API inspection of the Qoiin sandbox (`acct_1U2sFM5ibR43v2XM`, `livemode=false`) returned:

| Object | Observation |
| --- | --- |
| Prices | 3 active one-time USD token-pack prices (49, 195 and 680 dollars); **0** CAD $29/month Mars Race prices |
| Product catalog | 3 token packs, no Mars Race |
| Payment Links | 0; `has_more=false` |
| Classic webhook endpoints | 0; `has_more=false` |
| V2 event destinations | 0 |
| Subscriptions | 0; `has_more=false` |
| Checkout Sessions | 0; `has_more=false` |
| Classic Stripe sandbox events | 33; 15 account.updated, 17 capability.updated, 1 person.created; no billing events; `has_more=false` |
| Event API version seen | `2026-07-29.dahlia` for these administrative events, **not** proof of invoice schema |

The locally compiled **public metadata-only** snapshot in `evidence/sandbox_preflight_2026-11-12.json` contains no Stripe signing secrets, card data, Stripe API keys or private customer values. It is not an independently signed Stripe receipt or a fresh live query every CI run. Snapshot fields were taken from connected read-only API results. Do not treat source-controlled snapshot hashes as external proof.

## Independent safety preflight (not a provisioning tool)

`tools/stripe_sandbox_preflight.py` consumes the snapshot and checks exact, unique CAD 2900 minor-unit monthly Race price; its matching enabled test Payment Link; a sandbox HTTPS webhook endpoint subscribed to the required event families; sandbox mode; and complete pagination. A real sandbox receipt will be inspected later, but this preflight **does not** demonstrate it.

`python tools/stripe_sandbox_preflight.py --require-ready` **must return nonzero** for the observed snapshot. This is an expected safety gate, not a CI failure to be bypassed. For tests use `python -B -m unittest discover -s tests -p 'test_*.py' -v`, which verifies that the blocked state is intentional and persists under malformed/wrong-mode/wrong-price fixtures.

## Strongest negative finding: refunded payments

The existing webhook only monitors checkout, paid/failed invoices and subscription status. Locally constructed but correctly HMAC-signed `charge.refunded` or `charge.dispute.created` events are **ignored** and a previously recorded paid subscription remains eligible by `subscription_store.is_active`. The Gate 7 test `test_refund_and_dispute_are_not_handled_and_active_remains_true` is an **intentional counterexample** that records the dangerous existing behavior, not a passing security property.

No charge/refund-to-subscription binding has been implemented or independently verified. Blocking every race subscriber because any unrelated Stripe refund occurs would also be an unacceptable defect. The required solution needs an independently authenticated payment-intent/charge/invoice/subscription linkage, idempotent reversal journal and appropriate refund/dispute policy, tested against actual sandbox events and reconciled with Stripe's dashboard.

As long as this gap remains, **DO NOT** use the internal subscription predicate to grant real paid gameplay, economic rewards, payouts or transferable tokens. Existing game authentication, cancel/portal integration and durable production database are also incomplete.

## Next executable experiment and required authorization

1. Confirm the sandbox commercial/tax policy for the CAD $29/month race (including whether tax is collected via Stripe Tax, and whether prices are tax-inclusive or tax-exclusive).
2. Only with confirmed policy, create a **sandbox-only** Mars Race product, recurring CAD 2900 Price and matching sandbox Payment Link; never reuse live IDs or the unrelated sandbox USD token-pack prices.
3. Set up an actual nonproduction HTTPS Python webhook service and independent durable data store. Configure sandbox-specific event destination, signing secret and price/link IDs privately (no secrets in GitHub/chat). Do not send events to the static Vercel HTML site.
4. Perform at least one genuine Stripe-generated **test-mode** successful checkout, renewal with Stripe Test Clock, failed renewal, cancellation and reversal/dispute. Record actual event API versions, independent delivery evidence and Stripe origin, without leaking customer PII or credentials.
5. Run replay, concurrency, restart, backup/restore, PII minimization and refusal tests on those **real** events. Independently reconcile receipts against Stripe Dashboard test-mode records.
6. Source-disjoint review, auth design, customer portal and incident/rollback gates are required before any production authority is considered.

Until then: `PAPER_ONLY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`, `ABSTAIN_EXTERNAL_SANDBOX_DELIVERY`, `ABSTAIN_REFUND_DISPUTE_CORRELATION`.

**No sandbox charges or billing objects were created, and no live Stripe balances or subscriptions were changed by this gate.**
