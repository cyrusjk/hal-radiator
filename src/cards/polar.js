// ═══════════════════════════════════════════════════════════════════════
//  Polar / Radar Chart Card
//  — Concentric rings with radial spokes and data polygons
//  — Each series defines values mapped to equal-angle spokes
//  — Animation groups: header, footer, rings, spokes, dataPolygons
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['polar'] = {

  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var ns = window.HAL.svg.ns;
    var fg = window.HAL.svg.fg;

    var series = (data.series || []);
    if (series.length === 0) { if (onDone) onDone(); return; }

    // ── Layout ────────────────────────────────────────────────────────
    var cx = 500, cy = 400;     // chart centre
    var radius = 260;           // max ring radius
    var nRings = 5;             // concentric rings
    var nSpokes = 8;            // radial divisions
    var angleStep = (2 * Math.PI) / nSpokes;

    // Max value across all series for normalisation
    var maxVal = 1;
    for (var si = 0; si < series.length; si++) {
      var sv = series[si].values || [];
      for (var vi = 0; vi < sv.length; vi++) {
        if (sv[vi] > maxVal) maxVal = sv[vi];
      }
    }

    // ── Card background ───────────────────────────────────────────────
    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color }));

    // ── Header ────────────────────────────────────────────────────────
    var header = e('text', {
      x: 20, y: 25, fill: fg('frame', 1.9), 'font-size': 14,
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    svgEl.appendChild(header);

    // ── Footer ────────────────────────────────────────────────────────
    var footer = e('text', {
      x: 20, y: 735, fill: fg('frame', 0.85), 'font-size': 10,
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    footer.textContent = data.label || '';
    svgEl.appendChild(footer);

    // ── Helper: polar to cartesian ────────────────────────────────────
    function polar(r, angle) {
      return { x: cx + r * Math.sin(angle), y: cy - r * Math.cos(angle) };
    }

    // ── Rings ─────────────────────────────────────────────────────────
    var ringElements = [];

    for (var ri = 1; ri <= nRings; ri++) {
      var r = (ri / nRings) * radius;
      var pathD = '';
      for (var a = 0; a <= 360; a += 5) {
        var rad = a * Math.PI / 180;
        var p = polar(r, rad);
        pathD += (a === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }
      var ring = e('path', {
        d: pathD, fill: 'none',
        stroke: 'rgba(255,255,255,' + ((vis.frameBrightness||0.4) * (0.15 + ri * 0.05)).toFixed(2) + ')',
        'stroke-width': 0.5,
      });
      svgEl.appendChild(ring);
      ringElements.push(ring);

      // Ring value label (on the right side)
      if (ri < nRings) {
        var rl = polar(r, 0);
        var rv = e('text', {
          x: rl.x + 4, y: rl.y + 3,
          fill: fg('frame', 0.6), 'font-size': 9,
          'font-family': labelFont,
        });
        rv.textContent = Math.round((ri / nRings) * maxVal);
        svgEl.appendChild(rv);
        ringElements.push(rv);
      }
    }

    // ── Spokes ────────────────────────────────────────────────────────
    var spokeElements = [];

    for (var si = 0; si < nSpokes; si++) {
      var angle = si * angleStep;
      var p = polar(radius, angle);
      var spoke = e('line', {
        x1: cx, y1: cy, x2: p.x, y2: p.y,
        stroke: fg('frame', 0.2), 'stroke-width': 0.5,
      });
      svgEl.appendChild(spoke);
      spokeElements.push(spoke);

      // Spoke label (at the outer edge)
      var lp = polar(radius + 22, angle);
      var lbl = e('text', {
        x: lp.x, y: lp.y + 3,
        fill: fg('frame', 0.75), 'font-size': 9,
        'font-family': labelFont, 'text-anchor': 'middle',
      });
      lbl.textContent = String(si + 1);
      svgEl.appendChild(lbl);
      spokeElements.push(lbl);
    }

    // ── Data polygons ─────────────────────────────────────────────────
    var polygonElements = [];

    for (var si = 0; si < series.length; si++) {
      var sv = series[si].values || [];
      var pathD = '';
      var alpha = 0.3 + si * 0.2;

      for (var vi = 0; vi < sv.length && vi < nSpokes; vi++) {
        var r = (sv[vi] / maxVal) * radius;
        var angle = vi * angleStep;
        var p = polar(r, angle);
        pathD += (vi === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }
      // Close the polygon back to first point
      if (sv.length >= 2) {
        var p0 = polar((sv[0] / maxVal) * radius, 0);
        pathD += 'Z';
        // We need to include the closing part; rebuild with explicit close
        pathD = '';
        for (var vi = 0; vi < sv.length && vi < nSpokes; vi++) {
          var r = (sv[vi] / maxVal) * radius;
          var angle = vi * angleStep;
          var p = polar(r, angle);
          pathD += (vi === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
        }
        // Close
        var firstR = (sv[0] / maxVal) * radius;
        var firstP = polar(firstR, 0);
        pathD += 'L' + firstP.x.toFixed(1) + ',' + firstP.y.toFixed(1);
      }

      var poly = e('path', {
        d: pathD,
        fill: 'rgba(255,255,255,' + ((vis.dataBrightness||0.8) * (0.1 + si * 0.05)).toFixed(2) + ')',
        stroke: 'rgba(255,255,255,' + ((vis.dataBrightness||0.8) * (0.38 + si * 0.25)).toFixed(2) + ')',
        'stroke-width': 1.2,
      });
      svgEl.appendChild(poly);
      polygonElements.push(poly);
    }

    // ── Group map ─────────────────────────────────────────────────────
    var groupMap = {};
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.rings = ringElements;
    groupMap.spokes = spokeElements;
    groupMap.dataPolygons = polygonElements;

    // ── Animation ─────────────────────────────────────────────────────
    var defaults = [
      { action: 'appear',     groups: ['header', 'footer'] },
      { action: 'wait',       duration: 800 },
      { action: 'appear',     groups: ['rings'], order: 'sequential', gap: 150 },
      { action: 'appear',     groups: ['spokes'], order: 'simultaneous' },
      { action: 'wait',       duration: 600 },
      { action: 'appear',     groups: ['dataPolygons'], order: 'sequential', gap: 500 },
      { action: 'wait',       duration: 8000 },
      { action: 'disappear',  groups: ['dataPolygons'], order: 'sequential', gap: 300 },
      { action: 'wait',       duration: 300 },
      { action: 'disappear',  groups: ['spokes'], order: 'simultaneous' },
      { action: 'disappear',  groups: ['rings'], order: 'sequential', gap: 100 },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },

};
