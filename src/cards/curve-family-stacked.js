// ═══════════════════════════════════════════════════════════════════════
//  Curve-Family Stacked — Three mini chart panes, one per series
//  — Divides available height into equal vertical bands
//  — Each band has one curve, its own label, and left/right axis marks
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['curve-family-stacked'] = {

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    var vis = window.HAL_CONFIG.visual || {};
    var vc = vis.chart || {};
    var x0 = 80, pad = 60;
    var cw = vc.w || 700;
    var titleFont = (vis.fonts || {}).title || 'sans-serif';
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;
    var e = window.HAL.svg.el;

    var groupsData = data.groups || [];
    var nSeries = 0;
    for (var gi = 0; gi < groupsData.length; gi++) {
      nSeries += (groupsData[gi].series || []).length;
    }
    if (nSeries === 0) { if (onDone) onDone(); return; }

    var groupMap = {};

    // Use actual data point count from fetched data.
    var actualPts = (groupsData[0].series && groupsData[0].series[0] && groupsData[0].series[0].values)
      ? groupsData[0].series[0].values.length
      : (vc.actualPts || 20);
    if (actualPts < 2) { if (onDone) onDone(); return; }

    // Determine the stacked value range per column
    var paneGroups = [];

    // Card background
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: data.w || 1000, height: data.h || 750, fill: data.color }));

    // Header
    var header = e('text', {
      x: 20, y: 25, fill: fg('frame', 1.9), 'font-size': fs(14),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    header.style.opacity = '0';
    svgEl.appendChild(header);

    // Footer
    var footer = e('text', {
      x: 15, y: 740, fill: fg('frame', 0.85), 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // Layout: stack panes vertically
    var paneTop = 50;
    var paneH = 650 / nSeries;
    var seriesIdx = 0;

    for (var gi = 0; gi < groupsData.length; gi++) {
      var g = groupsData[gi];
      var series = g.series || [];
      for (var si = 0; si < series.length; si++) {
        var sv = series[si].values || [];
        if (sv.length === 0) continue;

        var top = paneTop + seriesIdx * paneH;
        var maxVal = 1;
        for (var vi = 0; vi < sv.length; vi++) {
          if (sv[vi] > maxVal) maxVal = sv[vi];
        }
        maxVal = Math.ceil(maxVal * 1.2);

        // Pane container
        var paneG = e('g');
        paneG.style.opacity = '0';
        svgEl.appendChild(paneG);

        // Light separator line at top
        if (seriesIdx > 0) {
          paneG.appendChild(e('line', {
            x1: x0, y1: top, x2: x0 + cw, y2: top,
            stroke: fg('frame', 0.2), 'stroke-width': 0.5,
          }));
        }

        // Series label (left side)
        paneG.appendChild(e('text', {
          x: x0 - 65, y: top + paneH / 2 + 4,
          fill: fg('frame', 1.0), 'font-size': fs(10),
          'font-family': labelFont, 'text-anchor': 'end',
          'text-rendering': 'optimizeLegibility',
          textContent: series[si].label,
        }));

        // Max value (right side)
        paneG.appendChild(e('text', {
          x: x0 + cw + 10, y: top + 14,
          fill: fg('data', 0.7), 'font-size': fs(9),
          'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
          textContent: maxVal.toFixed(1),
        }));

        // Baseline grid
        paneG.appendChild(e('line', {
          x1: x0, y1: top + paneH, x2: x0 + cw, y2: top + paneH,
          stroke: fg('frame', 0.15), 'stroke-width': 0.5,
        }));

        // Curve path
        var pathParts = [];
        for (var vi = 0; vi < sv.length && vi < actualPts; vi++) {
          var px = x0 + (vi / (actualPts - 1)) * cw;
          var py = top + paneH - (sv[vi] / maxVal) * (paneH - 8) - 4;
          pathParts.push((vi === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1));
        }
        paneG.appendChild(e('path', {
          d: pathParts.join(' '),
          fill: 'none',
          stroke: fg('data', 0.8),
          'stroke-width': 1.5,
        }));

        paneGroups.push(paneG);
        seriesIdx++;
      }
    }

    // Animation
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.bands = paneGroups;

    var defaults = [
      { action: 'appear',     groups: ['header', 'footer'] },
      { action: 'wait',       duration: 1000 },
      { action: 'appear',     groups: ['bands'], order: 'sequential', gap: 300 },
      { action: 'wait',       duration: 8000 },
      { action: 'disappear',  groups: ['bands'], order: 'sequential', gap: 200 },
      { action: 'wait',       duration: 300 },
      { action: 'disappear',  groups: ['header', 'footer'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },
};
