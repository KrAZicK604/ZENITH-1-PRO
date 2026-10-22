param(
    [string]$StripeKey = "",
    [string]$Action = "check"  # check, payout, list
)

# Get key from param, env, or .env
if (-not $StripeKey -or $StripeKey -like "*YOUR*") {
    if ($env:STRIPE_SECRET_KEY) {
        $StripeKey = $env:STRIPE_SECRET_KEY
        Write-Host "Using key from env: $($StripeKey.Substring(0,15))..." -ForegroundColor Cyan
    } elseif (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match "STRIPE_SECRET_KEY\s*=\s*(sk_(live|test)_[^\s]+)") {
            $StripeKey = $matches[1]
            Write-Host "Using key from .env: $($StripeKey.Substring(0,15))..." -ForegroundColor Cyan
        }
    }
}

if (-not $StripeKey -or $StripeKey -like "*YOUR*") {
    Write-Host "❌ No Stripe key found!" -ForegroundColor Red
    Write-Host "Get your LIVE key from https://dashboard.stripe.com/apikeys" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.stripe.com/apikeys" -ForegroundColor White
    Write-Host "2. Make sure View test data OFF (no orange)" -ForegroundColor White
    Write-Host "3. Click Reveal live key - Copy sk_live_..." -ForegroundColor White
    Write-Host "4. Run: `$env:STRIPE_SECRET_KEY='sk_live_...'; .\stripe_payout.ps1 -Action check" -ForegroundColor White
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $StripeKey"
    "Content-Type" = "application/x-www-form-urlencoded"
}

Write-Host "=== STRIPE FUNDS REDIRECT - Mode: $(if($StripeKey -like "*live*"){'LIVE REAL MONEY'}else{'TEST FAKE MONEY'}) ===" -ForegroundColor Green

# Function to make Stripe API call
function Invoke-StripeApi {
    param($Method, $Endpoint, $Body = $null)
    try {
        $uri = "https://api.stripe.com/v1/$Endpoint"
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
        } else {
            $response = Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $Body
        }
        return $response
    } catch {
        Write-Host "❌ Stripe API error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host $_.ErrorDetails.Message -ForegroundColor Red
        }
        return $null
    }
}

# ACTION: CHECK BALANCE
if ($Action -eq "check" -or $Action -eq "list") {
    Write-Host "`n--- 💰 BALANCE - ALL FUNDS ---" -ForegroundColor Yellow
    $balance = Invoke-StripeApi -Method GET -Endpoint "balance"
    if ($balance) {
        $totalAvail = 0
        $totalPend = 0
        
        Write-Host "Available (ready to payout to bank):" -ForegroundColor Green
        foreach ($avail in $balance.available) {
            $amount = $avail.amount / 100
            Write-Host "  `$$amount $($avail.currency.ToUpper()) - Currency: $($avail.currency)" -ForegroundColor White
            $totalAvail += $avail.amount
            if ($avail.amount -gt 0) {
                Write-Host "    -> This $$amount is ready to payout to bank NOW" -ForegroundColor Green
            }
        }
        
        Write-Host "`nPending (holding 7 days for new accounts):" -ForegroundColor Yellow
        foreach ($pend in $balance.pending) {
            $amount = $pend.amount / 100
            Write-Host "  `$$amount $($pend.currency.ToUpper())" -ForegroundColor White
            $totalPend += $pend.amount
            if ($pend.amount -gt 0) {
                Write-Host "    -> This $$amount is PENDING - Will move to Available after 7 days" -ForegroundColor Yellow
            }
        }
        
        Write-Host "`n--- SUMMARY ---" -ForegroundColor Cyan
        Write-Host "Total Available: $($totalAvail/100) - Will go to bank on next payout" -ForegroundColor Green
        Write-Host "Total Pending: $($totalPend/100) - Still in 7-day hold" -ForegroundColor Yellow
        Write-Host "Grand Total: $(($totalAvail+$totalPend)/100)" -ForegroundColor White
        
        if ($totalAvail -eq 0 -and $totalPend -eq 0) {
            Write-Host "`n⚠️  NOTHING AVAILABLE - No real payments yet" -ForegroundColor Red
            Write-Host "Reasons:" -ForegroundColor Yellow
            Write-Host "1. In TEST mode (sk_test_...) - Fake money" -ForegroundColor White
            Write-Host "2. No one paid $29 with REAL credit card yet" -ForegroundColor White
            Write-Host "3. Payment links are TEST mode - Need LIVE mode links" -ForegroundColor White
            Write-Host "`nFix: Go to https://dashboard.stripe.com/payment-links - Make sure View test data OFF - Create LIVE $29 link" -ForegroundColor Cyan
        }
    }
    
    Write-Host "`n--- 📊 RECENT PAYMENTS (Last 5) ---" -ForegroundColor Yellow
    $charges = Invoke-StripeApi -Method GET -Endpoint "charges?limit=5"
    if ($charges -and $charges.data) {
        if ($charges.data.Count -eq 0) {
            Write-Host "  No payments yet - Share LIVE link: https://buy.stripe.com/cNicMY68hfdN5N35148bS03" -ForegroundColor White
        } else {
            foreach ($ch in $charges.data) {
                $amount = $ch.amount / 100
                $email = if ($ch.billing_details.email) { $ch.billing_details.email } else { "Unknown" }
                $created = [DateTimeOffset]::FromUnixTimeSeconds($ch.created).DateTime.ToString("yyyy-MM-dd HH:mm")
                Write-Host "  `$$amount $($ch.currency) - $email - $($ch.status) - $created" -ForegroundColor White
            }
        }
    }
    
    Write-Host "`n--- 🏦 PAYOUTS TO BANK ---" -ForegroundColor Yellow
    $payouts = Invoke-StripeApi -Method GET -Endpoint "payouts?limit=5"
    if ($payouts -and $payouts.data) {
        if ($payouts.data.Count -eq 0) {
            Write-Host "  No payouts yet - First payout happens after 7 days (new accounts)" -ForegroundColor White
            if ($totalAvail -gt 0) {
                Write-Host "  You have $($totalAvail/100) available - Next daily payout will send to bank" -ForegroundColor Green
            }
        } else {
            foreach ($p in $payouts.data) {
                $amount = $p.amount / 100
                $arrival = [DateTimeOffset]::FromUnixTimeSeconds($p.arrival_date).DateTime.ToString("yyyy-MM-dd")
                Write-Host "  `$$amount - $($p.status) - Arrives $arrival - Method: $($p.method) - Bank: $($p.destination)" -ForegroundColor White
            }
        }
    }
    
    Write-Host "`n--- 🏦 BANK ACCOUNTS ---" -ForegroundColor Yellow
    $accounts = Invoke-StripeApi -Method GET -Endpoint "accounts"
    if ($accounts) {
        Write-Host "Account: $($accounts.id) - Type: $($accounts.type) - Country: $($accounts.country)" -ForegroundColor White
        Write-Host "Payouts enabled: $($accounts.payouts_enabled) - Charges enabled: $($accounts.charges_enabled)" -ForegroundColor White
        if (-not $accounts.payouts_enabled) {
            Write-Host "⚠️  Payouts NOT enabled - Go to https://dashboard.stripe.com/settings/account to verify ID" -ForegroundColor Red
        }
        if ($accounts.external_accounts -and $accounts.external_accounts.data) {
            foreach ($bank in $accounts.external_accounts.data) {
                Write-Host "  Bank: $($bank.bank_name) - Last4: $($bank.last4) - Currency: $($bank.currency)" -ForegroundColor White
            }
        } else {
            Write-Host "  No bank account added - Go to https://dashboard.stripe.com/settings/payouts to add" -ForegroundColor Yellow
        }
    }
}

