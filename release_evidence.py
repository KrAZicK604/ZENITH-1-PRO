"""Offline release evidence consistency only. Never authorizes deployment."""
import re

def assess(head, run, reviews, author):
    if not isinstance(head, str) or not re.fullmatch(r"[0-9a-f]{40}", head):
        raise ValueError("invalid head")
    ci = (run.get("head_sha") == head and run.get("status") == "completed"
          and run.get("conclusion") == "success"
          and run.get("name") == "Python security and syntax checks")
    latest = {}
    for review in reviews:
        user = review.get("user", {}).get("login")
        if isinstance(user, str) and user:
            latest[user.casefold()] = review
    candidates = sorted(user for user, review in latest.items()
        if user != author.casefold() and review.get("commit_id") == head
        and review.get("state") == "APPROVED")
    return {"ci_record_matches": ci, "approval_candidates": candidates,
            "status": "PROMOTION_BLOCKED", "productionAuthority": "NONE",
            "reason": "UNAUTHENTICATED_RECORDS_AND_UNVERIFIED_REPOSITORY_ENFORCEMENT"}
