# Vercel static frontend deployment (isolated from Stripe webhook)

The provided Vercel deployment URL reports failure through GitHub status, but the authenticated Vercel build logs were not available during this change. Do not misrepresent this as a confirmed root-cause diagnosis.

This repository has two **different** Python entrypoints: `app.py` is Streamlit, and `cloud_webhook.py` is Flask. Vercel can serve a static frontend safely without trying to run Streamlit or a SQLite-backed payment webhook as a serverless function.

- `vercel.json` chooses **Other** framework, skips the build, and serves only the `public/` directory. Vercel cannot accidentally publish Python source or local key/config files as static site assets.
- `public/index.html` is a non-privileged landing page with existing hosted-checkout links. Live/test status and prices are **not verified**.
- **No payment verification or game unlock is implemented on Vercel.** Keep `cloud_webhook.py` on a persistent Python host with secure secrets and durable database. See `docs/STRIPE_DEPLOYMENT_SECURITY.md`.
- Existing Streamlit app remains for a separate Streamlit deployment.

To validate the preview: push the PR branch, open its Vercel preview deployment (not the historical failed deployment), check the homepage returns HTTP 200, and inspect the Vercel build/runtime logs. If project settings force a different Root Directory, correct that setting: `vercel.json` expects the repository root. Do not promote to production until reviewed.

The old Vercel deployment ID is immutable: fixes create a **new** deployment, not a change to the old failed deployment.
