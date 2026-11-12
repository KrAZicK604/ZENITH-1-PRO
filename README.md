# ZENITH-1-PRO

VR racing preview and a Stripe-hosted checkout storefront.

## Correct checkout links (Stripe live catalog verified read-only November 2026)

| Product | Billing terms | Checkout |
| --- | --- | --- |
| Mars Race | **CAD $29 per month**, recurring subscription | https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01 |
| Complete Course | **CAD $199 once** | https://buy.stripe.com/00wfZa7cle9J5N379c8bS02 |
| School License | **CAD $999 once** | https://buy.stripe.com/cNicMY68hfdN5N35148bS03 |

The current Price/Payment Link objects in Stripe are authoritative; check the final billed amount, applicable taxes and monthly renewal term at the hosted checkout. A checkout redirect is **not** proof of payment or game authorization.

## Separate hosting

- The Vercel `public/index.html` site is a **static frontend**, not a Stripe webhook handler.
- The Streamlit preview uses `streamlit run app.py`.
- The secure webhook, subscription receipt journal, persistent backend, and authentication work remain in separate review branches and are **not evidence of live game unlock**.
- Keep a distinct Stripe sandbox/test environment before testing signed delivery or activating any paid access.

## Inspecting actual account balances safely

The old website and scripts contained example balances, including **$3,683**, that were not derived from real Stripe transactions. Those examples must not be represented as receivables, available bank funds, customer purchases or payout promises.

Use the authenticated [Stripe Balance](https://dashboard.stripe.com/balance), [Payments](https://dashboard.stripe.com/payments), and [Payouts](https://dashboard.stripe.com/payouts) pages to verify actual records. If a local read-only CLI is desired, use `python check_pending.py` with a private process environment containing `STRIPE_SECRET_KEY` and an explicit `STRIPE_EXPECT_LIVEMODE=false` (test) or `true` (live). Never paste a Stripe secret into this website, GitHub, screenshots or a chat. When credentials are absent, the CLI fails closed and displays **no fabricated fallback**.

Do not use the historical payout scripts for production. Live account changes, money transfers, automatic customer grants and production deployment require distinct authorization and verified controls.

## Research / release safety

GitHub tests and preview builds are necessary but not sufficient. Preserve historical code and evidence, review changes in pull requests, run regressions, require genuine Stripe sandbox-signed event delivery and independently verified persistent storage and identity. Until complete, `PAPER_ONLY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`.
