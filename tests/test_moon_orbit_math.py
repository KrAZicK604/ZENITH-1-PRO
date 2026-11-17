import math
import unittest
from moon_orbit_math import MOONS, NO_KNOWN_NATURAL_MOONS, moon_relative_km, moon_position_km, moon_planet_distance_km, moon_to_planet_km
from planet_distance_math import position_km

class MoonOrbitTests(unittest.TestCase):
 def test_hosts_and_inventory(self):
  self.assertEqual(len(MOONS),21)
  self.assertEqual(NO_KNOWN_NATURAL_MOONS,("Mercury","Venus"))
  self.assertEqual(set(x[0] for x in MOONS),{"Earth","Mars","Jupiter","Saturn","Uranus","Neptune"})

 def test_center_distances_all_moons(self):
  for name,(_,radius,period,_) in MOONS.items():
   for t in (0,period*.27,period):
    with self.subTest(name=name,t=t):
     self.assertAlmostEqual(moon_planet_distance_km(name,t),radius,places=5)

 def test_parent_translation(self):
  for name,(host,r,_,_) in MOONS.items():
   px,py=position_km(host,0)
   mx,my=moon_position_km(name,0)
   self.assertAlmostEqual(math.hypot(mx-px,my-py),r,places=4)

 def test_orbital_period(self):
  for name,(_,_,period,_) in MOONS.items():
   a=moon_relative_km(name,0)
   b=moon_relative_km(name,period)
   self.assertLess(math.dist(a,b),1e-5)

 def test_retrograde_triton(self):
  a=moon_relative_km("Triton",0)
  b=moon_relative_km("Triton",.1)
  self.assertGreater(a[0],0)
  self.assertLess(b[1],0)

 def test_host_distance_is_relative_radius(self):
  for name,(host,r,_,_) in MOONS.items():
   self.assertAlmostEqual(moon_to_planet_km(name,host,0),r,places=4)

 def test_reject_bad_input(self):
  for fn,args in ((moon_relative_km,("Unknown",0)),(moon_relative_km,("Moon",float("nan"))),
                  (moon_to_planet_km,("Moon","Pluto",0))):
   with self.assertRaises(ValueError):fn(*args)

if __name__=="__main__":unittest.main()
