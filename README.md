# ZENITH-1-PRO

This repository contains game experiments and a separate Mars Race subscription webhook prototype.

## Mars Race — CAD $29/month

**Release status: PROMOTION_BLOCKED. Production authority: NONE.**

The subscription lifecycle code in `cloud_webhook.py` and `subscription_store.py` is not proof that a subscription service is deployed or safe for customers. A passing CI job or a Vercel READY build does not establish actual Stripe sandbox delivery, authenticated player access, durable database storage, backup/restore, or independent security review.

The source code requires a valid Stripe signing secret, exact payment-link and price IDs, an explicit expected Stripe mode, and an absolute `DATABASE_PATH`. A filesystem path alone does not prove persistence; do not use ephemeral serverless storage for subscription records. Do not put API keys, webhook secrets, card information, or customer data in this repository.

Before any billing or entitlement release, complete the evidence and review requirements in [subscription safety issue #26](https://github.com/KrAZicK604/ZENITH-1-PRO/issues/26). Tests using locally signed Stripe-shaped fixtures must be described as **simulated**, not as real Stripe sandbox deliveries.

## Checkout links and product mapping

Historical checkout links were previously listed in this README with conflicting Race/Course/School labels. Their ownership, price, product mapping, and live/test mode have **not been independently confirmed** in this documentation. No checkout link is endorsed here. Inspect authenticated Stripe dashboard records before presenting any link as an approved Mars Race checkout.

## Developer checks

Install Python dependencies from `requirements.txt`, then run:

```sh
python -B -m unittest discover -s tests -p 'test_*.py' -v
```

These are local tests. Their success does not authorize production release.

No gameplay, webhook, payment link, environment setting, or production deployment is changed by this documentation update.
