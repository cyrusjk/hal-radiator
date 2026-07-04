// ═══════════════════════════════════════════════════════════════════════
//  Curve-Family 3D — Isometric 3D terrain of three load curves
//  — X axis: time (left→right at 30°)
//  — Y axis: load value (vertical)
//  — Z axis: depth (front→back at 150°)
//  — All axes are equally scaled (true isometric, no vanishing point)
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['curve-family-3d'] = {

  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var vc = vis.chart || {};
    var dataPts = vc.dataPts || 9;
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;
    var e = window.HAL.svg.el;

    var groupsData = data.groups || [];
    var allSeries = [];
    for (var gi = 0; gi < groupsData.length; gi++) {
      var series = (groupsData[gi].series || []);
      for (var si = 0; si < series.length; si++) {
        allSeries.push({ label: series[si].label, values: series[si].values || [] });
      }
    }
    if (allSeries.length === 0) { if (onDone) onDone(); return; }

    var groupMap = {};
    var curveGroups = [];

    // Background
    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color }));

    // Header / footer
    var header = e('text', { x: 20, y: 25, fill: fg('frame', 1.9), 'font-size': fs(14), 'font-family': labelFont, 'text-rendering': 'optimizeLegibility' });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    header.style.opacity = '0';
    svgEl.appendChild(header);

    var footer = e('text', { x: 15, y: 740, fill: fg('frame', 0.85), 'font-size': fs(10), 'font-family': labelFont, 'text-rendering': 'optimizeLegibility' });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // Global max
    var globalMax = 1;
    for (var si = 0; si < allSeries.length; si++) {
      for (var vi = 0; vi < allSeries[si].values.length; vi++) {
        if (allSeries[si].values[vi] > globalMax) globalMax = allSeries[si].values[vi];
      }
    }
    globalMax = Math.ceil(globalMax * 1.3);
    if (globalMax < 2) globalMax = 2;

    // ── Isometric projection ───────────────────────────────────────
    // X (time index) → screen: right + up at 30°
    // Y (load value) → screen: straight up  
    // Z (depth)      → screen: left + up at 30°
    //
    //   sx = ox + px * xSp - pz * zSp
    //   sy = oy - py * ySp + (px + pz) * diagSp
    //
    // diagSp is the vertical component of the diagonal axes.

    var ox = 420, oy = 240;           // origin (top-front corner, centered wider & higher for deep Z)
    var xSp = Math.min(70, 650 / (dataPts - 1));   // adaptive X spacing
    var zSp = 200;                      // depth spacing (horizontal shift per Z level)
    var ySp = 150 / globalMax;         // vertical scaling for load value
    var diagSp = Math.min(80, 1000 / (dataPts + dataPts));  // adaptive diagonal (Z vertical component)

    function project(px, py, pz) {
      return {
        sx: ox + px * xSp - pz * zSp,
        sy: oy - py * ySp + (px + pz) * diagSp,
      };
    }

    var nCurves = allSeries.length;

    // ── Scaled chart area (80% of original) ──────────────────────────
    var chartArea = e('g');
    chartArea.setAttribute('transform', 'translate(500,375) scale(0.8) translate(-500,-375)');
    svgEl.appendChild(chartArea);

    // ── Isometric grid ────────────────────────────────────────────
    var gridG = e('g');
    gridG.style.opacity = '0';
    chartArea.appendChild(gridG);

    // Floor grid: X-Z plane at y=0
    // Lines along X axis (time) at each Z depth
    for (var zi = 0; zi < nCurves - 1; zi++) {
      var pL = project(0, 0, zi);
      var pR = project(dataPts - 1, 0, zi);
      gridG.appendChild(e('line', {
        x1: pL.sx, y1: pL.sy, x2: pR.sx, y2: pR.sy,
        stroke: fg('frame', 0.55 - zi * 0.1), 'stroke-width': 0.7 - zi * 0.15,
      }));
    }
    // Last Z baseline
    var pL = project(0, 0, nCurves - 1);
    var pR = project(dataPts - 1, 0, nCurves - 1);
    gridG.appendChild(e('line', {
      x1: pL.sx, y1: pL.sy, x2: pR.sx, y2: pR.sy,
      stroke: fg('frame', 0.25), 'stroke-width': 0.4,
    }));

    // Lines along Z axis at each time step + labels
    for (var vi = 0; vi < dataPts; vi++) {
      var pF = project(vi, 0, 0);
      var pB = project(vi, 0, nCurves - 1);
      gridG.appendChild(e('line', {
        x1: pF.sx, y1: pF.sy, x2: pB.sx, y2: pB.sy,
        stroke: fg('frame', 0.5 - 0.1 * (vi / dataPts)), 'stroke-width': 0.5,
      }));
      // Time step label at the front edge of each Z line
      gridG.appendChild(e('text', {
        x: pF.sx - 6, y: pF.sy + 14,
        fill: fg('frame', 0.35),
        'font-size': fs(7),
        'font-family': labelFont, 'text-anchor': 'middle',
        'text-rendering': 'optimizeLegibility',
        textContent: vi,
      }));
    }

    // X-axis label at the far end of the front baseline
    var pXLabel = project(dataPts - 1, 0, 0);
    gridG.appendChild(e('text', {
      x: pXLabel.sx, y: pXLabel.sy + 22,
      fill: fg('frame', 0.45),
      'font-size': fs(8),
      'font-family': labelFont, 'text-anchor': 'middle',
      'text-rendering': 'optimizeLegibility',
      textContent: 'STEP',
    }));

    // Y-axis label at the top of the reference line
    var pYLabel = project(0, globalMax, 0);
    gridG.appendChild(e('text', {
      x: pYLabel.sx - 16, y: pYLabel.sy + 3,
      fill: fg('frame', 0.5),
      'font-size': fs(8),
      'font-family': labelFont, 'text-anchor': 'end',
      'text-rendering': 'optimizeLegibility',
      textContent: 'LOAD',
    }));

    // Vertical Y-axis reference at the front-left corner
    var pY0 = project(0, 0, 0);
    var pY1 = project(0, globalMax, 0);
    gridG.appendChild(e('line', {
      x1: pY0.sx, y1: pY0.sy, x2: pY1.sx, y2: pY1.sy,
      stroke: fg('frame', 0.7), 'stroke-width': 1.5,
    }));

    // Y-axis tick labels
    for (var li = 0; li <= 3; li++) {
      var lv = (globalMax / 3) * li;
      var pt = project(0, lv, 0);
      gridG.appendChild(e('text', {
        x: pt.sx - 10, y: pt.sy + 3,
        fill: fg('frame', 0.6),
        'font-size': fs(8),
        'font-family': labelFont, 'text-anchor': 'end',
        'text-rendering': 'optimizeLegibility',
        textContent: lv.toFixed(1),
      }));
    }

    // Series labels at the left end of each Z baseline
    for (var zi = 0; zi < nCurves; zi++) {
      var pL = project(0, 0, zi);
      gridG.appendChild(e('text', {
        x: pL.sx - 8, y: pL.sy + 4,
        fill: fg('frame', 0.45 + 0.2 * (nCurves - 1 - zi)),
        'font-size': fs(8 + (nCurves - 1 - zi) * 2),
        'font-family': labelFont, 'text-anchor': 'end',
        'text-rendering': 'optimizeLegibility',
        textContent: allSeries[zi].label,
      }));
    }

    // ── Curves ────────────────────────────────────────────────────
    for (var si = 0; si < nCurves; si++) {
      var sv = allSeries[si].values;
      if (sv.length === 0) continue;

      var isFront = (si === 0);
      var grp = e('g');
      grp.style.opacity = '0';
      chartArea.appendChild(grp);

      // Project all data points
      var pts = [];
      for (var vi = 0; vi < sv.length && vi < dataPts; vi++) {
        var p = project(vi, sv[vi], si);
        pts.push({ sx: p.sx, sy: p.sy, val: sv[vi] });
      }
      if (pts.length === 0) continue;

      // Drop-lines to the floor
      for (var pi = 0; pi < pts.length; pi++) {
        var base = project(pi, 0, si);
        grp.appendChild(e('line', {
          x1: base.sx, y1: base.sy, x2: pts[pi].sx, y2: pts[pi].sy,
          stroke: fg('data', isFront ? 0.25 : 0.08 + si * 0.04),
          'stroke-width': isFront ? 0.6 : 0.3,
        }));
      }

      // Data point markers
      for (var pi = 0; pi < pts.length; pi++) {
        grp.appendChild(e('circle', {
          cx: pts[pi].sx, cy: pts[pi].sy,
          r: isFront ? 3.5 : 2.0 - si * 0.3,
          fill: fg('data', 1.0 - si * 0.2),
        }));
      }

      // Curve path
      var pathD = '';
      for (var pi = 0; pi < pts.length; pi++) {
        pathD += (pi === 0 ? 'M' : 'L') + pts[pi].sx.toFixed(1) + ',' + pts[pi].sy.toFixed(1);
      }
      grp.appendChild(e('path', {
        d: pathD,
        fill: 'none',
        stroke: fg('data', 1.0 - si * 0.28),
        'stroke-width': 4.0 - si * 0.9,
      }));

      // Endpoint + label
      var last = pts[pts.length - 1];
      grp.appendChild(e('circle', {
        cx: last.sx, cy: last.sy,
        r: isFront ? 5 : 3 - si * 0.5,
        fill: fg('data', 1.0 - si * 0.15),
      }));
      grp.appendChild(e('text', {
        x: last.sx + 8, y: last.sy + 4,
        fill: fg('data', 1.0 - si * 0.2),
        'font-size': fs(isFront ? 12 : 9 - si),
        'font-family': labelFont,
        'text-rendering': 'optimizeLegibility',
        textContent: last.val.toFixed(2),
      }));

      // High / Low labels
      var highIdx = 0, lowIdx = 0;
      for (var pi = 1; pi < pts.length; pi++) {
        if (pts[pi].val > pts[highIdx].val) highIdx = pi;
        if (pts[pi].val < pts[lowIdx].val) lowIdx = pi;
      }
      if (highIdx !== lowIdx) {
        var hp = pts[highIdx], lp = pts[lowIdx];
        // High — short horizontal tick + label
        grp.appendChild(e('line', {
          x1: hp.sx - 8, y1: hp.sy, x2: hp.sx + 8, y2: hp.sy,
          stroke: fg('data', 1.0 - si * 0.15), 'stroke-width': 1.5,
        }));
        var ht = e('text', {
          x: hp.sx + 12, y: hp.sy,
          fill: fg('data', 1.0 - si * 0.15),
          'font-size': fs(isFront ? 15 : 12),
          'font-family': labelFont,
        });
        ht.textContent = 'H ' + hp.val.toFixed(1);
        grp.appendChild(ht);
        // Low — short horizontal tick + label
        grp.appendChild(e('line', {
          x1: lp.sx - 8, y1: lp.sy, x2: lp.sx + 8, y2: lp.sy,
          stroke: fg('data', 1.0 - si * 0.15), 'stroke-width': 1.5,
        }));
        var lt = e('text', {
          x: lp.sx + 12, y: lp.sy + 4,
          fill: fg('data', 1.0 - si * 0.15),
          'font-size': fs(isFront ? 15 : 12),
          'font-family': labelFont,
        });
        lt.textContent = 'L ' + lp.val.toFixed(1);
        grp.appendChild(lt);
      }

      // Connection to next curve (mesh surface)
      if (si < nCurves - 1) {
        var nextSv = allSeries[si + 1].values;
        for (var vi = 1; vi < sv.length && vi < dataPts; vi++) {
          var pA = project(vi, sv[vi], si);
          var pA0 = project(vi - 1, sv[vi - 1], si);
          var pB = project(vi, nextSv[Math.min(vi, nextSv.length - 1)], si + 1);
          var pB0 = project(vi - 1, nextSv[Math.min(vi - 1, nextSv.length - 1)], si + 1);
          // Triangle A
          grp.appendChild(e('polygon', {
            points: [
              pA0.sx.toFixed(1) + ',' + pA0.sy.toFixed(1),
              pA.sx.toFixed(1) + ',' + pA.sy.toFixed(1),
              pB.sx.toFixed(1) + ',' + pB.sy.toFixed(1),
            ].join(' '),
            fill: fg('data', 0.06 + si * 0.03),
            stroke: fg('frame', 0.04), 'stroke-width': 0.3,
          }));
          // Triangle B
          if (vi - 1 < nextSv.length && vi < nextSv.length) {
            grp.appendChild(e('polygon', {
              points: [
                pA0.sx.toFixed(1) + ',' + pA0.sy.toFixed(1),
                pB.sx.toFixed(1) + ',' + pB.sy.toFixed(1),
                pB0.sx.toFixed(1) + ',' + pB0.sy.toFixed(1),
              ].join(' '),
              fill: fg('data', 0.06 + si * 0.03),
              stroke: fg('frame', 0.04), 'stroke-width': 0.3,
            }));
          }
        }
      }

      curveGroups.push(grp);
    }

    // ── Animation ─────────────────────────────────────────────────
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.grid = gridG;
    groupMap.bands = curveGroups;

    var defaults = [
      { action: 'appear',     groups: ['header', 'footer', 'grid'] },
      { action: 'wait',       duration: 1000 },
      { action: 'appear',     groups: ['bands'], order: 'sequential', gap: 400 },
      { action: 'wait',       duration: 8000 },
      { action: 'disappear',  groups: ['bands'], order: 'sequential', gap: 200 },
      { action: 'wait',       duration: 300 },
      { action: 'disappear',  groups: ['header', 'footer', 'grid'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },
};
