"""Read-only, offline configuration preflight; never prints secrets or accesses Stripe.

Exit 0 only when configuration shape and explicit deployment attestations pass.
This does NOT verify credentials, remote Stripe resources, or production readiness.
"""
import os
import sys
from pathlib import Path

SANDBOX_PRICE = "price_1Ub3Oo5ibR43v2XMkYaCtRiI"


def check(env):
    errors = []
    if env.get("STRIPE_EXPECT_LIVEMODE") != "false":
        errors.append("MODE_NOT_EXPLICIT_SANDBOX")
    secret = env.get("STRIPE_WEBHOOK_SECRET", "")
    if not (secret.startswith("whsec_") and len(secret) > 12 and
            not any(x in secret.upper() for x in ("REPLACE", "EXAMPLE", "PLACEHOLDER", "YOUR_"))):
        errors.append("SIGNING_SECRET_MISSING_OR_TEMPLATE")
    if env.get("RACE_PRICE_ID") != SANDBOX_PRICE:
        errors.append("SANDBOX_PRICE_ID_MISMATCH")
    link = env.get("RACE_PAYMENT_LINK_ID", "")
    if not (link.startswith("plink_") and len(link) > 10 and
            not any(x in link.upper() for x in ("REPLACE", "EXAMPLE", "PLACEHOLDER", "YOUR_"))):
        errors.append("PAYMENT_LINK_NOT_CONFIGURED")
    db_path = env.get("DATABASE_PATH", "")
    if not db_path or not Path(db_path).is_absolute():
        errors.append("DATABASE_PATH_NOT_ABSOLUTE")
    # Explicit human evidence gates, not inferred from filesystem paths or secrets.
    if env.get("ZENITH_DURABLE_STORAGE_REVIEWED") != "true":
        errors.append("DURABLE_STORAGE_NOT_ATTESTED")
    if env.get("ZENITH_WEBHOOK_DESTINATION_REVIEWED") != "true":
        errors.append("WEBHOOK_DESTINATION_NOT_ATTESTED")
    if env.get("ZENITH_AUTH_BINDING_REVIEWED") != "true":
        errors.append("AUTH_BINDING_NOT_ATTESTED")
    if env.get("ZENITH_EXTERNAL_REVIEW_APPROVED") != "true":
        errors.append("INDEPENDENT_REVIEW_NOT_ATTESTED")
    return errors


def main():
    errors = check(os.environ)
    if errors:
        print("ABSTAIN_SANDBOX_PREFLIGHT: " + ",".join(errors))
        return 2
    print("LOCAL_CONFIGURATION_SHAPE_PASS_EXTERNAL_EVIDENCE_NOT_VERIFIED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
