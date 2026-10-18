import matplotlib.pyplot as plt, numpy as np

fig, ax = plt.subplots(figsize=(12,8))
ax.set_facecolor("#4B2E0F")
ax.set_xlim(-10,10)
ax.set_ylim(-6,6)

# Mars surface
for i in range(100):
    x,y = np.random.uniform(-10,10), np.random.uniform(-6,6)
    ax.plot(x,y, "o", color="red", alpha=0.3, markersize=np.random.randint(1,4))

# 1000 starships landing spots
for i in range(30): # show 30 for visual
    x = np.random.uniform(-8,8)
    y = np.random.uniform(-4,4)
    ax.plot([x,x],[y,y+0.8], color="silver", linewidth=2)
    ax.plot(x,y+0.8, "^", color="white", markersize=4)

ax.text(0,5.5,"MARS BASE ALPHA - 1000 Starships - ZENITH-1 COLONY", ha="center", color="white", fontsize=14, weight="bold")
ax.text(0,5,"Power 2.5GW - Population 12k - Fuel Saved 117t x 1000 = 117,000t", ha="center", color="lime", fontsize=10)
ax.set_title("STEP 8 COLONY BUILDER - Elon's Plan", color="white")
plt.savefig("colony.png", dpi=200, facecolor="#4B2E0F")
print("Saved colony.png - 1000 ships")
plt.close()
