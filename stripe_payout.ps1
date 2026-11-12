# ZENITH-1-PRO read-only account inspection (PowerShell).
# Financial mutation is disabled until reviewed and separately authorized.
param(
  [ValidateSet("check", "list", "payout")]
  [string]$Action = "check"
)

$ErrorActionPreference = "Stop"
if ($Action -eq "payout") {
  Write-Error "Payout creation is disabled in this repository. Review the authenticated Stripe Dashboard directly. No funds moved."
  exit 2
}

$secret = [Environment]::GetEnvironmentVariable("STRIPE_SECRET_KEY")
$mode = [Environment]::GetEnvironmentVariable("STRIPE_EXPECT_LIVEMODE")
if (-not $secret -or $mode -notin @("true", "false")) {
  Write-Error "Stripe credentials/mode are not configured. No amount is inferred. Use https://dashboard.stripe.com/balance."
  exit 2
}
$requiredPrefix = if ($mode -eq "true") { "sk_live_" } else { "sk_test_" }
if (-not $secret.StartsWith($requiredPrefix) -or $secret.Length -le $requiredPrefix.Length -or $secret -match "YOUR_|REPLACE|PLACEHOLDER|EXAMPLE") {
  Write-Error "Invalid key/mode combination or placeholder; no Stripe request sent."
  exit 2
}

# This command makes GET requests only and never prints the key or customer details.
$headers = @{ Authorization = "Bearer $secret" }
try {
  $balance = Invoke-RestMethod -Method Get -Uri "https://api.stripe.com/v1/balance" -Headers $headers
  Write-Host "STRIPE READ-ONLY BALANCE, mode=$mode"
  foreach ($item in @($balance.available)) {
    Write-Host ("Available {0}: {1}" -f $item.currency.ToUpper(), ($item.amount / 100))
  }
  foreach ($item in @($balance.pending)) {
    Write-Host ("Pending {0}: {1}" -f $item.currency.ToUpper(), ($item.amount / 100))
  }
  if ($Action -eq "list") {
    $payouts = Invoke-RestMethod -Method Get -Uri "https://api.stripe.com/v1/payouts?limit=5" -Headers $headers
    Write-Host ("Recent payout records: {0}" -f @($payouts.data).Count)
    foreach ($p in @($payouts.data)) {
      Write-Host ("Payout {0}, {1} {2} minor units, status {3}" -f $p.id,$p.amount,$p.currency,$p.status)
    }
  }
  Write-Host "Dates, availability, and bank delivery must be verified in the Stripe Dashboard."
}
catch {
  Write-Error "Stripe API read failed. No balance or payout is inferred."
  exit 1
}
