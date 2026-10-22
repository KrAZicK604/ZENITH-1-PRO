# FIX - CREATE NEW LIVE MODE PAYMENT LINK FOR REAL MONEY

# Go to https://dashboard.stripe.com/payment-links
# Make sure "View test data" toggle is OFF (top left, no orange)
# Click "Create payment link" or "New"
# Product: 
#   Name: REALITY OS - Ranked Race Entry $29
#   Description: Entry to ranked race - $1,247 prize pool - First to Mars
#   Price: $29 CAD (one-time)
#   Or USD if you want USD: $29 USD
# After creation:
#   - Copy link (like https://buy.stripe.com/...)
#   - This is LIVE mode link - Real money
#   - Replace old link in game

# Your current links - Check if LIVE or TEST:
current_links = {
    "race_29": "https://buy.stripe.com/cNicMY68hfdN5N35148bS03",
    "course_199": "https://buy.stripe.com/00wfZa7cle9J5N379c8bS02",
    "school_999": "https://buy.stripe.com/bJebIU54dghRa3j2SW8bS01"
}

print("Your current links:")
for name, url in current_links.items():
    print(f"  {name}: {url}")
    print(f"    Check: Go to https://dashboard.stripe.com/payment-links -> Find this link -> Does it say LIVE or TEST at top?")

print("\nTo create LIVE link:")
print("1. Go to https://dashboard.stripe.com/payment-links")
print("2. Toggle OFF 'View test data' (top left, must be OFF, no orange)")
print("3. Click 'Create payment link' or 'New'")
print("4. Create product: REALITY OS Race $29 - Price $29 CAD")
print("5. After creation, copy new LIVE link")
print("6. Replace in game files and app.py")
print("7. Share new link - When someone pays with REAL credit card, you get real money in https://dashboard.stripe.com/balance -> Available -> Payout to bank")
