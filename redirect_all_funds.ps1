# Historical automatic payout helper is permanently disabled in this release.
# This repository cannot initiate or redirect any financial transfer.
Write-Error "Automated payouts are disabled. Review balances and payouts in the authenticated Stripe Dashboard: https://dashboard.stripe.com/payouts. No funds moved."
exit 2
