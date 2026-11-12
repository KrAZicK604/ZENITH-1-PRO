# Mars Race 4D/3D ship — scientific and gameplay contract

## Definition

This implementation is **3D space plus time**, not four spatial axes. The simulation state is

\[
S(t)=(\mathbf p(t),\mathbf v(t),q(t),\boldsymbol\omega(t),B(t),\{\mathbf a_i(t)\})
\]

with \(\mathbf p,\mathbf v,\boldsymbol\omega\in\mathbb R^3\), unit quaternion \(q\in S^3\), remaining boosts \(B\), and moving obstacles \(\mathbf a_i\). The integration clock is fixed at \(\Delta t=1/60\) seconds, and time advances only in running state. This is a **synthetic arcade approximation**, not a general-relativistic four-dimensional spacetime metric, SI-traceable astrodynamics, a real solar system, or a physics engine with measured force constants.

### Equations

For unit body axes \(\hat f(q),\hat u(q),\hat r(q)\) rotated by quaternion \(q\):

\[
\mathbf a=90T\hat f+60L\hat u+60R\hat r+
\frac{\mu(\mathbf p_M-\mathbf p)}{\|\mathbf p_M-\mathbf p\|\max(\|\mathbf p_M-\mathbf p\|^2,80^2)}
+350b\hat f.
\]

Semi-implicit Euler with damping: \(\mathbf v_{k+1}=e^{-0.13\Delta t}\mathbf v_k+\Delta t\mathbf a_k\), capped at 260 synthetic units/s, then \(\mathbf p_{k+1}=\mathbf p_k+\Delta t\mathbf v_{k+1}\). Attitude integrates \(q_{k+1}=\operatorname{normalize}(q_k\otimes[\cos(\theta/2),\hat\omega\sin(\theta/2)])\) with \(\theta=\|\omega\|\Delta t\), and damped body angular velocity. Note that the actual code applies a softened acceleration \(\mu/\max(r^2,80^2)\) and never uses unbounded inverse-square gravity.

Moving-asteroid collisions use a relative swept-segment closest-approach test rather than endpoint overlap alone. A collision is terminal and takes priority over goal scoring in the same frame. The world boundaries are axis-aligned, with damping/rebound; these are arcade design choices.

## Rendering and controls

A same-origin Canvas 2D context performs software perspective projection of a 3D ship triangle mesh, moving 3D obstacles, world-coordinate grid, Earth/Moon/Mars spheres and a chase/orbit camera. **This is a 3D scene projected into a 2D screen, not WebGL, VR stereoscopy or headset tracking.** The ship has pitch, yaw, roll and 3D translation. The camera and renderer do not control simulation state.

Desktop: W/S forward/reverse, A/D yaw, arrow keys pitch/roll, Q/E strafe, R/F vertical translation, Space boost, P pause. Touch buttons mirror these controls. The page suspends physics on blur/background and resets inputs. No network calls, payments or authenticated ranking.

## Verification and limitations

- Node deterministic tests: vectors, quaternions, all three translational axes, all three attitude axes, 60 Hz time, state transitions, seeded obstacle fields, swept collision, depth separation, terminal priorities, velocity/bounds and boost limits.
- Headless Chromium: desktop forward thrust and yaw, mobile touch thrust and layout, pause clock freeze, restart, runtime JS errors and external network requests.
- All browser tests are local CI simulations, not physical phone or VR headset testing.
- The scene has no depth buffer, clipping of polygons intersecting the near plane, physically accurate light/shadows, or measured device frame-time guarantees. Mesh triangles are painter-sorted; occlusion is approximate.
- The integration is discrete and fixed-step; the 3D world is not independently calibrated. No server-authoritative multiplayer or competitive scoring is present.

**Research/release policy:** preserve original v37 and v1 files. Branch remains `PAPER_ONLY`, `PROMOTION_BLOCKED`, `productionAuthority NONE`. No real-money gameplay, production release, or claim of actual 4D spatial navigation.
