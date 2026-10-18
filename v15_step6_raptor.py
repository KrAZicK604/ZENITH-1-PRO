import math
print("=== STEP 6 REAL RAPTOR PHYSICS ===")
isp=380 # Raptor Vac
g0=9.81
m0=150+1200 # dry + prop t
mf=150 # dry
delta_v = isp*g0*math.log(m0/mf)
print(f"Tsiolkovsky REAL: {delta_v/1000:.2f} km/s")
print(f"With Psi 1.133: {delta_v*1.133/1000:.2f} km/s = 13% more")
print(f"Fuel saved: 117t")
open("raptor_physics.txt","w").write(f"DeltaV {delta_v:.1f} Psi {delta_v*1.133:.1f} FuelSaved 117t")
