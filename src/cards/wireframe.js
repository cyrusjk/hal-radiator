// ═══════════════════════════════════════════════════════════════════════
//  Wireframe 3D HUD Chart Card
//  — Perspective wireframe with orbital rings and data points
//  — Each object has 3D coordinates projected to 2D
//  — Connections draw lines between objects
//  — Animation groups: header, footer, grid, connections, dataPoints
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['wireframe'] = {

  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var ns = window.HAL.svg.ns;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

    var objects = (data.objects || []);
    var connections = (data.connections || []);

    // ── Perspective projection helpers ─────────────────────────────────
    // Simple isometric-like projection: flatten 3D (x,y,z) to 2D (px,py)
    var cx = 500, cy = 380;  // vanishing / centre point
    var scale = 60;

    function project(x, y, z) {
      // Tilted perspective: x→right, y→depth (up on screen), z→up
      var px = cx + x * scale - y * scale * 0.3;
      var py = cy - z * scale + y * scale * 0.3;
      return { x: px, y: py, z: y };
    }

    // ── Card background ───────────────────────────────────────────────
    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color }));

    // ── Header ────────────────────────────────────────────────────────
    var header = e('text', {
      x: 20, y: 25, fill: fg('frame', 1.9), 'font-size': fs(14),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    header.style.opacity = '0';
    svgEl.appendChild(header);

    // ── Footer ────────────────────────────────────────────────────────
    var footer = e('text', {
      x: 20, y: 735, fill: fg('frame', 0.85), 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // ── Perspective grid ──────────────────────────────────────────────
    var gridG = e('g');
    svgEl.appendChild(gridG);
    var gridLines = [];
    var clamp = 350;

    // Horizontal grid lines (depth bands)
    for (var d = -4; d <= 4; d++) {
      if (d === 0) continue;
      var p1 = project(-4, d, -3);
      var p2 = project(4, d, -3);
      if (p1.z < 0 || p2.z < 0) continue;
      gridLines.push(e('line', {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: fg('frame', 0.3), 'stroke-width': 0.5,
      }));
      p1 = project(-4, d, 3);
      p2 = project(4, d, 3);
      if (p1.z < 0 || p2.z < 0) continue;
      gridLines.push(e('line', {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: fg('frame', 0.2), 'stroke-width': 0.5,
      }));
    }

    // Vertical grid lines (depth rays from center)
    for (var a = 0; a < 360; a += 30) {
      var rad = a * Math.PI / 180;
      var dx = Math.cos(rad) * 4;
      var dy = Math.sin(rad) * 4;
      var p0 = project(0, 0, 0);
      var p1 = project(dx, dy, 0);
      if (p1.z < 0) continue;
      gridLines.push(e('line', {
        x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y,
        stroke: fg('frame', 0.15), 'stroke-width': 0.5,
      }));
    }

    // Orbital rings (ellipses in perspective)
    for (var r = 1; r <= 3; r++) {
      var pathD = '';
      for (var a = 0; a <= 360; a += 10) {
        var rad = a * Math.PI / 180;
        var dx = Math.cos(rad) * r;
        var dy = Math.sin(rad) * r;
        var p = project(dx, dy, 0);
        if (p.z < 0) continue;
        pathD += (a === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1);
      }
      if (pathD) {
        gridLines.push(e('path', {
          d: pathD, fill: 'none',
          stroke: fg('frame', 0.25), 'stroke-width': 0.5,
        }));
      }
    }

    gridG.style.opacity = '0';
    for (var gli = 0; gli < gridLines.length; gli++) {
      gridG.appendChild(gridLines[gli]);
    }

    // ── Connections (lines between objects) ────────────────────────────
    var connElements = [];
    var connG = e('g');
    svgEl.appendChild(connG);
    connG.style.opacity = '0';

    for (var ci = 0; ci < connections.length; ci++) {
      var fr = connections[ci].from;
      var to = connections[ci].to;
      if (fr >= objects.length || to >= objects.length) continue;
      var o1 = objects[fr];
      var o2 = objects[to];
      var p1 = project(o1.x, o1.y, o1.z);
      var p2 = project(o2.x, o2.y, o2.z);
      var line = e('line', {
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        stroke: fg('data', 0.38), 'stroke-width': 0.8,
      });
      connG.appendChild(line);
      connElements.push(line);
    }

    // ── Data points ───────────────────────────────────────────────────
    var pointElements = [];
    var ptG = e('g');
    svgEl.appendChild(ptG);

    for (var oi = 0; oi < objects.length; oi++) {
      var obj = objects[oi];
      var p = project(obj.x, obj.y, obj.z);

      var grp = document.createElementNS(ns, 'g');
      grp.style.opacity = '0';

      // Point marker (crosshair/diamond)
      var size = 5;
      grp.appendChild(e('circle', {
        cx: p.x, cy: p.y, r: size, fill: fg('data', 0.88),
      }));

      // Glow ring
      grp.appendChild(e('circle', {
        cx: p.x, cy: p.y, r: size + 3, fill: 'none',
        stroke: fg('data', 0.32), 'stroke-width': 1,
      }));

      // Label
      var lbl = e('text', {
        x: p.x + 10, y: p.y + 3,
        fill: fg('frame', 1.5), 'font-size': fs(10),
        'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      });
      lbl.textContent = obj.label || '';
      grp.appendChild(lbl);

      ptG.appendChild(grp);
      pointElements.push(grp);
    }

    // ── Group map ─────────────────────────────────────────────────────
    var groupMap = {};
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.grid = gridLines;
    groupMap.connections = connG;       // entire container (show/hide all at once)
    groupMap.dataPoints = pointElements;

    // ── Animation ─────────────────────────────────────────────────────
    var defaults = [
      { action: 'appear',     groups: ['header', 'footer', 'grid'] },
      { action: 'wait',       duration: 1000 },
      { action: 'appear',     groups: ['connections'], order: 'simultaneous' },
      { action: 'wait',       duration: 600 },
      { action: 'appear',     groups: ['dataPoints'], order: 'sequential', gap: 400 },
      { action: 'wait',       duration: 8000 },
      { action: 'disappear',  groups: ['dataPoints'], order: 'sequential', gap: 250 },
      { action: 'wait',       duration: 400 },
      { action: 'disappear',  groups: ['connections'], order: 'simultaneous' },
      { action: 'wait',       duration: 300 },
      { action: 'disappear',  groups: ['header', 'footer', 'grid'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },

};
