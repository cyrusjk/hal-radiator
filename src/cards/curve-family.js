// ═══════════════════════════════════════════════════════════════════════
//  Curve-Family Chart Card
//  — Multi-band curve charts with flicker/pop/pongback animation
//  — Each band is a row (e.g. API-GATEWAY) containing multiple curves
//  — Curve data must be pre-fetched via HAL.data.fetchCardData()
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards.curveFamily = {

  // ── Render ──────────────────────────────────────────────────────────
  // Builds the SVG: grid, axis, group labels, curve paths, endpoint dots,
  // percentile labels, min/max value labels, header, footer.
  // Then launches the animation pipeline.
  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var chart = window.HAL_CONFIG.visual.chart;
    var fonts = window.HAL_CONFIG.visual.fonts;
    var e = window.HAL.svg.el;

    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color }));

    var x0 = chart.x0, y0 = chart.y0, w = chart.w, h = chart.h;
    var segs = chart.dataPts - 1;
    var groups = data.groups;
    var nGroups = groups.length;
    var bandH = h / nGroups;

    // ── Draw grid lines per band ──────────────────────────────────────
    // Each band has 4 horizontal rows. The top row is slightly brighter
    // (acts as the band header line). Grid stops at 70% of chart width
    // to leave space for curve labels on the right.
    for (var gi = 0; gi < nGroups; gi++) {
      var bandTop = y0 + bandH * gi;
      for (var row = 0; row <= 4; row++) {
        var gy = bandTop + (bandH / 4) * row;
        svgEl.appendChild(e('line', {
          x1: x0, y1: gy, x2: x0 + w * 0.7, y2: gy,
          stroke: row === 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
          'stroke-width': 0.5,
        }));
      }
    }

    // ── Y-axis ────────────────────────────────────────────────────────
    svgEl.appendChild(e('line', {
      x1: x0, y1: y0, x2: x0, y2: y0 + h,
      stroke: 'rgba(255,255,255,0.4)', 'stroke-width': 1,
    }));

    var curveGroups = [];  // <g> per band, hidden initially, flickered in/out
    var minLabels = [];    // text elements for min values (popped on/off)
    var maxLabels = [];    // text elements for max values

    // ── Draw curves per group/band ────────────────────────────────────
    for (var gi = 0; gi < nGroups; gi++) {
      var g = groups[gi];
      var bandTop = y0 + bandH * gi;
      var bandBot = bandTop + bandH;

      // Scale within this band: each band normalised to its own max,
      // so groups with different orders of magnitude don't distort each other.
      var groupMax = 0;
      for (var si = 0; si < g.series.length; si++)
        for (var pi = 0; pi < g.series[si].values.length; pi++)
          if (g.series[si].values[pi] > groupMax) groupMax = g.series[si].values[pi];
      if (groupMax === 0) groupMax = 1;

      var scaleY = function(v) { return bandBot - (v / groupMax) * bandH * 0.85; };
      var scaleX = function(i) { return x0 + (i / segs) * w; };

      // Group name label (static — not part of the flicker group)
      svgEl.appendChild(e('text', {
        x: x0, y: bandTop + 14, fill: 'rgba(255,255,255,0.7)',
        'font-family': fonts.label, 'font-size': 11,
      })).textContent = g.name;

      // Container for this band's curves — hidden initially,
      // revealed via blink animation during the pipeline.
      var grp = document.createElementNS(window.HAL.svg.ns, 'g');
      grp.style.opacity = '0';

      for (var si = 0; si < g.series.length; si++) {
        var s = g.series[si];

        // Build path data string
        var pts = [];
        var d = '';
        for (var pi = 0; pi < s.values.length; pi++) {
          var x = scaleX(pi);
          var y = scaleY(s.values[pi]);
          pts.push({ x: x, y: y });
          d += (pi === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        var last = pts[pts.length - 1];

        // Curve path (line hierarchy: highest percentile = thickest solid)
        var pa = { d: d, fill: 'none', stroke: 'rgba(255,255,255,0.8)',
                   'stroke-width': chart.strokes[si] };
        if (chart.dashes[si]) pa['stroke-dasharray'] = chart.dashes[si];
        grp.appendChild(e('path', pa));

        // Endpoint dot
        grp.appendChild(e('circle', { cx: last.x.toFixed(1), cy: last.y.toFixed(1),
                                      r: 2, fill: 'rgba(255,255,255,0.8)' }));
        // Endpoint label (percentile name)
        var endLbl = e('text', {
          x: last.x + 6, y: last.y + 4, fill: 'rgba(255,255,255,0.6)',
          'font-family': fonts.label, 'font-size': 10,
        });
        endLbl.textContent = s.label;
        grp.appendChild(endLbl);

        // Hidden min/max value labels (outside the curve group —
        // they pop separately during the animation pipeline)
        var ext = window.HAL.svg.findExtrema(s.values, scaleX, scaleY);
        [ext.min, ext.max].forEach(function(pt, isMaxIdx) {
          var isMax = isMaxIdx === 1;
          var lbl = e('text', {
            x: pt.x, y: pt.y - 12, fill: 'rgba(255,255,255,0.85)',
            'font-family': fonts.label, 'font-size': 14,
            'text-anchor': 'middle', opacity: 0,
          });
          lbl.textContent = pt.value;
          svgEl.appendChild(lbl);
          (isMax ? maxLabels : minLabels).push(lbl);
        });
      }

      svgEl.appendChild(grp);
      curveGroups.push(grp);

      // Subtle separator between bands
      if (gi < nGroups - 1) {
        svgEl.appendChild(e('line', {
          x1: x0, y1: bandBot, x2: x0 + w, y2: bandBot,
          stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 0.5,
        }));
      }
    }

    // ── Header (card title) ────────────────────────────────────────────
    var titleG = e('g', { transform: 'translate(500, 50) scale(0.9, 1.0)' });
    var titleT = e('text', {
      x: 0, y: 0, 'text-anchor': 'middle', fill: 'rgba(255,255,255,0.95)',
      'font-family': fonts.title, 'font-size': 28, 'font-weight': 'bold',
      'letter-spacing': 12, 'text-rendering': 'optimizeLegibility',
    });
    titleT.textContent = data.title;
    titleG.appendChild(titleT);
    svgEl.appendChild(titleG);

    // ── Footer (card label) ───────────────────────────────────────────
    var subG = e('g', { transform: 'translate(500, 720) scale(1.0, 0.4)' });
    var subT = e('text', {
      x: 0, y: 0, 'text-anchor': 'middle', fill: 'rgba(255,255,255,0.5)',
      'font-family': fonts.label, 'font-size': 28, 'letter-spacing': 2,
      'text-rendering': 'optimizeLegibility',
    });
    subT.textContent = data.label;
    subG.appendChild(subT);
    svgEl.appendChild(subG);

    // ── Launch animation pipeline ─────────────────────────────────────
    window.HAL.cards.curveFamily.runAnimation(curveGroups, minLabels, maxLabels, onDone);
  },

  // ── Animation Pipeline ──────────────────────────────────────────────
  //  1. pause (grid + names visible)
  //  2. groups flicker in (top→bottom, with groupGap between)
  //  3. pause 2s
  //  4. pop in ALL mins at once
  //  5. pop in ALL maxes at once
  //  6. pause valueHold
  //  7. pop out ALL maxes
  //  8. pop out ALL mins
  //  9. groups flicker out (bottom→top, with groupGap between)
  // ═════════════════════════════════════════════════════════════════════
  runAnimation: function(curveGroups, minLabels, maxLabels, onDone) {
    var timing = window.HAL_CONFIG.timing;
    var t = window.HAL.transitions;

    setTimeout(function() {
      t.flickerSeq(curveGroups, 'in', timing.groupGap, 0, function() {
        setTimeout(function() {
          window.HAL.svg.popAll(minLabels, true);
          window.HAL.svg.popAll(maxLabels, true);
          setTimeout(function() {
            window.HAL.svg.popAll(maxLabels, false);
            window.HAL.svg.popAll(minLabels, false);
            t.flickerSeq(curveGroups.slice().reverse(), 'out', timing.groupGap, 0, function() {
              if (onDone) onDone();
            });
          }, timing.valueHold);
        }, 2000);
      });
    }, timing.initialPause);
  },

};
