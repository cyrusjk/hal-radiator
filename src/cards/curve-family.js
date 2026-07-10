// ═══════════════════════════════════════════════════════════════════════
//  Curve-Family Chart Card
//  — Multi-band curve charts with config-driven animation
//  — Each band is a row (e.g. API-GATEWAY) containing multiple curves
//  — Brightness uses fg('frame', mult) and fg('data', mult)
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['curve-family'] = {

  render: function(data, onDone) {
    var svgEl = data._container || document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var vc = vis.chart || {};
    var x0 = vc.x0 || 80, y0 = vc.y0 || 70;
    var cw = vc.w || 700, ch = vc.h || 520;
    var strokes = vc.strokes || [1.5, 1.0, 0.7];
    var dashes = vc.dashes || [null, "4,3", "1,3"];
    var titleFont = (vis.fonts || {}).title || 'sans-serif';
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    var ns = window.HAL.svg.ns;
    var e = window.HAL.svg.el;

    var groupsData = data.groups || [];
    var nGroups = groupsData.length;
    if (nGroups === 0) { if (onDone) onDone(); return; }

    // Use actual data point count from fetched data (not vc.actualPts)
    // so VictoriaMetrics can return arbitrary-density points.
    var actualPts = (groupsData[0].series && groupsData[0].series[0] && groupsData[0].series[0].values)
      ? groupsData[0].series[0].values.length
      : (vc.actualPts || 9);
    if (actualPts < 2) { if (onDone) onDone(); return; }

    var margin = 60;
    var gridW = cw;
    var gridH = ch / nGroups;
    var bandH = gridH;
    var leftAxis = 80;
    var rightLabel = 140;

    // ── Group map — collected by the renderer for the animation engine ──
    var groupMap = {};
    var curveGroups = [];       // bands (one <g> per band)
    var minLabels = [];         // min value text elements
    var maxLabels = [];         // max value text elements
    var gridLines = [];         // horizontal grid lines (band separators)
    var verticalLines = [];     // vertical data column lines (sweep targets)
    var groupLabels = [];       // band/group name text elements

    // ── Card background ───────────────────────────────────────────────
    if (!data._container) svgEl.innerHTML = '';
    var bg = e('rect', { x: 0, y: 0, width: data.w || 1000, height: data.h || 750, fill: data.color });
    svgEl.appendChild(bg);

    // ── Header (title) ────────────────────────────────────────────────
    var header = e('text', {
      x: 20, y: 25, fill: fg('frame', 1.9), 'font-size': fs(14), 'font-family': labelFont,
      'text-rendering': 'optimizeLegibility',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    header.style.opacity = '0';
    svgEl.appendChild(header);

    // ── Grid + bands ──────────────────────────────────────────────────
    var gridG = e('g');
    svgEl.appendChild(gridG);
    var bandG = e('g');
    svgEl.appendChild(bandG);

    for (var gi = 0; gi < nGroups; gi++) {
      var g = groupsData[gi];
      var bandTop = gi * gridH;
      var series = g.series || [];

      // Band separator
      if (gi > 0) {
        gridLines.push(e('line', {
          x1: x0, y1: bandTop, x2: x0 + gridW, y2: bandTop,
          stroke: fg('frame', 0.2), 'stroke-width': 1,
        }));
      }

      // Fixed rows: find global max across all series in this band
      var bandMax = 1;
      for (var si = 0; si < series.length; si++) {
        var sv = series[si].values || [];
        for (var vi = 0; vi < sv.length; vi++) {
          if (sv[vi] > bandMax) bandMax = sv[vi];
        }
      }

      // Group label
      var glabel = e('text', {
        x: 15, y: bandTop + bandH / 2 + 4, fill: fg('frame', 1.0),
        'font-size': fs(11), 'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      });
      glabel.textContent = g.name;
      glabel.style.opacity = '0';
      svgEl.appendChild(glabel);
      groupLabels.push(glabel);

      // Data columns (vertical grid lines — sweep targets)
      for (var vi = 0; vi < actualPts; vi++) {
        var px = x0 + (vi / (actualPts - 1)) * gridW;
        verticalLines.push(e('line', {
          x1: px, y1: bandTop, x2: px, y2: bandTop + bandH,
          stroke: fg('frame', 0.12), 'stroke-width': 1,
        }));
      }

      // ── Container for this band's curves — hidden initially ─────────
      var grp = document.createElementNS(ns, 'g');
      grp.style.opacity = '0';
      bandG.appendChild(grp);

      // Draw each series
      for (var si = 0; si < series.length; si++) {
        var sv = series[si].values || [];
        var pathParts = [];
        for (var vi = 0; vi < sv.length && vi < actualPts; vi++) {
          var px = x0 + (vi / (actualPts - 1)) * gridW;
          var py = bandTop + bandH - (sv[vi] / bandMax) * (bandH - 20) - 10;
          pathParts.push((vi === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1));
        }

        var strokeW = strokes[si % strokes.length] || 1.0;
        var dash = dashes[si % dashes.length];
        var pathAttrs = {
          d: pathParts.join(' '),
          fill: 'none',
          stroke: fg('data', 0.5 + si * 0.25),
          'stroke-width': strokeW,
        };
        if (dash) pathAttrs['stroke-dasharray'] = dash;
        grp.appendChild(e('path', pathAttrs));

        // Endpoint dot + value label
        var last = sv[Math.min(sv.length, actualPts) - 1];
        var lx = x0 + gridW;
        var ly = bandTop + bandH - (last / bandMax) * (bandH - 20) - 10;

        grp.appendChild(e('circle', {
          cx: lx, cy: ly, r: 2.5, fill: fg('data', 0.65),
        }));

        var serLabel = e('text', {
          x: lx + 6, y: ly + 3, fill: fg('data', 0.65),
          'font-size': fs(10), 'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
        });
        serLabel.textContent = series[si].label;
        grp.appendChild(serLabel);

        // Find min/max for value labels
        var minVal = sv[0], maxVal = sv[0];
        var minIdx = 0, maxIdx = 0;
        for (var mvi = 1; mvi < sv.length; mvi++) {
          if (sv[mvi] < minVal) { minVal = sv[mvi]; minIdx = mvi; }
          if (sv[mvi] > maxVal) { maxVal = sv[mvi]; maxIdx = mvi; }
        }

        var mlx = x0 + (minIdx / (actualPts - 1)) * gridW;
        var mly = bandTop + bandH - (minVal / bandMax) * (bandH - 20) - 10;
        var mn = e('text', {
          x: mlx, y: mly - 12, fill: fg('data', 1.1), 'font-size': fs(14),
          'font-family': labelFont, 'text-anchor': 'middle', 'text-rendering': 'optimizeLegibility',
        });
        mn.style.opacity = '0';
        mn.textContent = minVal.toFixed(1);
        svgEl.appendChild(mn);
        minLabels.push(mn);

        var mlx2 = x0 + (maxIdx / (actualPts - 1)) * gridW;
        var mly2 = bandTop + bandH - (maxVal / bandMax) * (bandH - 20) - 10;
        var mx = e('text', {
          x: mlx2, y: mly2 - 12, fill: fg('data', 1.1), 'font-size': fs(14),
          'font-family': labelFont, 'text-anchor': 'middle', 'text-rendering': 'optimizeLegibility',
        });
        mx.style.opacity = '0';
        mx.textContent = maxVal.toFixed(1);
        svgEl.appendChild(mx);
        maxLabels.push(mx);
      }

      curveGroups.push(grp);
    }

    // Add grid lines (behind everything)
    gridG.style.opacity = '0';
    for (var gli = 0; gli < gridLines.length; gli++) {
      gridG.appendChild(gridLines[gli]);
    }
    // Vertical lines — stored as array for sequential draw sweep
    // so executePhases expands each child into its own element for drawOne.
    var verticalG = e('g');
    svgEl.insertBefore(verticalG, bandG);
    for (var vli = 0; vli < verticalLines.length; vli++) {
      verticalG.appendChild(verticalLines[vli]);
    }

    // ── Footer ────────────────────────────────────────────────────────
    var footer = e('text', {
      x: 15, y: 740, fill: fg('frame', 0.85), 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // ── Build the group map for the animation engine ──────────────────
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.verticalLines = verticalLines;
    groupMap.grid = gridG;
    groupMap.groupLabels = groupLabels;
    groupMap.bands = curveGroups;
    groupMap.minValues = minLabels;
    groupMap.maxValues = maxLabels;

    // ── Start the animation ───────────────────────────────────────────
    var defaults = [
      { action: 'appear',     groups: ['header', 'footer', 'grid', 'groupLabels'] },
      { action: 'wait',       duration: window.HAL_CONFIG.timing.initialPause || 5000 },
      { action: 'flickerIn',  groups: ['bands'], order: 'sequential', gap: window.HAL_CONFIG.timing.groupGap },
      { action: 'wait',       duration: 2000 },
      { action: 'appear',     groups: ['minValues'] },
      { action: 'appear',     groups: ['maxValues'] },
      { action: 'wait',       duration: window.HAL_CONFIG.timing.valueHold || 5000 },
      { action: 'disappear',  groups: ['maxValues'] },
      { action: 'disappear',  groups: ['minValues'] },
      { action: 'flickerOut', groups: ['bands'], order: 'sequential', gap: window.HAL_CONFIG.timing.groupGap },
      { action: 'wait',       duration: 300 },
      { action: 'disappear',  groups: ['header', 'footer', 'grid', 'groupLabels'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },

};
