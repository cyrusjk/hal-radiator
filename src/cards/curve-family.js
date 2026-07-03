// ═══════════════════════════════════════════════════════════════════════
//  Curve-Family Chart Card
//  — Multi-band curve charts with flicker/pop/pongback animation
// ═══════════════════════════════════════════════════════════════════════

const HAL = window.HAL || {};

HAL.cards = HAL.cards || {};

HAL.cards.curveFamily = {

  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var cfg = HAL_CONFIG.visual;
    var chart = cfg.chart;
    var fonts = cfg.fonts;
    var e = HAL.svg.el;
    var findExtrema = HAL.svg.findExtrema;

    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color }));

    var x0 = chart.x0, y0 = chart.y0, w = chart.w, h = chart.h;
    var groups = data.groups;
    var nGroups = groups.length;
    var bandH = h / nGroups;

    // Grid per band
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

    svgEl.appendChild(e('line', {
      x1: x0, y1: y0, x2: x0, y2: y0 + h,
      stroke: 'rgba(255,255,255,0.4)', 'stroke-width': 1,
    }));

    // Collect elements for animation
    var curveGroups = [];
    var minLabels = [];
    var maxLabels = [];
    var segs = chart.dataPts - 1;

    for (var gi = 0; gi < nGroups; gi++) {
      var g = groups[gi];
      var bandTop = y0 + bandH * gi;
      var bandBot = bandTop + bandH;

      var groupMax = 0;
      for (var si = 0; si < g.series.length; si++) {
        var s = g.series[si];
        for (var pi = 0; pi < s.values.length; pi++) {
          if (s.values[pi] > groupMax) groupMax = s.values[pi];
        }
      }
      if (groupMax === 0) groupMax = 1;

      var scaleY = function(v) { return bandBot - (v / groupMax) * bandH * 0.85; };
      var scaleX = function(i) { return x0 + (i / segs) * w; };

      // Group name label
      svgEl.appendChild(e('text', {
        x: x0, y: bandTop + 14, fill: 'rgba(255,255,255,0.7)',
        'font-family': fonts.label, 'font-size': 11,
      })).textContent = g.name;

      // Container group for all curves in this band
      var grp = document.createElementNS(HAL.svg.ns, 'g');
      grp.style.opacity = '0';

      for (var si = 0; si < g.series.length; si++) {
        var s = g.series[si];

        var d = '';
        var pts = [];
        for (var pi = 0; pi < s.values.length; pi++) {
          var x = scaleX(pi);
          var y = scaleY(s.values[pi]);
          pts.push({ x: x, y: y });
          d += (pi === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
        }

        var pathAttrs = { d: d, fill: 'none', stroke: 'rgba(255,255,255,0.8)',
                          'stroke-width': chart.strokes[si] };
        if (chart.dashes[si]) pathAttrs['stroke-dasharray'] = chart.dashes[si];
        grp.appendChild(e('path', pathAttrs));

        var last = pts[pts.length - 1];
        grp.appendChild(e('circle', { cx: last.x.toFixed(1), cy: last.y.toFixed(1),
                                      r: 2, fill: 'rgba(255,255,255,0.8)' }));
        grp.appendChild(e('text', {
          x: last.x + 6, y: last.y + 4, fill: 'rgba(255,255,255,0.6)',
          'font-family': fonts.label, 'font-size': 10,
        })).textContent = s.label;

        // Hidden min/max value labels (outside the curve group)
        var ext = findExtrema(s.values, scaleX, scaleY);
        var pts2 = [ext.min, ext.max];
        for (var pi2 = 0; pi2 < pts2.length; pi2++) {
          var isMax = pi2 === 1;
          var pt = pts2[pi2];
          var lbl = e('text', {
            x: pt.x, y: pt.y - 12, fill: 'rgba(255,255,255,0.85)',
            'font-family': fonts.label, 'font-size': 14,
            'text-anchor': 'middle', opacity: 0,
          });
          lbl.textContent = pt.value;
          svgEl.appendChild(lbl);
          (isMax ? maxLabels : minLabels).push(lbl);
        }
      }

      svgEl.appendChild(grp);
      curveGroups.push(grp);

      if (gi < nGroups - 1) {
        svgEl.appendChild(e('line', {
          x1: x0, y1: bandBot, x2: x0 + w, y2: bandBot,
          stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 0.5,
        }));
      }
    }

    // Header
    var titleG = e('g', { transform: 'translate(500, 50) scale(0.9, 1.0)' });
    var titleT = e('text', {
      x: 0, y: 0, 'text-anchor': 'middle', fill: 'rgba(255,255,255,0.95)',
      'font-family': fonts.title, 'font-size': 28, 'font-weight': 'bold',
      'letter-spacing': 12, 'text-rendering': 'optimizeLegibility',
    });
    titleT.textContent = data.title;
    titleG.appendChild(titleT);
    svgEl.appendChild(titleG);

    var subG = e('g', { transform: 'translate(500, 720) scale(1.0, 0.4)' });
    var subT = e('text', {
      x: 0, y: 0, 'text-anchor': 'middle', fill: 'rgba(255,255,255,0.5)',
      'font-family': fonts.label, 'font-size': 28, 'letter-spacing': 2,
      'text-rendering': 'optimizeLegibility',
    });
    subT.textContent = data.label;
    subG.appendChild(subT);
    svgEl.appendChild(subG);

    // Start the animation pipeline
    HAL.cards.curveFamily.runAnimation(curveGroups, minLabels, maxLabels, onDone);
  },

  // ── Animation Pipeline ──────────────────────────────────────────────
  //  1. pause pause (grid + names visible)
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
    var timing = HAL_CONFIG.timing;
    var t = HAL.transitions;

    setTimeout(function() {
      t.flickerSeq(curveGroups, 'in', timing.groupGap, 0, function() {
        setTimeout(function() {
          HAL.svg.popAll(minLabels, true);
          HAL.svg.popAll(maxLabels, true);
          setTimeout(function() {
            HAL.svg.popAll(maxLabels, false);
            HAL.svg.popAll(minLabels, false);
            t.flickerSeq(curveGroups.slice().reverse(), 'out', timing.groupGap, 0, function() {
              if (onDone) onDone();
            });
          }, timing.valueHold);
        }, 2000);
      });
    }, timing.initialPause);
  },

};
