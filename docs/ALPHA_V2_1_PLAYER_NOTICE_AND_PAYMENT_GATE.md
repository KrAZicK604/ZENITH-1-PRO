# ZENITH ALPHA v2.1 — Player Notice and Payment Verification Gate

> **Status:** Prepared for review. This document does not establish that the Alpha v2.0 Windows-local HTML has been updated or that any payments have been verified.

## Player announcement (publish only after the changes are actually live)

**We're sorry for the confusion.**

ZENITH ALPHA is being updated to improve the accuracy of player counts, race access, leaderboard information, and payment displays. Previously displayed earnings, prize pools, player counts, and “paid/unlocked” indicators may have been demo or unverified values. They must not be interpreted as confirmed payments, withdrawable funds, or verified live participation.

Until a server-side verification service is operational, paid-race access and payout claims remain unavailable. We appreciate your patience while we make these corrections.

— ZENITH Development Team

## Mandatory acceptance gates

1. Replace static “127 ONLINE” and similar counters with server-authenticated current participants; otherwise show **Live count unavailable**, never a fabricated number.
2. Label local score, demo credits, and illustrative prize pools **SIMULATION — NOT CASH**. Never infer real revenue as `count × advertised price`.
3. Never accept `?payment=success`, browser localStorage, an HTML variable, or a client callback as evidence of paid entitlement.
4. A server must validate a Stripe event signature, identify the exact expected product/price, amount, currency, billing interval, successful payment state, and authenticated player; deduplicate webhook event IDs and persist entitlements server-side.
5. The $29 CAD Stripe item currently advertised as monthly must be disclosed as a **subscription**, not misrepresented as a one-time race ticket.
6. Prize or payout claims require an approved contest/payout program, legal review, verified transaction ledger, and actual settlement records. Do not display “daily auto payout” as fact without evidence.
7. Map each button to the corresponding implemented function; unsupported destinations must be disabled with a clear explanation, not silently redirected to test checkout.
8. Keep unpaid/demo races available only when explicitly marked as demos; enforce paid-race authorization **server-side** before joining multiplayer.
9. Confirm the actual `FINAL_ALPHA_v2_VISUAL.html` file is present before editing it; the Windows `file://` copy cannot be accessed from GitHub automatically.
10. Perform real browser and server-side tests before announcing completion. No deploy, merge, or payout without explicit approval.

## Known missing source

The user identified the file as `C:\Users\curtz\Downloads\ZENITH-1-PRO\FINAL_ALPHA_v2_VISUAL.html`. It was not found at the GitHub repository root on `main` at review time. This document is a **preparatory safety patch**, not a repair of that missing file.
