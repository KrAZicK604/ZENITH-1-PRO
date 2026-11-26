"""Static workflow policy checks; not a substitute for GitHub branch rules."""
from pathlib import Path
import unittest


class WorkflowReleaseHoldTests(unittest.TestCase):
    def test_pinned_node24_actions_and_scanner(self):
        root = Path(__file__).resolve().parents[1]
        workflow = (root/".github/workflows/python-security.yml").read_text()
        self.assertIn("actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09",workflow)
        self.assertIn("actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1",workflow)
        self.assertIn("pip-audit==2.10.1",workflow)
        self.assertIn("  pull_request:",workflow)
        self.assertIn("python -m pip check",workflow)

    def test_release_approval_is_explicitly_blocked(self):
        text=(Path(__file__).resolve().parents[1]/"RELEASE_HOLD.md").read_text()
        self.assertIn("PROMOTION_BLOCKED",text)
        self.assertIn("productionAuthority NONE",text)
        self.assertIn("HTTP 403",text)
