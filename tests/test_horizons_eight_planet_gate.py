import math
import unittest
from horizons_eight_planet_gate import BODY_IDS,parse_horizons_vector,compare_eight,pairwise_dist

EPOCH="2026-Nov-17 00:00:00.0000"
def fixture(body,xyz=(1.,2.,3.),center=0,units="KM-S",epoch=EPOCH):
    return ("Target body name: Synthetic Planet ("+str(body)+")\n"
            "Center body name: Solar System Barycenter ("+str(center)+")\n"
            "Reference frame : ICRF\nOutput units    : "+units+"\n"
            "$$SOE\n2461361.5 = "+epoch+"\n"
            " X = %.9E Y = %.9E Z = %.9E\n"%xyz+"$$EOE\n")

class HorizonsGateTests(unittest.TestCase):
    def test_eight_centers(self):
        self.assertEqual(list(BODY_IDS.values()),[199,299,399,499,599,699,799,899])

    def test_parse_one_vector(self):
        self.assertEqual(parse_horizons_vector(fixture(399),399,EPOCH),(1.,2.,3.))

    def test_wrong_body_center_units_and_epoch_fail(self):
        for text in (fixture(499),fixture(399,center=10),fixture(399,units="AU-D"),
                     fixture(399,epoch="2026-Nov-18 00:00:00.0000")):
            with self.subTest(text=text):
                with self.assertRaises(ValueError):
                    parse_horizons_vector(text,399,EPOCH)

    def test_missing_and_duplicate_vectors_fail(self):
        base=fixture(399)
        for text in (base.replace("$$SOE",""),base.replace("$$EOE",""),
                     base.replace("$$EOE"," X = 1 Y = 2 Z = 3\n$$EOE")):
            with self.assertRaises(ValueError):
                parse_horizons_vector(text,399,EPOCH)

    def test_all_eight_synthetic_comparison_is_not_certification(self):
        raw={name:fixture(code) for name,code in BODY_IDS.items()}
        result=compare_eight(raw,EPOCH,0,{name:0.0 for name in BODY_IDS})
        self.assertEqual(len(result),8)
        self.assertTrue(all(math.isfinite(v["xy_error_km"]) for v in result.values()))
        with self.assertRaises(ValueError):
            compare_eight(raw,EPOCH,0,None)

    def test_all_28_three_dimensional_distances(self):
        v={name:(float(i),float(i+1),float(i+2))
           for i,name in enumerate(BODY_IDS)}
        d=pairwise_distances(v)
        self.assertEqual(len(d),28)
        self.assertAlmostEqual(d["Mercury—Venus"],math.sqrt(3))

    def test_incomplete_data_fail(self):
        with self.assertRaises(ValueError):
            pairwise_distances({"Earth":(0,0,0)})
        with self.assertRaises(ValueError):
            compare_eight({"Earth":fixture(399)},EPOCH,0,{"Earth":0})

if __name__=="__main__":
    unittest.main()
