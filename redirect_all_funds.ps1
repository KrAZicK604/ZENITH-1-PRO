# AUTO SETUP - REDIRECT ALL FUNDS TO STRIPE BANK PAYOUT

Write-Host "=== AUTO SETUP - REDIRECT FUNDS TO BANK ===" -ForegroundColor Green

# 1. Install Stripe SDK if needed
try {
    python -c "import stripe" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing stripe..." -ForegroundColor Yellow
        pip install stripe --quiet
    }
} catch {
    pip install stripe --quiet
}

# 2. Check for key
$key = $env:STRIPE_SECRET_KEY
if (-not $key) {
    if (Test-Path ".env") {
        $content = Get-Content ".env" -Raw
        if ($content -match "STRIPE_SECRET_KEY\s*=\s*(sk_[^\s]+)") {
            $key = $matches[1]
        }
    }
}

if (-not $key -or $key -like "*YOUR*") {
    Write-Host "❌ No LIVE key set - Opening Stripe API keys page..." -ForegroundColor Red
    Write-Host "Get LIVE key from https://dashboard.stripe.com/apikeys" -ForegroundColor Yellow
    Start-Process "https://dashboard.stripe.com/apikeys"
    Write-Host "`n1. Make sure View test data OFF (no orange)" -ForegroundColor White
    Write-Host "2. Click Reveal live key - Copy sk_live_..." -ForegroundColor White
    Write-Host "3. Run: `$env:STRIPE_SECRET_KEY='sk_live_...'" -ForegroundColor White
    Write-Host "4. Run: .\stripe_payout.ps1 -Action check" -ForegroundColor White
    Write-Host "5. Run: .\stripe_payout.ps1 -Action payout (to payout all available to bank)" -ForegroundColor Green
    exit 1
}

Write-Host "✅ Using key: $($key.Substring(0,15))... Mode: $(if($key -like "*live*"){'LIVE REAL MONEY'}else{'TEST FAKE'})" -ForegroundColor Green

# 3. Check balance
Write-Host "`nChecking balance..." -ForegroundColor Yellow
.\stripe_payout.ps1 -StripeKey $key -Action check

# 4. Ask to payout
Write-Host "`n--- PAYOUT ALL AVAILABLE FUNDS TO BANK? ---" -ForegroundColor Magenta
Write-Host "This will redirect all Available money to your bank account" -ForegroundColor White
Write-Host "Check https://dashboard.stripe.com/balance - Available amount" -ForegroundColor Cyan

$payout = Read-Host "Type PAYOUT to redirect all available funds to bank, or CHECK to just check again"

if ($payout -eq "PAYOUT") {
    .\stripe_payout.ps1 -StripeKey $key -Action payout
} else {
    Write-Host "Skipping payout - Run .\stripe_payout.ps1 -Action payout when ready" -ForegroundColor Yellow
}

Write-Host "`n=== OPENING STRIPE PAGES ===" -ForegroundColor Green
Start-Process "https://dashboard.stripe.com/balance"
Start-Process "https://dashboard.stripe.com/payouts"
Start-Process "https://dashboard.stripe.com/settings/payouts"

Write-Host "`nDone! Check https://dashboard.stripe.com/payouts for payout status" -ForegroundColor Green
