"""Offline-only sandbox configuration gate.

Checks local configuration shape, NEVER contacts Stripe, activates a checkout,
or asserts tax/legal readiness, actual webhook custody, or persistent storage.
For Stripe-authoritative status read the sandbox Dashboard separately.
"""
import json
import os
from pathlib import Path

SANDBOX_ACCOUNT_ID = "acct_1U2sFM5ibR43v2XM"
SANDBOX_PRODUCT_ID = "prod_VcHyGbFH4lmgNJ"
SANDBOX_PRICE_ID = "price_1Ub3Oo5ibR43v2XMkYaCtRiI"


def _valid_id(value, prefix):
    if not isinstance(value, str) or not value.startswith(prefix):
        return False
    if len(value) <= len(prefix):
        return False
    return not any(word in value.upper() for word in
                   ("REPLACE", "PLACEHOLDER", "EXAMPLE", "YOUR_"))


def examine(env=None):
    """Return a non-authorizing, safely displayable configuration report."""
    env = os.environ if env is None else env
    blockers = []
    if env.get("STRIPE_EXPECT_LIVEMODE") != "false":
        blockers.append("SANDBOX_MODE_REQUIRED")
    if env.get("RACE_PRICE_ID") != SANDBOX_PRICE_ID:
        blockers.append("VERIFIED_SANDBOX_PRICE_REQUIRED")
    if not _valid_id(env.get("RACE_PAYMENT_LINK_ID"), "plink_"):
        blockers.append("SANDBOX_PAYMENT_LINK_MISSING")
    if not _valid_id(env.get("STRIPE_WEBHOOK_SECRET"), "whsec_"):
        blockers.append("WEBHOOK_SIGNING_SECRET_MISSING")
    path = env.get("DATABASE_PATH", "")
    if not isinstance(path, str) or not Path(path).is_absolute():
        blockers.append("ABSOLUTE_STORAGE_PATH_MISSING")
    # Even if no local blockers remain, no signed external event or tax
    # readiness has been proved. A path alone does not prove durability.
    return {
        "stage": "GATE6_SANDBOX_CONFIG",
        "result": "BLOCKED" if blockers else "LOCAL_CONFIG_ONLY_NOT_EXTERNAL_VERIFIED",
        "blockers": blockers,
        "unverified_external_requirements": [
            "STRIPE_TAX_HEAD_OFFICE_AND_REGISTRATION",
            "SIGNED_STRIPE_GENERATED_WEBHOOK_DELIVERY",
            "INDEPENDENT_STORAGE_DURABILITY_AND_RESTART",
            "CUSTOMER_IDENTITY_AND_REVOCATION",
        ],
        "production_authority": "NONE",
    }


def main():
    print(json.dumps(examine(), sort_keys=True, indent=2))
    return 0 if examine()["result"] == "LOCAL_CONFIG_ONLY_NOT_EXTERNAL_VERIFIED" else 2


if __name__ == "__main__":
    raise SystemExit(main())
