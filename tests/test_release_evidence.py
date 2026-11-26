import unittest
from release_evidence import assess

class ReleaseEvidenceTests(unittest.TestCase):
    def test_exact_head_and_independent_candidate_never_authorize(self):
        h = "a"*40
        run = dict(head_sha=h,status="completed",conclusion="success",
                   name="Python security and syntax checks")
        review = dict(user={"login":"reviewer"},commit_id=h,state="APPROVED")
        result = assess(h,run,[review],"owner")
        self.assertTrue(result["ci_record_matches"])
        self.assertEqual(result["approval_candidates"],["reviewer"])
        self.assertEqual(result["productionAuthority"],"NONE")
        self.assertEqual(result["status"],"PROMOTION_BLOCKED")

    def test_stale_ci_and_self_review(self):
        h = "a"*40
        result = assess(h,{"head_sha":"b"*40},[
            dict(user={"login":"OWNER"},commit_id=h,state="APPROVED"),
            dict(user={"login":"other"},commit_id="b"*40,state="APPROVED")],"owner")
        self.assertFalse(result["ci_record_matches"])
        self.assertEqual(result["approval_candidates"],[])

    def test_later_dismissal_removes_candidate(self):
        h = "a"*40
        review = dict(user={"login":"reviewer"},commit_id=h,state="APPROVED")
        result = assess(h,{},[review,{**review,"state":"DISMISSED"}],"owner")
        self.assertEqual(result["approval_candidates"],[])
