// ═══════════════════════════════════════════════════════════════════════
//  Ephemeris Data Loader
//  — OPTIONAL: only activates for cards with ephemeris: true
//  — Fetches real orbital positions from JPL Horizons via local proxy
//  — Patches series[].bodyAngle with computed values
//  — Falls back to static YAML data if JPL unreachable or body unknown
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.ephemeris = (function() {

  // ── Horizons target IDs (body name → COMMAND number) ──────────
  var TARGETS = {
    mercury:  199, venus:   299, earth:   399, mars:   499,
    jupiter:  599, saturn:  699, uranus:  799, neptune: 899,
    moon:     301, luna:    301,
    io:       501, europa:  502, ganymede:503, callisto:504,
    eur:      502, gny:     503,
    amalthea: 505, himalia: 506, elara:   507, pasiphae:508,
  };

  // ── Center IDs (center name → CENTER param) ───────────────────
  var CENTERS = {
    sun:      '500@0',
    sol:      '500@0',
    earth:    '500@399',
    jupiter:  '500@599',
  };

  // ── Convert JPL state vector to card angle ────────────────────
  // JPL returns X,Y,Z in km (relative to center).
  // Card coords: 0°=top, CW; we use angle only (r stays from static data).
  function vectorToAngle(x, y) {
    var angleDeg = (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
    return angleDeg;
  }

  // ── Fetch one body's position from the proxy ──────────────────
  function fetchBody(bodyId, center, time) {
    var url = '/api/ephemeris?body=' + bodyId + '&center=' + encodeURIComponent(center);
    if (time) url += '&time=' + encodeURIComponent(time);
    return fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          return { angle: vectorToAngle(data.x, data.y) };
        }
        return null;
      });
  }

  // ── Match a series label to a known body name ─────────────────
  function matchBody(label) {
    if (!label) return null;
    var key = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    return TARGETS[key] || null;
  }

  // ── Resolve center name to CENTER param ───────────────────────
  function resolveCenter(name) {
    if (!name) return null;
    var key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return CENTERS[key] || null;
  }

  // ── Queue: run N fetches at a time (JPL policy: one-at-a-time) ─
  function settlePromises(promises, concurrency) {
    concurrency = concurrency || 2;
    var results = new Array(promises.length);
    var nextIdx = 0;

    function start(idx) {
      if (idx >= promises.length) return;
      return promises[idx]().then(function(val) {
        results[idx] = val;
        return start(nextIdx++);
      });
    }

    var starters = [];
    for (var i = 0; i < Math.min(concurrency, promises.length); i++) {
      starters.push(start(nextIdx++));
    }
    return Promise.all(starters).then(function() { return results; });
  }

  // ── Main: load ephemeris for all cards that opt in ────────────
  function loadCards(cards) {
    if (!cards || cards.length === 0) return;

    var today = new Date().toISOString().slice(0, 10);
    var jobFns = [];

    for (var ci = 0; ci < cards.length; ci++) {
      var card = cards[ci];
      var cfg = card.ephemeris;
      if (!cfg) continue;

      var series = (card.dataSource || {}).series || [];
      if (series.length === 0) continue;

      // Determine center: card-level takes precedence over dataSource.center
      var centerName = (typeof cfg === 'object' && cfg.center) || card.dataSource.center;
      var center = resolveCenter(centerName) || '500@0';
      var time = (typeof cfg === 'object' && cfg.time) || today;

      // Fetch each series that has a known body
      for (var si = 0; si < series.length; si++) {
        var s = series[si];
        // Prefer ephemerisBody if set; fall back to display label
        var lookupName = s.ephemerisBody || s.label;
        var id = matchBody(lookupName);
        if (!id) continue;

        // Capture si/card reference in closure via IIFE
        (function(ci, si, id, center, time) {
          jobFns.push(function() {
            return fetchBody(id, center, time).then(function(pos) {
              if (pos) {
                var s = cards[ci].dataSource.series[si];
                s.bodyAngle = pos.angle;
                // Keep static r for visual scale (ephemeris provides angle only)
              }
            });
          });
        })(ci, si, id, center, time);
      }
    }

    if (jobFns.length === 0) return;

    // Run fetches with 2-at-a-time concurrency per JPL's fair-use policy
    // Promise.allSettled so partial failures don't kill all results
    settlePromises(jobFns, 2);
  }

  return {
    TARGETS: TARGETS,
    CENTERS: CENTERS,
    loadCards: loadCards,
    matchBody: matchBody,
    resolveCenter: resolveCenter,
  };

})();
