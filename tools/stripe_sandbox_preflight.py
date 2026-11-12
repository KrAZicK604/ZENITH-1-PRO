"""Read-only, offline Stripe sandbox test-readiness gate.

Input is an evidence snapshot, not a live Stripe call or a proof of custody.
Blocked checks exit nonzero when --require-ready is supplied.
"""
import argparse
import json
from pathlib import Path

REQUIRED_EVENTS = frozenset((
    "checkout.session.completed", "invoice.paid", "invoice.payment_failed",
    "customer.subscription.updated", "customer.subscription.deleted",
    "customer.subscription.paused",
))
DEFAULT_SNAPSHOT = (Path(__file__).resolve().parents[1] /
                    "evidence" / "sandbox_preflight_2026-11-12.json")


def inspect(snapshot):
    blockers = []
    if not isinstance(snapshot, dict) or snapshot.get("schema") != "zenith-stripe-sandbox-preflight-v1":
        return {"ready": False, "blockers": ["invalid_snapshot_schema"]}
    if snapshot.get("livemode") is not False:
        blockers.append("non_sandbox_account")

    goal = snapshot.get("expected_product", {})
    if (not isinstance(goal, dict) or
        goal.get("name") != "Mars Race" or goal.get("currency") != "cad" or
        type(goal.get("unit_amount")) is not int or goal.get("unit_amount") != 2900 or
        goal.get("recurring_interval") != "month"):
        blockers.append("unexpected_race_product_policy")

    raw_prices = snapshot.get("prices", [])
    if not isinstance(raw_prices, list):
        raw_prices = []
    matching = [
        p for p in raw_prices if isinstance(p, dict) and
        p.get("product_name") == "Mars Race" and p.get("currency") == "cad"
        and type(p.get("unit_amount")) is int and p["unit_amount"] == 2900
        and p.get("recurring_interval") == "month"
        and isinstance(p.get("id"), str) and p["id"].startswith("price_")
    ]
    if len(matching) != 1:
        blockers.append("missing_or_ambiguous_sandbox_race_price")

    matching_id = matching[0]["id"] if len(matching) == 1 else None
    raw_links = snapshot.get("payment_links", [])
    if not isinstance(raw_links, list):
        raw_links = []
    links = [
        pl for pl in raw_links if isinstance(pl, dict)
        and pl.get("price_id") == matching_id
        and pl.get("active") is True
        and pl.get("livemode") is False
        and isinstance(pl.get("id"), str) and pl["id"].startswith("plink_")
        and isinstance(pl.get("url"), str) and pl["url"].startswith("https://buy.stripe.com/")
    ] if matching_id else []
    if len(links) != 1:
        blockers.append("missing_or_ambiguous_sandbox_race_payment_link")

    endpoints = snapshot.get("webhook_endpoints", [])
    if not isinstance(endpoints, list):
        endpoints = []
    destinations = [
        ep for ep in endpoints if isinstance(ep, dict)
        and ep.get("status") == "enabled"
        and ep.get("livemode") is False
        and isinstance(ep.get("url"), str) and ep["url"].startswith("https://")
        and isinstance(ep.get("enabled_events"), list)
        and all(isinstance(name, str) for name in ep["enabled_events"])
        and (set(ep["enabled_events"]) >= REQUIRED_EVENTS or "*" in ep["enabled_events"])
    ]
    if len(destinations) < 1:
        blockers.append("missing_subscription_test_webhook_destination")

    pages = snapshot.get("pagination", {})
    if not isinstance(pages, dict) or any(pages.get(k) is not False
            for k in ("prices_has_more", "links_has_more", "webhooks_has_more")):
        blockers.append("unverified_catalog_pagination")
    return {
        "ready": not blockers,
        "blockers": blockers,
        "matching_race_price_count": len(matching),
        "matching_race_link_count": len(links),
        "matching_subscription_webhook_count": len(destinations),
        "scope": "sandbox_delivery_prerequisites_only",
        "stripe_originated_delivery_proven": False,
        "production_authority": "NONE",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--require-ready", action="store_true")
    args = parser.parse_args(argv)
    try:
        obj = json.loads(args.snapshot.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        obj = {}
    result = inspect(obj)
    print(json.dumps(result, sort_keys=True, indent=2))
    return 2 if args.require_ready and not result["ready"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
