// ═══════════════════════════════════════════════════════════════════════
//  Sunburst Chart Card
//  — Concentric arc hierarchy: each ring is a depth level
//  — Arc angle = proportional value; colour dims with depth
//  — Animation groups: header, footer, rings
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['sunburst'] = {

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var dataFont = (vis.fonts || {}).data || labelFont;
    var e = window.HAL.svg.el;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    var hierarchy = (data.hierarchy || []);
    if (hierarchy.length === 0) { if (onDone) onDone(); return; }

    var groupMap = {};
    var ringElements = [];     // one <g> per ring level

    // Layout
    var cx = 500, cy = 380;
    var maxRadius = 280;
    var ringPadding = 4;

    // Background
    if (!data._container) svgEl.innerHTML = '';
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

    // ── Flatten hierarchy into arc segments ─────────────────────────
    // Level 0 = children of root (the innermost ring)
    // Level 1 = grandchildren
    // Track max depth for radius calculation
    function flatten(node, depth, leaves) {
      leaves = leaves || [];
      var kids = node.children || [];
      if (kids.length === 0) {
        leaves.push({ name: node.name, value: node.value || 1, depth: depth, children: [] });
      } else {
        for (var i = 0; i < kids.length; i++) flatten(kids[i], depth + 1, leaves);
      }
      return leaves;
    }

    // Collect all leaf-level items per top-level group for angle proportion
    var allLeaves = [];
    var totalValue = 0;
    for (var gi = 0; gi < hierarchy.length; gi++) {
      var leaves = flatten(hierarchy[gi], 0);
      var groupValue = 0;
      for (var li = 0; li < leaves.length; li++) groupValue += leaves[li].value;
      // Store group-level info
      hierarchy[gi]._value = groupValue;
      hierarchy[gi]._depth = 0;
      hierarchy[gi]._leaves = leaves;
      totalValue += groupValue;
    }
    if (totalValue === 0) totalValue = 1;

    // Determine max depth for ring count
    var maxDepth = 0;
    for (var gi = 0; gi < hierarchy.length; gi++) {
      for (var li = 0; li < hierarchy[gi]._leaves.length; li++) {
        if (hierarchy[gi]._leaves[li].depth > maxDepth) maxDepth = hierarchy[gi]._leaves[li].depth;
      }
    }
    var levels = maxDepth + 2;  // group ring + children rings + leaf ring
    if (levels < 2) levels = 2;
    var ringH = maxRadius / levels;

    // Build arcs for each level
    // arcPath(cx, cy, innerR, outerR, startAngle, endAngle)
    function arcPath(ri, ro, a1, a2) {
      var large = (a2 - a1 > Math.PI) ? 1 : 0;
      var x1 = cx + ri * Math.sin(a1);
      var y1 = cy - ri * Math.cos(a1);
      var x2 = cx + ro * Math.sin(a1);
      var y2 = cy - ro * Math.cos(a1);
      var x3 = cx + ro * Math.sin(a2);
      var y3 = cy - ro * Math.cos(a2);
      var x4 = cx + ri * Math.sin(a2);
      var y4 = cy - ri * Math.cos(a2);
      return 'M ' + x1.toFixed(1) + ',' + y1.toFixed(1) +
             ' L ' + x2.toFixed(1) + ',' + y2.toFixed(1) +
             ' A ' + ro.toFixed(1) + ',' + ro.toFixed(1) +
             ' 0 ' + large + ' 1 ' +
             x3.toFixed(1) + ',' + y3.toFixed(1) +
             ' L ' + x4.toFixed(1) + ',' + y4.toFixed(1) +
             ' A ' + ri.toFixed(1) + ',' + ri.toFixed(1) +
             ' 0 ' + large + ' 0 ' +
             x1.toFixed(1) + ',' + y1.toFixed(1) + ' Z';
    }

    // For each ring level, collect all segments
    var ringGroups = []; // array per level: array of { el, name, value }

    // Level 0: top-level groups
    var l0 = [];
    var a0 = 0;
    for (var gi = 0; gi < hierarchy.length; gi++) {
      var frac = hierarchy[gi]._value / totalValue;
      var a1 = a0 + frac * 2 * Math.PI;
      var innerR = 0;
      var outerR = ringH - ringPadding;
      l0.push({
        el: e('path', { d: arcPath(innerR, outerR, a0, a1), fill: fg('frame', 0.8 - gi * 0.1), stroke: fg('frame', 0.05), 'stroke-width': 0.5 }),
        name: hierarchy[gi].name, value: hierarchy[gi]._value,
        startAngle: a0, endAngle: a1,
      });
      a0 = a1;
    }
    ringGroups.push(l0);

    // Deeper levels: distribute children within parent arc
    function buildLevel(level) {
      if (level > maxDepth) return;
      var prev = ringGroups[level - 1];
      var cur = [];
      for (var pi = 0; pi < prev.length; pi++) {
        var parentSeg = prev[pi];
        // Find items at this depth within the parent's arc
        var aStart = parentSeg.startAngle;
        var aRange = parentSeg.endAngle - parentSeg.startAngle;
        var innerR = level * ringH + ringPadding;
        var outerR = (level + 1) * ringH - ringPadding;
        // Identify items at this depth
        var items = [];
        for (var gi = 0; gi < hierarchy.length; gi++) {
          for (var li = 0; li < hierarchy[gi]._leaves.length; li++) {
            var leaf = hierarchy[gi]._leaves[li];
            if (leaf.depth === level) items.push(leaf);
          }
        }
        if (items.length === 0) continue;
        // Subdivide arc by leaf values
        var itemTotal = 0;
        for (var ii = 0; ii < items.length; ii++) itemTotal += items[ii].value;
        if (itemTotal === 0) itemTotal = 1;
        var aPos = aStart;
        for (var ii = 0; ii < items.length; ii++) {
          var frac2 = items[ii].value / itemTotal;
          var a2 = aPos + frac2 * aRange;
          cur.push({
            el: e('path', { d: arcPath(innerR, outerR, aPos, a2), fill: fg('frame', 0.5 - level * 0.05), stroke: fg('frame', 0.05), 'stroke-width': 0.3 }),
            name: items[ii].name, value: items[ii].value,
            startAngle: aPos, endAngle: a2,
          });
          aPos = a2;
        }
      }
      if (cur.length > 0) ringGroups.push(cur);
    }

    for (var lv = 1; lv <= maxDepth; lv++) buildLevel(lv);

    // If only 1 level, add a dummy inner ring for visual depth
    if (ringGroups.length === 1) {
      var inner = [];
      for (var pi = 0; pi < ringGroups[0].length; pi++) {
        var seg = ringGroups[0][pi];
        var ir = ringH * 0.4;
        inner.push({
          el: e('path', { d: arcPath(0, ir, seg.startAngle, seg.endAngle), fill: fg('frame', 0.9), stroke: 'none' }),
          name: '', value: 0,
          startAngle: seg.startAngle, endAngle: seg.endAngle,
        });
      }
      ringGroups.unshift(inner);
    }

    // Render ring groups
    for (var ri = 0; ri < ringGroups.length; ri++) {
      var ringG = e('g');
      ringG.style.opacity = '0';
      svgEl.appendChild(ringG);
      for (var si = 0; si < ringGroups[ri].length; si++) {
        ringG.appendChild(ringGroups[ri][si].el);
      }
      // Label most prominent segments
      if (ri === 0) {
        for (var si = 0; si < ringGroups[ri].length; si++) {
          var seg = ringGroups[ri][si];
          var midA = (seg.startAngle + seg.endAngle) / 2;
          var lr = ringH * 0.5;
          var lx = cx + lr * Math.sin(midA);
          var ly = cy - lr * Math.cos(midA);
          var label = e('text', {
            x: lx, y: ly + 3, fill: fg('frame', 1.5), 'font-size': fs(9),
            'font-family': labelFont, 'text-anchor': 'middle', 'text-rendering': 'optimizeLegibility',
          });
          label.textContent = seg.name;
          ringG.appendChild(label);
        }
      }
      ringElements.push(ringG);
    }

    // ── Animation ─────────────────────────────────────────────────
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.rings = ringElements;

    var defaults = [
      { action: 'appear',    groups: ['header', 'footer'] },
      { action: 'wait',      duration: 500 },
      { action: 'appear',    groups: ['rings'], order: 'sequential', gap: 300 },
      { action: 'wait',      duration: 8000 },
      { action: 'disappear', groups: ['rings'], order: 'reverse', gap: 200 },
      { action: 'wait',      duration: 300 },
      { action: 'disappear', groups: ['header', 'footer'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },
};