# ACTION: PAYOUT - Redirect all available funds to bank
if ($Action -eq "payout") {
    Write-Host "`n--- 💸 REDIRECT ALL AVAILABLE FUNDS TO BANK ---" -ForegroundColor Magenta
    
    $balance = Invoke-StripeApi -Method GET -Endpoint "balance"
    $totalAvail = 0
    $currency = "cad"
    
    foreach ($avail in $balance.available) {
        $totalAvail += $avail.amount
        $currency = $avail.currency
    }
    
    if ($totalAvail -eq 0) {
        Write-Host "❌ Nothing available to payout - Available is 0" -ForegroundColor Red
        Write-Host "Check https://dashboard.stripe.com/balance - Is there Available money?" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Available to payout: $($totalAvail/100) $currency" -ForegroundColor Green
    Write-Host "This will create manual payout to your bank account" -ForegroundColor White
    
    $confirm = Read-Host "Create payout of $($totalAvail/100) $currency to bank? Type YES to confirm"
    
    if ($confirm -eq "YES") {
        $body = @{
            "amount" = $totalAvail
            "currency" = $currency
        }
        
        $payout = Invoke-StripeApi -Method POST -Endpoint "payouts" -Body $body
        
        if ($payout) {
            $amount = $payout.amount / 100
            $arrival = [DateTimeOffset]::FromUnixTimeSeconds($payout.arrival_date).DateTime.ToString("yyyy-MM-dd")
            Write-Host "`n✅ PAYOUT CREATED!" -ForegroundColor Green
            Write-Host "  Amount: `$$amount $currency" -ForegroundColor White
            Write-Host "  Status: $($payout.status)" -ForegroundColor White
            Write-Host "  Arrival: $arrival (2-3 business days)" -ForegroundColor White
            Write-Host "  ID: $($payout.id)" -ForegroundColor White
            Write-Host "  Method: $($payout.method)" -ForegroundColor White
            Write-Host "`nMoney will arrive in bank on $arrival" -ForegroundColor Green
            Write-Host "Check https://dashboard.stripe.com/payouts to track" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Payout failed - Check https://dashboard.stripe.com/settings/payouts - Bank added? Verified?" -ForegroundColor Red
        }
    } else {
        Write-Host "Payout cancelled - Type YES to confirm next time" -ForegroundColor Yellow
    }
}

Write-Host "`n=== DONE - Check https://dashboard.stripe.com/balance ===" -ForegroundColor Green
