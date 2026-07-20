// ═══════════════════════════════════════════════════════════════════════
//  Orbital Data Source Plugin
//  — Computes Keplerian orbital positions at runtime
//  — No API calls, no network, no stale data
//  — Built-in element tables for Solar System bodies + major moons
//
//  Usage in radiator.yaml:
//    dataSource:
//      type: orbital
//      center: sun           # center body name (lowercase)
//      bodies:
//        - name: earth
//          boldArc: 60       # display annotations only
//          markers:
//            - angle: 45
//              label: EARTH
//              style: solid
//
//  Returns:
//    {
//      center: 'SOL',
//      series: [
//        { label, r, bodyAngle, eccentricity, omega, boldArc, markers, value },
//        ...
//      ]
//    }
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.data = window.HAL.data || {};
window.HAL.data.sources = window.HAL.data.sources || {};

(function() {

  // ── J2000.0 epoch ──────────────────────────────────────────────────
  // 2000-01-01T12:00:00Z = Unix 946728000000
  var J2000_MS = 946728000000;
  var MS_PER_DAY = 86400000;

  // ── Keplerian element tables ───────────────────────────────────────
  // Sources: JPL planetary elements (J2000), JPL satellite ephemerides
  // Fields:
  //   a   — semi-major axis (AU for heliocentric, km for planetocentric)
  //   e   — eccentricity
  //   w   — argument of perihelion / periapsis (degrees)
  //   M0  — mean anomaly at J2000 epoch (degrees)
  //   n   — mean motion (degrees per day)
  //   isKm — true if a is in km (planetocentric), false if AU

  var PLANETS = {
    mercury: { a:0.387099, e:0.205635, w:29.127,  M0:174.79,  n:4.0923,  isKm:false },
    venus:   { a:0.723336, e:0.006777, w:55.186,  M0:50.416,  n:1.6021,  isKm:false },
    earth:   { a:1.000003, e:0.016709, w:102.937, M0:-2.481,  n:0.9856,  isKm:false },
    mars:    { a:1.523679, e:0.093401, w:286.502, M0:19.387,  n:0.5240,  isKm:false },
    jupiter: { a:5.202603, e:0.048498, w:273.867, M0:20.020,  n:0.0831,  isKm:false },
    saturn:  { a:9.554910, e:0.055546, w:339.391, M0:317.020, n:0.0337,  isKm:false },
    uranus:  { a:19.21845, e:0.046295, w:96.998,  M0:140.229, n:0.0119,  isKm:false },
    neptune: { a:30.11039, e:0.008988, w:264.763, M0:256.780, n:0.0060,  isKm:false },
  };

  var MOONS = {
    // Earth
    luna: { a:384400, e:0.0549, w:0.0, M0:0.0, n:13.176, isKm:true },

    // Mars
    phobos:  { a:9376,  e:0.0151, w:0.0, M0:0.0, n:1128.8, isKm:true },
    deimos:  { a:23464, e:0.0002, w:0.0, M0:0.0, n:285.2,  isKm:true },

    // Jupiter
    io:       { a:421800,  e:0.0041,  w:0.0, M0:0.0, n:203.49, isKm:true },
    europa:   { a:671100,  e:0.0094,  w:0.0, M0:0.0, n:101.37, isKm:true },
    ganymede: { a:1070400, e:0.0013,  w:0.0, M0:0.0, n:50.32,  isKm:true },
    callisto: { a:1882700, e:0.0074,  w:0.0, M0:0.0, n:21.57,  isKm:true },
    amalthea: { a:181400,  e:0.0032,  w:0.0, M0:0.0, n:722.5,  isKm:true },
    himalia:  { a:11460000,e:0.162,   w:0.0, M0:0.0, n:0.568,  isKm:true },
    elara:    { a:11740000,e:0.217,   w:0.0, M0:0.0, n:0.546,  isKm:true },
    pasiphae: { a:23624000,e:0.409,   w:0.0, M0:0.0, n:0.189,  isKm:true },

    // Saturn
    mimas:    { a:185540,  e:0.0196,  w:0.0, M0:0.0, n:381.99, isKm:true },
    enceladus:{ a:238040,  e:0.0047,  w:0.0, M0:0.0, n:262.73, isKm:true },
    tethys:   { a:294620,  e:0.0001,  w:0.0, M0:0.0, n:190.70, isKm:true },
    dione:    { a:377420,  e:0.0022,  w:0.0, M0:0.0, n:131.53, isKm:true },
    rhea:     { a:527070,  e:0.001,   w:0.0, M0:0.0, n:79.69,  isKm:true },
    titan:    { a:1221870, e:0.0288,  w:0.0, M0:0.0, n:22.57,  isKm:true },
    hyperion: { a:1481010, e:0.123,   w:0.0, M0:0.0, n:16.92,  isKm:true },
    iapetus:  { a:3560820, e:0.0293,  w:0.0, M0:0.0, n:4.537,  isKm:true },
    phoebe:   { a:12947600,e:0.163,   w:0.0, M0:0.0, n:0.654,  isKm:true },
  };

  // ── Center lookup ──────────────────────────────────────────────────
  // Map center name → which element table to use
  var CENTER_TABLES = {
    sun:     'planets',
    sol:     'planets',
    earth:   'moons',
    jupiter: 'moons',
    saturn:  'moons',
    mars:    'moons',
  };

  // ── Alias map ──────────────────────────────────────────────────────
  // YAML name → element table key (all lowercase)
  var ALIASES = {
    mercury: 'mercury', venus: 'venus', earth: 'earth', mars: 'mars',
    jupiter: 'jupiter', saturn: 'saturn', uranus: 'uranus', neptune: 'neptune',
    luna: 'luna', moon: 'luna',
    phobos: 'phobos', deimos: 'deimos',
    io: 'io', europa: 'europa', eur: 'europa', ganymede: 'ganymede', gny: 'ganymede',
    callisto: 'callisto', amalthea: 'amalthea', himalia: 'himalia', elara: 'elara',
    pasiphae: 'pasiphae',
    mimas: 'mimas', enceladus: 'enceladus', tethys: 'tethys', dione: 'dione',
    rhea: 'rhea', titan: 'titan', hyperion: 'hyperion', iapetus: 'iapetus',
    phoebe: 'phoebe',
  };

  // ── Body label overrides ───────────────────────────────────────────
  // YAML name → display label
  var LABELS = {
    luna: 'LUNA', eur: 'EUR', gny: 'GNY',
  };

  // ── Kepler solver ──────────────────────────────────────────────────
  function solveKepler(el, daysSinceEpoch) {
    var M = el.M0 + el.n * daysSinceEpoch;
    M = ((M % 360) + 360) % 360;
    var Mrad = M * Math.PI / 180;
    var e = el.e;

    // Newton iteration for eccentric anomaly
    var E = Mrad;
    for (var iter = 0; iter < 12; iter++) {
      var dE = (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
      E = E - dE;
      if (Math.abs(dE) < 1e-12) break;
    }

    // True anomaly
    var cosE = Math.cos(E);
    var sinE = Math.sin(E);
    var nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );
    if (nu < 0) nu += 2 * Math.PI;

    // Distance
    var r = el.a * (1 - e * cosE);

    // Body angle = true anomaly + argument of periapsis
    var bodyAngle = ((nu * 180 / Math.PI) + el.w + 360) % 360;

    return { r: r, bodyAngle: bodyAngle, trueAnomalyDeg: nu * 180 / Math.PI };
  }

  // ── SVG pixel radius from distance ─────────────────────────────────
  // Planets: a in AU → sqrt(AU) scale
  // Moons:   a in km → sqrt(km/1000) scale
  function distanceToPixelR(a, isKm) {
    if (isKm) {
      return Math.sqrt(a / 1000) * 3.0;
    }
    return Math.sqrt(a) * 50;
  }

  // ── Fetch ──────────────────────────────────────────────────────────
  var plugin = {
    name: 'orbital',

    fetch: function(dataSource) {
      if (!dataSource || !dataSource.center || !dataSource.bodies) {
        return null;
      }

      var centerKey = dataSource.center.toLowerCase().replace(/[^a-z]/g, '');
      var tableType = CENTER_TABLES[centerKey] || 'planets';
      var table = tableType === 'planets' ? PLANETS : MOONS;

      var now = Date.now();
      var daysSinceJ2000 = (now - J2000_MS) / MS_PER_DAY;

      var result = {
        center: dataSource.center,
        series: [],
      };

      for (var bi = 0; bi < dataSource.bodies.length; bi++) {
        var body = dataSource.bodies[bi];
        var bodyName = (body.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        var elKey = ALIASES[bodyName];
        if (!elKey) continue;

        var el = table[elKey];
        if (!el) {
          // Try the other table
          var otherTable = tableType === 'planets' ? MOONS : PLANETS;
          el = otherTable[elKey];
        }
        if (!el) continue;

        var pos = solveKepler(el, daysSinceJ2000);

        // Value: approximate magnitude weight from radius
        var val = Math.round(Math.sqrt(el.a) * (el.isKm ? 0.08 : 3));
        if (val < 1) val = 1;
        if (val > 20) val = 20;

        result.series.push({
          label: (LABELS[bodyName] || bodyName.toUpperCase()),
          r: distanceToPixelR(el.a, el.isKm),
          bodyAngle: pos.bodyAngle,
          eccentricity: el.e,
          omega: el.w,
          boldArc: body.boldArc || 45,
          markers: body.markers || [],
          value: body.value || val,
        });
      }

      return result;
    },
  };

  window.HAL.data.sources.orbital = plugin;

})();
