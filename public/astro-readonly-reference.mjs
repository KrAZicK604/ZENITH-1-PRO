/** READ-ONLY ephemeris research display.
 * Data copied from 16 genuine JPL Horizons VECTORS requests and the
 * source-different NAIF SPICE DE440s + MAR099s audit, not from game-world XYZ.
 * Original receipt ZIP SHA-256:
 * 8dd3c3679be601976aa88bc5a5a33464cd31eec86a42c06cc13d918f7bbc2271
 * Four discrete samples do NOT define a continuous trajectory, and may never
 * be silently extrapolated into free-roam physics.
 */
export const ASTRO_REFERENCE=Object.freeze({
 status:'RESEARCH_ONLY_NUMERICAL_COMPARISON',
 source:'NASA/JPL Horizons API',
 frame:'ICRF, barycentric, requested FRAME, geometric, TDB',
 positionUnit:'km',velocityUnit:'km/s',
 originalReceiptSha256:'8dd3c3679be601976aa88bc5a5a33464cd31eec86a42c06cc13d918f7bbc2271',
 proofUrl:'https://github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43333118978',
 de440sSha256:'c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2',
 mar099sSha256:'997dc93ba640e476da7a494d2237dcdeb145e528db37be8ccee588c615e4e1ff',
 epochs:Object.freeze([
  Object.freeze({jdTdb:2461355.5,earthMoonKm:402248.20630194317,earthMarsKm:201930387.96254146,moonMarsKm:202030869.6760469}),
  Object.freeze({jdTdb:2461356.5,earthMoonKm:404167.02830620465,earthMarsKm:200668210.37076584,moonMarsKm:200845354.18174806}),
  Object.freeze({jdTdb:2461357.5,earthMoonKm:405339.3043345566,earthMarsKm:199402323.8790767,moonMarsKm:199648568.82057706}),
  Object.freeze({jdTdb:2461360.5,earthMoonKm:402737.96146462974,earthMarsKm:195584077.9847099,moonMarsKm:195965897.09029093})
 ])
});
