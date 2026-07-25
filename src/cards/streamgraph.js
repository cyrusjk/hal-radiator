// ═══════════════════════════════════════════════════════════════════════
//  Streamgraph Chart Card
//  — Flowing stacked ribbons centred on a baseline
//  — Each series is a smooth filled ribbon
//  — Animation groups: header, footer, ribbons
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['streamgraph'] = {

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    var vis = window.HAL_CONFIG.visual || {};
    var vc = vis.chart || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    var series = (data.series || []);
    if (series.length === 0) { if (onDone) onDone(); return; }

    // Use actual data point count from first series.
    var actualPts = series[0].values ? series[0].values.length : 20;
    if (actualPts < 2) { if (onDone) onDone(); return; }

    var groupMap = {};
    var ribbonGroups = [];

    // Layout
    var x0 = 80, y0 = 80, cw = 840, ch = 560;

    // Background
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: data.w || 1000, height: data.h || 750, fill: data.color }));

    // Header
    var header = e('text', {
      x: 20, y: 25, fill: fg('frame', 1.9), 'font-size': fs(14),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      filter: 'url(#txtGlow)',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    header.style.opacity = '0';
    svgEl.appendChild(header);

    // Footer
    var footer = e('text', {
      x: 15, y: 740, fill: fg('frame', 0.85), 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      filter: 'url(#txtGlow)',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // ── Process data ──────────────────────────────────────────────
    // Extract and pad all series to actualPts
    var allVals = [];
    var maxVal = 0;
    for (var si = 0; si < series.length; si++) {
      var sv = series[si].values || [];
      var padded = [];
      for (var vi = 0; vi < actualPts; vi++) {
        var v = (vi < sv.length) ? Math.max(0, sv[vi]) : 0;
        padded.push(v);
        if (v > maxVal) maxVal = v;
      }
      allVals.push(padded);
    }
    if (maxVal === 0) maxVal = 1;

    // Stack values for centered baseline
    // Each layer: top = sum of all layers up to this one, bottom = sum of all layers below
    // Then shift everything so center = 0
    var layers = [];
    var totalStack = [];
    for (var vi = 0; vi < actualPts; vi++) {
      var t = 0;
      for (var si = 0; si < series.length; si++) t += allVals[si][vi];
      totalStack.push(t);
    }

    // Find global max stack for scaling
    var maxStack = 0;
    for (var vi = 0; vi < actualPts; vi++) {
      if (totalStack[vi] > maxStack) maxStack = totalStack[vi];
    }

    var yScale = (ch - 40) / (maxStack || 1);

    // Build layer paths
    // Each layer is a ribbon: top edge and bottom edge forming a closed path
    var layerPaths = [];
    for (var si = 0; si < series.length; si++) {
      var top = [];
      var bottom = [];
      // Calculate cumulative layers for this series
      var prevB = 0;
      for (var vi = 0; vi < actualPts; vi++) {
        var b = prevB;
        prevB += allVals[si][vi];
        // For centered streamgraph: bottom offset = b - totalStack[vi]/2
        var center = -totalStack[vi] / 2;
        var tb = (b + center) * yScale;
        var tt = (b + allVals[si][vi] + center) * yScale;
        var px = x0 + (vi / (actualPts - 1)) * cw;
        top.push({ x: px, y: y0 + ch / 2 + tt });
        bottom.push({ x: px, y: y0 + ch / 2 + tb });
      }

      // Layer data in correct order for polygon fill
      var pts = [];
      for (var pi = 0; pi < top.length; pi++) pts.push(top[pi]);
      for (var pi = top.length - 1; pi >= 0; pi--) pts.push(bottom[pi]);

      layerPaths.push({ points: pts, label: series[si].label || '' });
    }

    // ── Render ribbons ────────────────────────────────────────────
    // Draw in reverse (back to front) so first series is on top
    // applyOrder handles reversal
    for (var si = 0; si < series.length; si++) {
      var li = series.length - 1 - si;  // draw back layers first
      var layer = layerPaths[li];

      // Build SVG path with smooth (quadratic) curves
      // Use simple linear interpolation for now (fast, reliable)
      var pathD = '';
      for (var pi = 0; pi < layer.points.length; pi++) {
        var pt = layer.points[pi];
        pathD += (pi === 0 ? 'M ' : ' L ') + pt.x.toFixed(1) + ',' + pt.y.toFixed(1);
      }
      pathD += ' Z';

      var ribbonG = e('g');
      ribbonG.style.opacity = '0';
      var opacity = 0.55 + (li / series.length) * 0.35;
      var strokeOp = 0.2 + (li / series.length) * 0.3;
      ribbonG.appendChild(e('path', {
        d: pathD,
        fill: fg('data', opacity),
        stroke: fg('data', strokeOp),
        'stroke-width': 0.5,
        filter: 'url(#gfxGlow)',
      }));

      // End label
      var lastPt = layer.points[Math.floor(layer.points.length / 2)];
      var label = e('text', {
        x: lastPt.x + 8, y: lastPt.y + 3, fill: fg('data', 1.0),
        'font-size': fs(10), 'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
        filter: 'url(#txtGlow)',
      });
      label.textContent = layer.label;
      ribbonG.appendChild(label);

      svgEl.appendChild(ribbonG);
      ribbonGroups.push(ribbonG);
    }

    // ── Animation ─────────────────────────────────────────────────
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.ribbons = ribbonGroups;

    var defaults = [
      { action: 'appear',    groups: ['header', 'footer'] },
      { action: 'wait',      duration: 800 },
      { action: 'appear',    groups: ['ribbons'], order: 'sequential', gap: 400 },
      { action: 'wait',      duration: 8000 },
      { action: 'disappear', groups: ['ribbons'], order: 'reverse', gap: 250 },
      { action: 'wait',      duration: 300 },
      { action: 'disappear', groups: ['header', 'footer'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },
};
