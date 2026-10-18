# NGROK SETUP - Makes localhost:5000 public so Stripe can reach it

# Step 1: Install ngrok
# Go to https://ngrok.com/download -> Download -> Unzip -> Move ngrok.exe to C:\Users\curtz\Downloads\ZENITH-1-PRO\

# Step 2: Sign up at https://ngrok.com -> Get auth token -> Run:
# ngrok config add-authtoken YOUR_AUTH_TOKEN

# Step 3: Start webhook server in one PowerShell:
# python webhook_server.py

# Step 4: In another PowerShell, start ngrok:
# ngrok http 5000

# Step 5: Copy the https URL ngrok gives you (like https://a1b2c3d4.ngrok.io)
# Then go to https://dashboard.stripe.com/webhooks -> Add endpoint -> URL: https://a1b2c3d4.ngrok.io/webhook
# Events to send: checkout.session.completed, payment_intent.succeeded
# Copy webhook signing secret (whsec_...) and set in .env

# Your webhook will now receive real payments and auto-unlock races!

Write-Host "NGROK SETUP GUIDE:"
Write-Host "1. Download ngrok: https://ngrok.com/download" -ForegroundColor Cyan
Write-Host "2. Unzip and put ngrok.exe in this folder: C:\Users\curtz\Downloads\ZENITH-1-PRO\" -ForegroundColor White
Write-Host "3. Get auth token: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host "4. Run: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
Write-Host "5. Run webhook server: python webhook_server.py (in one PowerShell)" -ForegroundColor White
Write-Host "6. Run ngrok: ngrok http 5000 (in another PowerShell)" -ForegroundColor White
Write-Host "7. Copy https URL -> Paste in Stripe Dashboard -> Webhooks -> Add endpoint" -ForegroundColor White
