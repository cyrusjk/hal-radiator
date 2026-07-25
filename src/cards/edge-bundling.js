// ═══════════════════════════════════════════════════════════════════════
//  Hierarchical Edge Bundling Card
//  — Nodes arranged on a circle, curved connections bundled by hierarchy
//  — Connections between sibling sub-trees share more path = bundled
//  — Animation groups: header, footer, nodes, connections
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['edge-bundling'] = {

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    var tree = data.tree;
    var connections = (data.connections || []);
    if (!tree || connections.length === 0) { if (onDone) onDone(); return; }

    var groupMap = {};
    var nodeElements = [];
    var connectionElements = [];

    // Layout
    var cx = 500, cy = 390;
    var nodeRadius = 250;  // circle radius for leaf nodes
    var bundleR = 120;     // inner radius for bundling (control point orbit)
    var dotR = 5;

    // Background
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

    // ── Flatten hierarchy ─────────────────────────────────────────
    // Build node index with depth-first leaf order
    var leaves = [];
    var nodeById = {};

    function walk(node, depth, path) {
      var id = node.name;
      nodeById[id] = { node: node, depth: depth, path: path, children: [] };
      var kids = node.children || [];
      if (kids.length === 0) {
        leaves.push(id);
        return id;
      }
      for (var i = 0; i < kids.length; i++) {
        var childLeaf = walk(kids[i], depth + 1, path.concat(id));
        nodeById[id].children.push(childLeaf);
      }
      return nodeById[id].children[0]; // first leaf underneath
    }

    walk(tree, 0, []);
    var nLeaves = leaves.length;
    if (nLeaves === 0) { if (onDone) onDone(); return; }

    // Assign positions on the circle for each leaf
    var leafAngles = {};
    for (var li = 0; li < nLeaves; li++) {
      var angle = (li / nLeaves) * 2 * Math.PI - Math.PI / 2;
      leafAngles[leaves[li]] = angle;
    }

    function onCircle(angle, r) {
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    }

    // Find deepest common ancestor depth for two leaves.
    // Returns null if either node is unknown (caller should skip).
    function commonDepth(a, b) {
      var infoA = nodeById[a];
      var infoB = nodeById[b];
      if (!infoA || !infoB) return null;
      var pathA = infoA.path;
      var pathB = infoB.path;
      var depth = 0;
      var maxD = Math.min(pathA.length, pathB.length);
      for (var i = 0; i < maxD; i++) {
        if (pathA[i] === pathB[i]) depth = i + 1;
        else break;
      }
      return depth;
    }

    // ── Render nodes ──────────────────────────────────────────────
    var nodeG = e('g');
    nodeG.style.opacity = '0';
    svgEl.appendChild(nodeG);

    for (var li = 0; li < nLeaves; li++) {
      var angle = leafAngles[leaves[li]];
      var pos = onCircle(angle, nodeRadius);
      // Dot
      nodeG.appendChild(e('circle', {
        cx: pos.x, cy: pos.y, r: dotR,
        fill: fg('frame', 1.0), stroke: fg('frame', 0.3), 'stroke-width': 1,
      }));
      // Label
      var label = e('text', {
        x: pos.x + (Math.cos(angle) > 0 ? 10 : -10),
        y: pos.y + 4,
        fill: fg('frame', 1.0), 'font-size': fs(9),
        'font-family': labelFont,
        'text-anchor': Math.cos(angle) > 0 ? 'start' : 'end',
        'text-rendering': 'optimizeLegibility',
      });
      label.textContent = leaves[li];
      nodeG.appendChild(label);
      nodeElements.push({ dot: null, label: label });
    }

    // ── Render connections (bundled) ───────────────────────────────
    var connG = e('g');
    svgEl.appendChild(connG);

    for (var ci = 0; ci < connections.length; ci++) {
      var src = connections[ci].source;
      var tgt = connections[ci].target;
      if (leafAngles[src] === undefined || leafAngles[tgt] === undefined) continue;

      var a1 = leafAngles[src];
      var a2 = leafAngles[tgt];

      // Control point radius based on common ancestor depth
      var depth = commonDepth(src, tgt);
      if (depth === null) continue;  // edge case: node not in tree
      var maxDepth = 3;
      var bundleFrac = Math.min(1, depth / maxDepth);
      var cpR = bundleR + (nodeRadius - bundleR) * (1 - bundleFrac);
      if (cpR > nodeRadius - 10) cpR = nodeRadius - 10;

      // Control points at the bundle radius, midway between the two angles
      // Plus a radial offset to create the curve
      // Arc around the circle
      var midAngle = (a1 + a2) / 2;
      // Handle wrapping
      var diff = a2 - a1;
      if (diff > Math.PI) { a2 -= 2 * Math.PI; midAngle = (a1 + a2) / 2; }
      if (diff < -Math.PI) { a2 += 2 * Math.PI; midAngle = (a1 + a2) / 2; }
      diff = a2 - a1;

      // Control point 1: radial outward from source toward bundle
      var cp1x = cx + cpR * Math.cos(a1 + diff * 0.25);
      var cp1y = cy + cpR * Math.sin(a1 + diff * 0.25);
      // Control point 2: radial outward from target toward bundle
      var cp2x = cx + cpR * Math.cos(a2 - diff * 0.25);
      var cp2y = cy + cpR * Math.sin(a2 - diff * 0.25);

      var p1 = onCircle(a1, nodeRadius);
      var p2 = onCircle(a2, nodeRadius);

      var pathD = 'M ' + p1.x.toFixed(1) + ',' + p1.y.toFixed(1) +
                  ' C ' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) +
                  ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) +
                  ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);

      var op = 0.2 + (1 - bundleFrac) * 0.4;
      var line = e('path', {
        d: pathD,
        fill: 'none',
        stroke: fg('data', op),
        'stroke-width': 1.0 + (1 - bundleFrac) * 0.5,
      });
      connG.appendChild(line);
      connectionElements.push(line);
    }

    // ── Animation ─────────────────────────────────────────────────
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.nodes = nodeG;
    groupMap.connections = connectionElements;

    var defaults = [
      { action: 'appear',   groups: ['header', 'footer'] },
      { action: 'wait',     duration: 500 },
      { action: 'appear',   groups: ['nodes'] },
      { action: 'wait',     duration: 400 },
      { action: 'flickerIn', groups: ['connections'], order: 'sequential', gap: 200 },
      { action: 'wait',     duration: 8000 },
      { action: 'disappear', groups: ['connections'], order: 'reverse', gap: 150 },
      { action: 'wait',     duration: 300 },
      { action: 'disappear', groups: ['nodes'] },
      { action: 'wait',     duration: 300 },
      { action: 'disappear', groups: ['header', 'footer'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },
};
