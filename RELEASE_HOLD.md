# Release gate — explicit HOLD

Status: PAPER_ONLY / PROMOTION_BLOCKED / productionAuthority NONE.

The linked GitHub App cannot read branch protection (GET /branches/main/protection
returned HTTP 403). The workflow passing on a draft PR does not prove that
required checks or independent reviews are enforced on main. No merge,
deployment, secret mutation, payment initiation, or production enablement is
authorized by these research branches.

## Required independent evidence

- Review and reconcile the complete stacked PR chain, latest target main
  commit, conflicts, and exact merge candidate diff. No blind rebase/merge.
- Enforce branch rules using a credential with admin authority, including
  required exact-head checks, non-bypass approvals and review dismissal.
- Independently authenticated provider login with immutable subject-to-player
  linkage and cross-account attack tests.
- Actual isolated Stripe-generated sandbox webhook delivery under authorized
  endpoint; live-price/catalog confirmation and cancellation/renewal stress.
- Deployed persistent datastore: restart, concurrency, backup, restore,
  independently retained latest checkpoint and reconciliation of revocations.
- Independently verified clock-source/threshold behavior and explicit recovery
  process. Local UTC host clock remains UNATTESTED.
- Deployed browser header/CSP/VR compatibility, routing and purchase-link
  containment. A static file check is not deployed Vercel evidence.
- Independent security reviewer and signed/traceable final approval.

Failures, missing evidence, unavailable verification or stale records must
produce ABSTAIN. No implementation in this branch converts this note into
enforceable GitHub branch protection.

## Validated tooling updates on this research branch

The GitHub refs for actions/checkout v5 and actions/setup-python v6 resolve to
fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 and
ece7cb06caefa5fff74198d8649806c4678c61a1. Both checked-in action.yml
files declare node24. pip-audit 2.10.1 was observed in a successful CI log;
future updates require another observed evidence record. Ubuntu runner and
Python 3.12 platform remain pinned in CI configuration, not a certified OS
image digest. The application package pin inventory is version-only, not a
wheel-hash lock.
