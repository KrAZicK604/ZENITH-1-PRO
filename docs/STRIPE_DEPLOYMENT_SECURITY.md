# ZENITH-1-PRO Stripe security deployment

Based on commit `89666e2`. No live revenue, payout, or payment-link status has been verified.

## Verified webhook deployment

The existing `Procfile` launches `gunicorn cloud_webhook:app`. Use a Python web host and configure:

- `STRIPE_WEBHOOK_SECRET`: actual Stripe destination signing secret (`whsec_`) stored server-side.
- `RACE_PAYMENT_LINK_ID`: exact `plink_` ID for the race product, retrieved from Stripe. A checkout URL is **not** this ID.
- `DATABASE_PATH`: persistent backed-up writable SQLite file location (e.g. `/var/data/zenith_entitlements.sqlite3`). Ephemeral storage loses unlocks.

Send `checkout.session.completed` to `https://YOUR-HOST/webhook`. Only a signature-verified Checkout Session marked `paid`, referring to the configured Payment Link, with exact 2900 cents CAD and a real customer email, is recorded. Replayed sessions are idempotent. Different prices, discounts, tax, currencies, and asynchronous payment flows require separate, tested policy and are denied by default.

There is deliberately no public email lookup endpoint. **Paid access is not yet end-to-end functional**: a properly authenticated authorization endpoint and game integration still must be implemented. Never grant access from query parameters, redirects, or caller-supplied email. Use a shared transactional database for horizontally scaled deployment.

## Testing and hosting

Run `python -B -m unittest discover -s tests -p 'test_*.py' -v`. Mock signature tests exercise business logic but are not a substitute for Stripe-signed integration testing. Verify delivery, storage durability, duplicate deliveries, webhook outages, and real test-mode payment-link mapping before enabling live use.

Run Streamlit separately with `streamlit run app.py`. Never paste Stripe secret keys into a public interface. Check payouts and balances only in the authenticated Stripe dashboard.

The linked commit has a failing **Vercel** status. This project currently exposes Flask/Gunicorn and Streamlit Python entry points, not a validated Vercel deployment; the Vercel build log was not available in this review. Keep deployment-specific resolution open until its actual error is inspected.

Do not merge until tests and security review pass. No real charges, payouts, bank transfers or production authority are granted by this patch.
