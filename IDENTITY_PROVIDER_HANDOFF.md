# Stage 10.1 — authenticated player identity integration gate

STATUS: PAPER_ONLY / PROMOTION_BLOCKED / productionAuthority NONE.

No trusted player identity provider, registered issuer/audience, signing keys,
owned account linkage, or real login session is currently connected. Do not
represent player_sessions.issue(player_id) as a public authentication mechanism.

## Authoritative boundary

1. Choose and independently verify an OIDC identity provider and register the
   backend client, redirect origins, audience, issuer and redirect URI.
2. Only the backend accepts an ID token after verifying signature against
   provider-controlled JWKS, approved algorithms, issuer, audience, expiry,
   not-before, nonce and key rotation/revocation.
3. Bind the provider's immutable subject to an internal player ID with a
   transaction-owned, unique, non-reassignable mapping. Email is never an ID.
4. Provision Stripe customer/subscription ownership only from authenticated
   provider identity plus server-verified billing evidence, not redirect params
   or a browser-supplied customer/subscription string.
5. Issue opaque, short-lived, hashed sessions through the trusted server adapter
   only. Use Secure/HttpOnly/SameSite cookie transport, CSRF defenses, session
   rotation and server-side revocation. New grants must obey retained clock gate.
6. Lock every protected action and its receipt within the same database write
   transaction as the current session and paid-period checks.
7. A provider outage, unknown key, conflicting subject mapping, wrong issuer,
   wrong audience, future token, expired token or missing billing proof DENIES.
   Preserve independently authenticated cancellation and logout.

## Mandatory adversarial scenarios

Cross-account customer substitution; email reuse; old signing key; issuer swap;
audience swap; ID-token replay; nonce replay; expired/early token; malicious JWKS
injection; race between cancellation and action; two players attempting same
subscription; restored token; unavailable provider.

## Current enforced boundary

No public player identity/session issuance route is provided by cloud_webhook.
Its only intended routes are GET / and POST /webhook plus Flask static handling.
The local player_sessions module is research-only and relies on a trusted caller.
Without provider verification and real route integration, authentication is NOT
implemented or production-authorized.
