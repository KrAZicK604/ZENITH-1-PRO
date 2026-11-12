// JPL Horizons sampled vectors. Source: github.com/KrAZicK604/ZENITH-1-PRO/actions/runs/43302301260
// Programmatically copied from validated JPL Horizons job output. These are unsigned source-attributed measurements, not independently authenticated custody.
// Exact 00:00 TDB daily samples only; no interpolation or live astronomical positions.
export const JPL_NAV_CATALOG = Object.freeze({
  "version": 1,
  "sourceAuthority": "NASA/JPL Horizons API",
  "sourceRunId": 43302301260,
  "sourceJobId": 131476367468,
  "timeScale": "TDB",
  "referenceFrame": "ICRF",
  "vectorCorrection": "NONE",
  "units": {
    "position": "km",
    "velocity": "km/s"
  },
  "origin": {
    "id": 399,
    "name": "Earth geocenter",
    "positionKM": [
      0,
      0,
      0
    ]
  },
  "targets": {
    "moon": 301,
    "mars": 499
  },
  "rangeTDB": {
    "start": "2026-11-12",
    "end": "2026-12-13",
    "spacing": "1 d at 00:00 TDB"
  },
  "sampling": "Only stored midnight TDB samples are used; no interpolation or live positions inferred",
  "provenance": {
    "mars_earth": {
      "query": {
        "CENTER": "'500@399'",
        "COMMAND": "'499'",
        "CSV_FORMAT": "'YES'",
        "EPHEM_TYPE": "'VECTORS'",
        "MAKE_EPHEM": "'YES'",
        "OBJ_DATA": "'NO'",
        "OUT_UNITS": "'KM-S'",
        "REF_PLANE": "'FRAME'",
        "REF_SYSTEM": "'ICRF'",
        "START_TIME": "'2026-Nov-12 00:00'",
        "STEP_SIZE": "'1 d'",
        "STOP_TIME": "'2026-Dec-13 00:00'",
        "TIME_TYPE": "'TDB'",
        "VEC_CORR": "'NONE'",
        "VEC_LABELS": "'NO'",
        "VEC_TABLE": "'2'",
        "format": "json"
      },
      "responseSHA256": "86d49361fb54b41b573c11941a228393dc99201688c091d82a21cd90b1ec0b93",
      "url": "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27VECTORS%27&REF_PLANE=%27FRAME%27&REF_SYSTEM=%27ICRF%27&VEC_CORR=%27NONE%27&TIME_TYPE=%27TDB%27&OUT_UNITS=%27KM-S%27&CSV_FORMAT=%27YES%27&VEC_LABELS=%27NO%27&VEC_TABLE=%272%27&START_TIME=%272026-Nov-12+00%3A00%27&STOP_TIME=%272026-Dec-13+00%3A00%27&STEP_SIZE=%271+d%27&COMMAND=%27499%27&CENTER=%27500%40399%27"
    },
    "mars_moon": {
      "query": {
        "CENTER": "'500@301'",
        "COMMAND": "'499'",
        "CSV_FORMAT": "'YES'",
        "EPHEM_TYPE": "'VECTORS'",
        "MAKE_EPHEM": "'YES'",
        "OBJ_DATA": "'NO'",
        "OUT_UNITS": "'KM-S'",
        "REF_PLANE": "'FRAME'",
        "REF_SYSTEM": "'ICRF'",
        "START_TIME": "'2026-Nov-12 00:00'",
        "STEP_SIZE": "'1 d'",
        "STOP_TIME": "'2026-Dec-13 00:00'",
        "TIME_TYPE": "'TDB'",
        "VEC_CORR": "'NONE'",
        "VEC_LABELS": "'NO'",
        "VEC_TABLE": "'2'",
        "format": "json"
      },
      "responseSHA256": "3a3976e148d9f01d74a0adc23628e5377747d18b7e368c8eef8159615fdec31b",
      "url": "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27VECTORS%27&REF_PLANE=%27FRAME%27&REF_SYSTEM=%27ICRF%27&VEC_CORR=%27NONE%27&TIME_TYPE=%27TDB%27&OUT_UNITS=%27KM-S%27&CSV_FORMAT=%27YES%27&VEC_LABELS=%27NO%27&VEC_TABLE=%272%27&START_TIME=%272026-Nov-12+00%3A00%27&STOP_TIME=%272026-Dec-13+00%3A00%27&STEP_SIZE=%271+d%27&COMMAND=%27499%27&CENTER=%27500%40301%27"
    },
    "moon_earth": {
      "query": {
        "CENTER": "'500@399'",
        "COMMAND": "'301'",
        "CSV_FORMAT": "'YES'",
        "EPHEM_TYPE": "'VECTORS'",
        "MAKE_EPHEM": "'YES'",
        "OBJ_DATA": "'NO'",
        "OUT_UNITS": "'KM-S'",
        "REF_PLANE": "'FRAME'",
        "REF_SYSTEM": "'ICRF'",
        "START_TIME": "'2026-Nov-12 00:00'",
        "STEP_SIZE": "'1 d'",
        "STOP_TIME": "'2026-Dec-13 00:00'",
        "TIME_TYPE": "'TDB'",
        "VEC_CORR": "'NONE'",
        "VEC_LABELS": "'NO'",
        "VEC_TABLE": "'2'",
        "format": "json"
      },
      "responseSHA256": "bb3ff33a672ef168bb9a5d8ec539c041f8f78ee4dc3c1606f4ec5f5eae0013b8",
      "url": "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27VECTORS%27&REF_PLANE=%27FRAME%27&REF_SYSTEM=%27ICRF%27&VEC_CORR=%27NONE%27&TIME_TYPE=%27TDB%27&OUT_UNITS=%27KM-S%27&CSV_FORMAT=%27YES%27&VEC_LABELS=%27NO%27&VEC_TABLE=%272%27&START_TIME=%272026-Nov-12+00%3A00%27&STOP_TIME=%272026-Dec-13+00%3A00%27&STEP_SIZE=%271+d%27&COMMAND=%27301%27&CENTER=%27500%40399%27"
    }
  },
  "rows": [
    {
      "dateTDB": "2026-11-12",
      "distancesKM": {
        "earthMars": 200668210.3707659,
        "earthMoon": 404167.0283061912,
        "moonMars": 200845354.18174812
      },
      "earthToMarsKM": [
        -161381431.3491109,
        106700873.3418583,
        53279338.37054353
      ],
      "earthToMoonKM": [
        -73711.14673626817,
        -350624.0052719023,
        -187030.6406548695
      ],
      "julianDateTDB": 2461356.5,
      "marsVelocityKMPS": [
        0.6415357445736625,
        -22.02519882510587,
        -9.050431222856794
      ],
      "moonMarsIndependentCheckKM": 200845354.1817481,
      "moonVelocityKMPS": [
        0.953637015667084,
        -0.1956599150240566,
        -0.04847673038101004
      ]
    },
    {
      "dateTDB": "2026-11-13",
      "distancesKM": {
        "earthMars": 199402323.87907666,
        "earthMoon": 405339.3043345841,
        "moonMars": 199648568.820577
      },
      "earthToMarsKM": [
        -161309010.6139623,
        104806289.1802751,
        52500777.24549736
      ],
      "earthToMoonKM": [
        9638.229604458971,
        -359513.0098015216,
        -186969.1203166645
      ],
      "julianDateTDB": 2461357.5,
      "marsVelocityKMPS": [
        1.033889322384113,
        -21.82986757688636,
        -8.971371119416917
      ],
      "moonMarsIndependentCheckKM": 199648568.82057706,
      "moonVelocityKMPS": [
        0.9684235651370631,
        -0.009543142285882428,
        0.04977312645287663
      ]
    },
    {
      "dateTDB": "2026-11-14",
      "distancesKM": {
        "earthMars": 198132895.71621743,
        "earthMoon": 405584.417519466,
        "moonMars": 198437846.1370085
      },
      "earthToMarsKM": [
        -161202946.4424884,
        102928850.6842255,
        51729161.21471635
      ],
      "earthToMoonKM": [
        92375.71683133267,
        -352279.8425145108,
        -178505.9081163798
      ],
      "julianDateTDB": 2461358.5,
      "marsVelocityKMPS": [
        1.420299982077829,
        -21.62833960201562,
        -8.889679810867767
      ],
      "moonMarsIndependentCheckKM": 198437846.13700846,
      "moonVelocityKMPS": [
        0.9396089047896418,
        0.1763499252207867,
        0.1453901748729857
      ]
    },
    {
      "dateTDB": "2026-11-15",
      "distancesKM": {
        "earthMars": 196860092.1120915,
        "earthMoon": 404750.30554003885,
        "moonMars": 197210908.22078535
      },
      "earthToMarsKM": [
        -161063757.0205473,
        101069085.2032638,
        50964713.84185975
      ],
      "earthToMoonKM": [
        170783.6373659629,
        -329247.1285292985,
        -162024.9591822744
      ],
      "julianDateTDB": 2461359.5,
      "marsVelocityKMPS": [
        1.800660796142839,
        -21.42080095068066,
        -8.80544435935169
      ],
      "moonMarsIndependentCheckKM": 197210908.22078538,
      "moonVelocityKMPS": [
        0.8684960534651658,
        0.3550507369033934,
        0.2347891834573541
      ]
    },
    {
      "dateTDB": "2026-11-16",
      "distancesKM": {
        "earthMars": 195584077.98470992,
        "earthMoon": 402737.96146466176,
        "moonMars": 195965897.09029096
      },
      "earthToMarsKM": [
        -160891969.2138998,
        99227504.05778858,
        50207651.23030711
      ],
      "earthToMoonKM": [
        241295.6457567245,
        -291327.7864751452,
        -138211.4241698164
      ],
      "julianDateTDB": 2461360.5,
      "marsVelocityKMPS": [
        2.17487754492695,
        -21.20743684802845,
        -8.718750531970041
      ],
      "moonMarsIndependentCheckKM": 195965897.09029096,
      "moonVelocityKMPS": [
        0.7572652359938181,
        0.5198409591766412,
        0.3145704392126354
      ]
    },
    {
      "dateTDB": "2026-11-17",
      "distancesKM": {
        "earthMars": 194305016.59808588,
        "earthMoon": 399524.21679480805,
        "moonMars": 194701407.67744207
      },
      "earthToMarsKM": [
        -160688117.4985469,
        97404602.53056599,
        49458182.09172351
      ],
      "earthToMoonKM": [
        300569.9639844882,
        -240010.0574554119,
        -108039.2006454977
      ],
      "julianDateTDB": 2461361.5,
      "marsVelocityKMPS": [
        2.542868425565779,
        -20.98843362863482,
        -8.62968381986606
      ],
      "moonMarsIndependentCheckKM": 194701407.67744207,
      "moonVelocityKMPS": [
        0.6089459260634446,
        0.6640922359654199,
        0.3814353170513149
      ]
    },
    {
      "dateTDB": "2026-11-18",
      "distancesKM": {
        "earthMars": 193023069.02079773,
        "earthMoon": 395181.00608366873,
        "moonMars": 193416537.41424024
      },
      "earthToMarsKM": [
        -160452742.8117973,
        95600859.68733326,
        48716507.73014928
      ],
      "earthToMoonKM": [
        345568.7469184526,
        -177356.832839762,
        -72765.53145246582
      ],
      "julianDateTDB": 2461362.5,
      "marsVelocityKMPS": [
        2.904566226146198,
        -20.76398060838525,
        -8.538330290231574
      ],
      "moonMarsIndependentCheckKM": 193416537.41424024,
      "moonVelocityKMPS": [
        0.4275910924617682,
        0.7811100412636991,
        0.4321154787119516
      ]
    },
    {
      "dateTDB": "2026-11-19",
      "distancesKM": {
        "earthMars": 191738393.24578616,
        "earthMoon": 389888.9618866176,
        "moonMars": 192110963.9387672
      },
      "earthToMarsKM": [
        -160186391.1038591,
        93816738.0810816,
        47982821.98269462
      ],
      "earthToMoonKM": [
        373661.709948287,
        -106014.7818687054,
        -33929.26678956406
      ],
      "julianDateTDB": 2461363.5,
      "marsVelocityKMPS": [
        3.259923078513197,
        -20.53427066491726,
        -8.444776623623385
      ],
      "moonMarsIndependentCheckKM": 192110963.9387671,
      "moonVelocityKMPS": [
        0.2186627978945869,
        0.8640818708530973,
        0.4633686316488348
      ]
    },
    {
      "dateTDB": "2026-11-20",
      "distancesKM": {
        "earthMars": 190451142.9064385,
        "earthMoon": 383942.26753424376,
        "moonMars": 190785056.46125704
      },
      "earthToMarsKM": [
        -159889611.3842441,
        92052683.51372258,
        47257311.21939217
      ],
      "earthToMoonKM": [
        382770.9728652904,
        -29218.99435657061,
        6655.636700317636
      ],
      "julianDateTDB": 2461364.5,
      "marsVelocityKMPS": [
        3.60891727032373,
        -20.29949801538763,
        -8.349108567516074
      ],
      "moonMarsIndependentCheckKM": 190785056.46125704,
      "moonVelocityKMPS": [
        -0.01041220107628287,
        0.9062557457431064,
        0.4721042132629067
      ]
    },
    {
      "dateTDB": "2026-11-21",
      "distancesKM": {
        "earthMars": 189161465.6649935,
        "earthMoon": 377740.5159232424,
        "moonMars": 189440014.9380565
      },
      "earthToMarsKM": [
        -159562953.1432041,
        90309125.17028241,
        46540154.57351249
      ],
      "earthToMoonKM": [
        371566.9951250678,
        49232.77726703189,
        46925.4637298339
      ],
      "julianDateTDB": 2461365.5,
      "marsVelocityKMPS": [
        3.951560526067773,
        -20.05985152639895,
        -8.251407024579471
      ],
      "moonMarsIndependentCheckKM": 189440014.93805656,
      "moonVelocityKMPS": [
        -0.2496469245445405,
        0.901487669774303,
        0.455703732573483
      ]
    },
    {
      "dateTDB": "2026-11-22",
      "distancesKM": {
        "earthMars": 187869501.5764857,
        "earthMoon": 371762.73630079714,
        "moonMars": 188078012.72832635
      },
      "earthToMarsKM": [
        -159206963.2305886,
        88586476.5725721,
        45831524.63041466
      ],
      "earthToMoonKM": [
        339708.8167488815,
        125073.0404351651,
        84629.70212185825
      ],
      "julianDateTDB": 2461366.5,
      "marsVelocityKMPS": [
        4.287902590046034,
        -19.81550234245967,
        -8.151741331544148
      ],
      "moonMarsIndependentCheckKM": 188078012.72832635,
      "moonVelocityKMPS": [
        -0.4861197702673175,
        0.845257281976574,
        0.4125722223030329
      ]
    },
    {
      "dateTDB": "2026-11-23",
      "distancesKM": {
        "earthMars": 186575382.02346113,
        "earthMoon": 366520.23052872944,
        "moonMars": 186702294.5156459
      },
      "earthToMarsKM": [
        -158822182.6203986,
        86885137.83750808,
        45131588.80263837
      ],
      "earthToMoonKM": [
        288093.3528645971,
        193764.577051413,
        117450.3644189951
      ],
      "julianDateTDB": 2461367.5,
      "marsVelocityKMPS": [
        4.618028387832549,
        -19.56658640582375,
        -8.05016031141635
      ],
      "moonMarsIndependentCheckKM": 186702294.5156459,
      "moonVelocityKMPS": [
        -0.7042109028538139,
        0.7361034694487454,
        0.3428727475818587
      ]
    },
    {
      "dateTDB": "2026-11-24",
      "distancesKM": {
        "earthMars": 185279230.05666164,
        "earthMoon": 362489.9751859575,
        "moonMars": 185317161.37692785
      },
      "earthToMarsKM": [
        -158409143.9179634,
        85205499.53802072,
        44440511.49619751
      ],
      "earthToMoonKM": [
        219043.2285440766,
        250832.0710828237,
        143186.3061036383
      ],
      "julianDateTDB": 2461368.5,
      "marsVelocityKMPS": [
        4.942043024550607,
        -19.31318584512899,
        -7.946683458741539
      ],
      "moonMarsIndependentCheckKM": 185317161.37692788,
      "moonVelocityKMPS": [
        -0.8868405960406496,
        0.5771528807129582,
        0.2492503665135341
      ]
    },
    {
      "dateTDB": "2026-11-25",
      "distancesKM": {
        "earthMars": 183981162.93818772,
        "earthMoon": 360039.1381914847,
        "moonMars": 183927777.4014919
      },
      "earthToMarsKM": [
        -157968370.7569292,
        83547947.95304826,
        43758456.88920113
      ],
      "earthToMoonKM": [
        136338.7543154338,
        292307.7607787623,
        159987.8060662395
      ],
      "julianDateTDB": 2461369.5,
      "marsVelocityKMPS": [
        5.260043360677958,
        -19.05531694328579,
        -7.841296357053761
      ],
      "moonMarsIndependentCheckKM": 183927777.401492,
      "moonVelocityKMPS": [
        -1.017813561616578,
        0.3771072641147477,
        0.1372086430752399
      ]
    },
    {
      "dateTDB": "2026-11-26",
      "distancesKM": {
        "earthMars": 182681297.1544906,
        "earthMoon": 359360.20131405303,
        "moonMars": 182539774.71093807
      },
      "earthToMarsKM": [
        -157500380.0505371,
        81912870.75754793,
        43085591.77081024
      ],
      "earthToMoonKM": [
        45014.66093581405,
        315212.9730137895,
        166595.9670373759
      ],
      "julianDateTDB": 2461370.5,
      "marsVelocityKMPS": [
        5.572082063687382,
        -18.79293319218574,
        -7.733954414012394
      ],
      "moonMarsIndependentCheckKM": 182539774.710938,
      "moonVelocityKMPS": [
        -1.084782897508328,
        0.1499885854282229,
        0.01480155942487845
      ]
    },
    {
      "dateTDB": "2026-11-27",
      "distancesKM": {
        "earthMars": 181379755.21683633,
        "earthMoon": 360438.52418409754,
        "moonMars": 181158710.93863058
      },
      "earthToMarsKM": [
        -157005687.2290652,
        80300661.64194897,
        42422087.64445292
      ],
      "earthToMoonKM": [
        -49089.27739852129,
        317951.1945669469,
        162521.4153087302
      ],
      "julianDateTDB": 2461371.5,
      "marsVelocityKMPS": [
        5.878136874645051,
        -18.52594685795065,
        -7.62459594057974
      ],
      "moonMarsIndependentCheckKM": 181158710.9386306,
      "moonVelocityKMPS": [
        -1.081783631039541,
        -0.08664060941589466,
        -0.1084448756676546
      ]
    },
    {
      "dateTDB": "2026-11-28",
      "distancesKM": {
        "earthMars": 180076672.69528812,
        "earthMoon": 363065.08293922746,
        "moonMars": 179789504.9508156
      },
      "earthToMarsKM": [
        -156484813.4214054,
        78711722.44728297,
        41768121.41880164
      ],
      "earthToMoonKM": [
        -139937.9762355792,
        300496.3295615157,
        148106.627727511
      ],
      "julianDateTDB": 2461372.5,
      "marsVelocityKMPS": [
        6.178097978980635,
        -18.25426314769353,
        -7.51316073408641
      ],
      "moonMarsIndependentCheckKM": 179789504.95081556,
      "moonVelocityKMPS": [
        -1.010275174911893,
        -0.3144944381426542,
        -0.2230648335074215
      ]
    },
    {
      "dateTDB": "2026-11-29",
      "distancesKM": {
        "earthMars": 178772203.75733268,
        "earthMoon": 366889.87579690106,
        "moonMars": 178435992.1481861
      },
      "earthToMarsKM": [
        -155938292.7449232,
        77146462.25274073,
        41123874.50056663
      ],
      "earthToMoonKM": [
        -221920.021873376,
        264329.8015955788,
        124456.5821579066
      ],
      "julianDateTDB": 2461373.5,
      "marsVelocityKMPS": [
        6.471777848638268,
        -17.9778142821871,
        -7.399607293755436
      ],
      "moonMarsIndependentCheckKM": 178435992.1481861,
      "moonVelocityKMPS": [
        -0.8783346368596235,
        -0.5173725671323233,
        -0.3210718828022578
      ]
    },
    {
      "dateTDB": "2026-11-30",
      "distancesKM": {
        "earthMars": 177466524.15622255,
        "earthMoon": 371496.6072976563,
        "moonMars": 177100686.8343441
      },
      "earthToMarsKM": [
        -155366677.9840109,
        75605293.95638748,
        40489530.6724099
      ],
      "earthToMoonKM": [
        -290334.3549793947,
        212171.0037775132,
        93269.26990392042
      ],
      "julianDateTDB": 2461374.5,
      "marsVelocityKMPS": [
        6.758936883223022,
        -17.69658208033828,
        -7.283923115405811
      ],
      "moonMarsIndependentCheckKM": 177100686.8343441,
      "moonVelocityKMPS": [
        -0.6985501661401519,
        -0.6830225026023052,
        -0.3968078557049796
      ]
    },
    {
      "dateTDB": "2026-12-01",
      "distancesKM": {
        "earthMars": 176159831.65014642,
        "earthMoon": 376475.27591682214,
        "moonMars": 175784754.89361426
      },
      "earthToMarsKM": [
        -154770543.8015286,
        74088629.5705496,
        39865273.44374966
      ],
      "earthToMoonKM": [
        -341674.2151411753,
        147601.6172401963,
        56622.66924463878
      ],
      "julianDateTDB": 2461375.5,
      "marsVelocityKMPS": [
        7.03931289515975,
        -17.41060522509743,
        -7.166126762025146
      ],
      "moonMarsIndependentCheckKM": 175784754.8936143,
      "moonVelocityKMPS": [
        -0.4855973757891368,
        -0.8037402071673951,
        -0.4471145813885943
      ]
    },
    {
      "dateTDB": "2026-12-02",
      "distancesKM": {
        "earthMars": 174852344.58631065,
        "earthMoon": 381475.8412782363,
        "moonMars": 174488138.05235484
      },
      "earthToMarsKM": [
        -154150487.5971859,
        72596875.4451785,
        39251283.50101418
      ],
      "earthToMoonKM": [
        -373717.7343898984,
        74683.65194370101,
        16769.75294306961
      ],
      "julianDateTDB": 2461376.5,
      "marsVelocityKMPS": [
        7.312644979765967,
        -17.11997466427387,
        -7.046264069551833
      ],
      "moonMarsIndependentCheckKM": 174488138.05235484,
      "moonVelocityKMPS": [
        -0.2542777408699531,
        -0.8759942923483099,
        -0.471022960223654
      ]
    },
    {
      "dateTDB": "2026-12-03",
      "distancesKM": {
        "earthMars": 173544299.58147278,
        "earthMoon": 386236.58214086713,
        "moonMars": 173209754.07699832
      },
      "earthToMarsKM": [
        -153507128.6926394,
        71130428.17591688,
        38647736.61259025
      ],
      "earthToMoonKM": [
        -385481.1193552442,
        -2366.503032737326,
        -24029.22528678008
      ],
      "julianDateTDB": 2461377.5,
      "marsVelocityKMPS": [
        7.578688267896659,
        -16.82482340613919,
        -6.924401968010848
      ],
      "moonMarsIndependentCheckKM": 173209754.07699826,
      "moonVelocityKMPS": [
        -0.01830845815237022,
        -0.8995903144942852,
        -0.4692458321686921
      ]
    },
    {
      "dateTDB": "2026-12-04",
      "distancesKM": {
        "earthMars": 172235949.0194137,
        "earthMoon": 390589.042061234,
        "moonMars": 171947713.87179318
      },
      "earthToMarsKM": [
        -152841106.6048638,
        69689671.44186875,
        38054802.07205291
      ],
      "earthToMoonKM": [
        -377097.0715793446,
        -79427.85672946395,
        -63630.29121384558
      ],
      "julianDateTDB": 2461378.5,
      "marsVelocityKMPS": [
        7.837220741606359,
        -16.52531582544126,
        -6.800622514352305
      ],
      "moonMarsIndependentCheckKM": 171947713.87179312,
      "moonVelocityKMPS": [
        0.2102338670021317,
        -0.8767962612258396,
        -0.443688615453555
      ]
    },
    {
      "dateTDB": "2026-12-05",
      "distancesKM": {
        "earthMars": 170927558.7482472,
        "earthMoon": 394445.59168113745,
        "moonMars": 170699523.68498585
      },
      "earthToMarsKM": [
        -152153078.9674387,
        68274973.68554556,
        37472641.60159948
      ],
      "earthToMoonKM": [
        -349664.4810278852,
        -152655.6483363748,
        -100091.6007224551
      ],
      "julianDateTDB": 2461379.5,
      "marsVelocityKMPS": [
        8.08804512443107,
        -16.22163905289246,
        -6.67501829005796
      ],
      "moonMarsIndependentCheckKM": 170699523.68498585,
      "moonVelocityKMPS": [
        0.4210653411623134,
        -0.8116392398250133,
        -0.3970726712838324
      ]
    },
    {
      "dateTDB": "2026-12-06",
      "distancesKM": {
        "earthMars": 169619406.08816516,
        "earthMoon": 397776.5604352629,
        "moonMars": 169462262.7777275
      },
      "earthToMarsKM": [
        -151443719.3975934,
        66886686.42477983,
        36901408.58880655
      ],
      "earthToMoonKM": [
        -305093.8977518211,
        -218610.5601071003,
        -131732.0332947518
      ],
      "julianDateTDB": 2461380.5,
      "marsVelocityKMPS": [
        8.330988626992198,
        -15.91399690306817,
        -6.54768923561341
      ],
      "moonMarsIndependentCheckKM": 169462262.7777275,
      "moonVelocityKMPS": [
        0.6056719559679404,
        -0.7094099862655772,
        -0.3326771022901209
      ]
    },
    {
      "dateTDB": "2026-12-07",
      "distancesKM": {
        "earthMars": 168311778.11333314,
        "earthMoon": 400583.24833817943,
        "moonMars": 168232738.94245335
      },
      "earthToMarsKM": [
        -150713715.4102821,
        65525143.00214235,
        36341247.54943319
      ],
      "earthToMoonKM": [
        -245957.1220845625,
        -274352.3254940188,
        -157171.3537546557
      ],
      "julianDateTDB": 2461381.5,
      "marsVelocityKMPS": [
        8.565902270502594,
        -15.60260567981167,
        -6.418740484273997
      ],
      "moonMarsIndependentCheckKM": 168232738.94245332,
      "moonVelocityKMPS": [
        0.7572525436015202,
        -0.5763218650466744,
        -0.2541629803027388
      ]
    },
    {
      "dateTDB": "2026-12-08",
      "distancesKM": {
        "earthMars": 167004970.13154736,
        "earthMoon": 402872.01499616797,
        "moonMars": 167007627.65123662
      },
      "earthToMarsKM": [
        -149963766.3810078,
        64190657.64904547,
        35792293.75221132
      ],
      "earthToMoonKM": [
        -175341.0482728989,
        -317507.8362667242,
        -175357.2101935263
      ],
      "julianDateTDB": 2461382.5,
      "marsVelocityKMPS": [
        8.79266044044499,
        -15.28769094883921,
        -6.288280690372723
      ],
      "moonMarsIndependentCheckKM": 167007627.65123665,
      "moonVelocityKMPS": [
        0.8706801378110246,
        -0.4192499372269939,
        -0.1654381880147022
      ]
    },
    {
      "dateTDB": "2026-12-09",
      "distancesKM": {
        "earthMars": 165699284.3076258,
        "earthMoon": 404633.4555135751,
        "moonMars": 165783598.9433541
      },
      "earthToMarsKM": [
        -149194581.5381219,
        62883524.81233576,
        35254672.97962718
      ],
      "earthToMoonKM": [
        -96704.15443662874,
        -346318.0471710626,
        -185581.1144464185
      ],
      "julianDateTDB": 2461383.5,
      "marsVelocityKMPS": [
        9.01116059638148,
        -14.96948461193956,
        -6.156420513647826
      ],
      "moonMarsIndependentCheckKM": 165783598.9433541,
      "moonVelocityKMPS": [
        0.9424751898880279,
        -0.2454945197857127,
        -0.07053437679925147
      ]
    },
    {
      "dateTDB": "2026-12-10",
      "distancesKM": {
        "earthMars": 164395028.41898304,
        "earthMoon": 405829.4284382841,
        "moonMars": 164557432.84255558
      },
      "earthToMarsKM": [
        -148406877.987929,
        61604018.73229384,
        34728501.41865317
      ],
      "earthToMoonKM": [
        -13735.90050079388,
        -359664.6102789285,
        -187483.9143416926
      ],
      "julianDateTDB": 2461384.5,
      "marsVelocityKMPS": [
        9.221322756894807,
        -14.64822202287482,
        -6.023271146503618
      ],
      "moonMarsIndependentCheckKM": 164557432.8425557,
      "moonVelocityKMPS": [
        0.9707594876352462,
        -0.06254774373872167,
        0.02651324267388606
      ]
    },
    {
      "dateTDB": "2026-12-11",
      "distancesKM": {
        "earthMars": 163092514.76400018,
        "earthMoon": 406389.3652386903,
        "moonMars": 163326121.60173282
      },
      "earthToMarsKM": [
        -147601378.8080491,
        60352393.26618959,
        34213885.67601757
      ],
      "earthToMoonKM": [
        69778.04148319266,
        -357076.7443076834,
        -181051.2076195593
      ],
      "julianDateTDB": 2461385.5,
      "marsVelocityKMPS": [
        9.423088426639374,
        -14.32413924945831,
        -5.888942952133009
      ],
      "moonMarsIndependentCheckKM": 163326121.60173273,
      "moonVelocityKMPS": [
        0.9551644036285939,
        0.1221268410780353,
        0.1217764291637782
      ]
    },
    {
      "dateTDB": "2026-12-12",
      "distancesKM": {
        "earthMars": 161792059.2497721,
        "earthMoon": 406215.94593787024,
        "moonMars": 162086956.70890674
      },
      "earthToMarsKM": [
        -146778811.2610392,
        59128881.92994173,
        33710922.90034505
      ],
      "earthToMoonKM": [
        150080.4389533304,
        -338720.6037939132,
        -166600.1474887139
      ],
      "julianDateTDB": 2461386.5,
      "marsVelocityKMPS": [
        9.61641891494018,
        -13.99747081429424,
        -5.753544382424234
      ],
      "moonMarsIndependentCheckKM": 162086956.7089067,
      "moonVelocityKMPS": [
        0.8966903108827393,
        0.3012738021522868,
        0.2115200736310493
      ]
    },
    {
      "dateTDB": "2026-12-13",
      "distancesKM": {
        "earthMars": 160493980.66371194,
        "earthMoon": 405199.05934233795,
        "moonMars": 160837600.4983461
      },
      "earthToMarsKM": [
        -145939905.1688782,
        57933698.09960359,
        33219700.97828639
      ],
      "earthToMoonKM": [
        223553.7068916811,
        -305375.9332204649,
        -144760.3441438089
      ],
      "julianDateTDB": 2461387.5,
      "marsVelocityKMPS": [
        9.801293358825735,
        -13.66844826590444,
        -5.617181343290797
      ],
      "moonMarsIndependentCheckKM": 160837600.49834612,
      "moonVelocityKMPS": [
        0.7975423219757898,
        0.4679569637537198,
        0.2922511896994405
      ]
    }
  ]
});
