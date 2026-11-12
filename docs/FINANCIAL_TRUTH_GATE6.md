# Gate 6 preparation — financial truth, safety, and external sandbox boundary

## Verified findings

During a read-only inspection of the connected Qoiin live Stripe account on 2026-11-12, the returned CAD available and pending amounts were both **0 minor units**. Its full first-page charge and payout lists each returned zero objects and `has_more=false`. This establishes the connected account's observed snapshot, **not** the status of another Stripe account, provider, bank or historical archived payment.

Earlier ZENITH-1-PRO files displayed or asserted **$3,683 CAD**, including a hardcoded 'DEMO BALANCE' in historical Streamlit code, a speculative 127 × $29 sale assumption, and a fabricated fallback in `stripe_connector.py`. Those outputs did **not** prove actual sales, receivables, payouts or custody. The historical Git commits remain intact; this branch removes that behavior from active read-only tools.

## Changes proposed

- `stripe_connector.py`: no demo balances or fake charges, corrected Race/School checkout URLs, explicit mode/key match, no secrets echoed and disabled Payment Link creation. Getter errors remain errors, rather than silently becoming $0 or demo results.
- `check_pending.py`: prints only results from authenticated Stripe reads, labels unavailable outcomes accurately, does not guess bank transfers, payment arrival dates or new sales, and does not automatically scan local `.env` secrets.
- `stripe_payout.ps1`: explicitly **blocks** `-Action payout`, uses GET-only read operations when intentionally configured, never echoes API credentials.
- `redirect_all_funds.ps1`: no automatic payout capability; retained as a fail-closed legacy entry point.
- `README.md`: corrected CAD $29/month Mars Race, CAD $199 one-time course, CAD $999 one-time school links; clear separation between static frontend, unmerged backend, and Stripe Dashboard.
- `tests/test_financial_truth.py`: mock-only regression tests, no Stripe network calls, no real transaction or account mutation.

## Safety and operations

Only the **live** Qoiin account is currently accessible through the Stripe connector. Do **not** simulate a paid customer by making a live charge or turning on live webhook reception. A new **separately authorized** Stripe sandbox/test connection, a nonproduction persistent backend with protected signing secret, and real Stripe-generated signed event delivery are still missing. Gate 6 requires actual delivery evidence and reconciliation with Stripe's Dashboard/event records before promoting the PR #3/5 subscription ledger.

No payment creation, payout, refund, production deployment or bank account changes are authorized or performed by this branch. Protect originals, review this PR, rerun CI and independently verify real billing behavior. `PAPER_ONLY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`.
