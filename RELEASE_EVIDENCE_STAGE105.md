# Stage 10.5 — read-only GitHub evidence
Observed PR 67 head 95f39fb426a0cecf8dfe0f88d6c7539056b39411, open draft unmerged.
GitHub REST actions/runs/45755610108 returned exact head, pull_request event,
completed success, .github/workflows/python-security.yml.
Job 139693408496 logs: 108 tests, all three release evidence tests passed,
no broken requirements and no known vulnerabilities reported.
REST pulls/67/reviews?per_page=100&page=1 returned [].
REST rulesets returned []; branches/main/protection returned HTTP 403.
No reviewer permission or independence can be established without reviewers.
These observations are point-in-time, not signed or independently retained.
They apply to PR 67 only, not this successor or main.
Required next: administrator verifies enforced exact-head checks, stale approval
dismissal, independent authorized reviewer and no bypass. Requery after any
head change. Do not substitute a self-review or a successful test for approval.
PAPER_ONLY / PROMOTION_BLOCKED / productionAuthority NONE.
