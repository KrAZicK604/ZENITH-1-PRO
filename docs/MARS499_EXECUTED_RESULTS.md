# Mars 499 Four-Epoch Numerical Verification — Executed Result

**Execution:** GitHub Actions [run 43333118978](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43333118978), successful on source commit `bcee8b4e0b647d4cd1da4b2f90072378ea6a2cef`. An additional locally authored, source-different audit of the downloaded receipt archive was performed on the same ChatGPT-controlled host.

**Original acquisition evidence:** [artifact 13995288640](https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43333118978/artifacts/13995288640) (ZIP SHA-256 `8dd3c3679be601976aa88bc5a5a33464cd31eec86a42c06cc13d918f7bbc2271`), 16 original JPL Horizons JSON replies plus one manifest receipt. Each raw JSON byte sequence is SHA-256 recorded by filename in receipt. The ZIP was read and validated as 17 unique members, all 16 file hashes, body IDs, shared epochs, frame metadata, 16 state-vector pairs, numerical residual arithmetic, and recomputed 3D distance formulas. No independent physical calibration, signed source or trusted timestamp was established.

## Numerical acceptance

- Four predeclared epochs JD(TDB): 2461355.5, 2461356.5, 2461357.5, 2461360.5.
- Four targets at each epoch: Earth 399; Moon 301; Mars-system barycenter 4; **Mars planetary body-center 499**.
- Both position (km) and velocity (km/s) compared against CSPICE with DE440s + MAR099s. Coordinate request ICRF/FRAME, barycentric center 0, geometric correction NONE.
- Preset per-body-per-epoch 3D residual limits: **1.0 km position**; **1e-4 km/s velocity**.
- **16/16 state comparisons passed**; worst position residual **0.0022214732539266235 km** (Moon at JD 2461355.5); worst velocity residual **5.696205583860592e-9 km/s** (Moon at JD 2461360.5).
- Mars planetary-center residuals in position at the four epochs: 3.0719530773e-8, 3.0719530773e-8, 2.9802322388e-8 and 0 km. Maximum Mars center velocity residual 3.58036e-15 km/s.
- No averaging was used to hide an epoch-specific failure; any failed vector would cause an overall failure.

| JD(TDB) | Earth–Moon center km | Earth–Mars 499 center km | Moon–Mars 499 center km |
|---|---:|---:|---:|
| 2461355.5 | 402248.20630194317 | 201930387.96254146 | 202030869.6760469 |
| 2461356.5 | 404167.02830620465 | 200668210.37076584 | 200845354.18174806 |
| 2461357.5 | 405339.3043345566 | 199402323.8790767 | 199648568.82057706 |
| 2461360.5 | 402737.96146462974 | 195584077.9847099 | 195965897.09029093 |

## Source pinning (post-first-run, not retrospectively frozen)

- JPL DE440s kernel 32,726,016 bytes SHA-256: `c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2`.
- JPL MAR099s kernel 67,594,240 bytes SHA-256: `997dc93ba640e476da7a494d2237dcdeb145e528db37be8ccee588c615e4e1ff`.

The hashes are now pinned in a subsequent commit so an unreviewed replacement cannot pass a later replay. The two large binary kernels are **not** stored in the GitHub Actions evidence artifact; retain independent source custody to make that aspect of replay durable.

## Scope of demonstrated evidence

This establishes strong **numerical cross-implementation consistency** at four instants, including the missing Mars **planetary center**. It does not prove independent astronomical truth because Horizons and MAR099s ultimately share JPL dynamical modeling. The output's geometric equatorial FRAME plane is explicitly pinned in the HTTPS request; real Horizons response headers do not separately attest that plane. Source HTTPS plus local hashes is not a third-party signed custody record.

Four samples are **not** a continuously validated planetary trajectory. No time interpolation/extrapolation or orbital transfer, flight time, gravity integration, fuel requirement, encounter geometry or spacecraft dynamics has been certified. The game may display these numbers as **static observational-model references**, but must never map them directly to arcade flight coordinates or claim that its engine uses physical km.

**Research status:** `PAPER_ONLY`; `ABSTAIN_EXTERNAL_PROVENANCE`; `ABSTAIN_PHYSICAL_METROLOGY`; `ABSTAIN_CONTINUOUS_TRAJECTORY`; `PROMOTION_BLOCKED`; `productionAuthority NONE`.
