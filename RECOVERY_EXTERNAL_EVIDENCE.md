# Recovery external evidence gate

Status: PAPER_ONLY / PROMOTION_BLOCKED / productionAuthority NONE.

A local database and its local clock high-water can be rolled back together.
A matching local SHA-256 is not evidence of freshness or independent custody.

## Required before any activation design is approved

- Independent custodian retains an authenticated, monotonic checkpoint sequence outside the database host and backup account.
- Checkpoint binds environment identity, database generation, snapshot digest, committed event-journal head, retained clock state and predecessor checkpoint digest.
- Checkpoint publication and retrieval use authenticated channels, independently governed signing keys and explicit revocation policy.
- Restore must remain quarantined. Retrieve the current checkpoint from the independent custodian; never accept a caller-selected older checkpoint as current.
- Reconcile all subsequent billing cancellations and session revocations from authoritative sources. Unknown gaps, unavailable custodian, invalid signatures, wrong environment or conflicting heads mean DENY.
- Require independent review and a separate explicit activation authorization. No automatic activation path exists in this research branch.

## Required adversarial acceptance tests

Old database with old local clock state; old valid signed checkpoint; forked checkpoint; wrong environment; revoked signer; unavailable custodian; concurrent cancellation during reconciliation; crash before activation; duplicate replay; restored session token reuse.

Each case must demonstrate fail-closed behavior using independently retained evidence. Local mock signatures cannot satisfy external custody. No external custodian, keys, trusted timestamp, or deployed recovery evidence has been obtained. UTC_HOST_UNATTESTED.
