// ═══════════════════════════════════════════════════════════════════════
//  Docking Approach Card — Convergence Animation
//  — 7 wireframe rects converge from dock_00 positions to center
//  — Red crosshair + corner markers fade in
//  — Purely decorative, no live data
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['docking-approach'] = {

  // ── Tunable parameters ──────────────────────────────────────────────
  config: {
    segments: 7,
    baseW: 290,
    baseH: 98,
    cx: 500,
    cy: 375,
    crossColor: '#ff6b7a'
  },

  // dock_00 starting positions (center x, center y, width, height)
  // Extracted from reference frame analysis
  rects: [
    { cx: 780.0, cy: 459.0, w: 510.4, h: 291.7, sw: 2.7 },
    { cx: 733.3, cy: 445.0, w: 422.4, h: 241.4, sw: 2.3 },
    { cx: 686.6, cy: 431.1, w: 360.3, h: 205.9, sw: 1.9 },
    { cx: 640.0, cy: 417.1, w: 314.1, h: 179.5, sw: 1.7 },
    { cx: 593.3, cy: 403.1, w: 278.4, h: 159.1, sw: 1.5 },
    { cx: 546.7, cy: 389.1, w: 250.0, h: 142.9, sw: 1.3 },
    { cx: 500.1, cy: 375.0, w: 226.9, h: 129.6, sw: 1.2 }
  ],

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    var e = window.HAL.svg.el;
    var fg = window.HAL.svg.fg;
    var cfg = window.HAL.svg.mergeConfig(this.config, data.cfg);
    var rects = this.rects;
    var cc = cfg.crossColor;
    var w = data.w || 1000;
    var h = data.h || 750;
    var bgColor = data.color || '#111214';

    // ── Background ────────────────────────────────────────────────────
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: w, height: h, fill: bgColor }));

    var t = typeof data.t === 'number' ? data.t : 0;
    var tClamp = Math.min(Math.max(t, 0), 1);

    // ── Draw the 7 rects ──────────────────────────────────────────────
    // Each rect converges linearly from dock_00 start → center(500,375)
    // and shrinks from start dimensions → 0.
    // Rect is hidden once it has fully converged (size < 1).
    for (var i = 0; i < cfg.segments; i++) {
      var r = rects[i];

      // Linear interpolation
      var curCx = r.cx + (cfg.cx - r.cx) * tClamp;
      var curCy = r.cy + (cfg.cy - r.cy) * tClamp;
      var curW  = r.w * (1 - tClamp);
      var curH  = r.h * (1 - tClamp);
      var curSw = r.sw + (0.8 - r.sw) * tClamp; // stroke width converges toward 0.8

      if (curW < 1 || curH < 1) continue;

      var x = curCx - curW / 2;
      var y = curCy - curH / 2;

      svgEl.appendChild(e('rect', {
        x: x, y: y, width: curW, height: curH,
        rx: 12, ry: 12,
        fill: 'none',
        stroke: 'rgb(220,220,240)',
        'stroke-width': Math.max(0.5, curSw),
        'stroke-opacity': 1.0
      }));
    }

    // ── RED FIXED CROSSHAIR at center (500, 375) ─────────────────────
    // Fades in: opacity 0 at t=0 → 1 at t=0.15
    var crossOp = Math.min(1, tClamp / 0.15);
    if (crossOp > 0) {
      var chG = e('g', {
        stroke: cc,
        'stroke-opacity': crossOp,
        'stroke-width': 1.5
      });
      chG.appendChild(e('line', { x1: 470, y1: 375, x2: 530, y2: 375 }));
      chG.appendChild(e('line', { x1: 500, y1: 345, x2: 500, y2: 405 }));
      chG.appendChild(e('circle', { cx: 500, cy: 375, r: 2, fill: cc }));
      svgEl.appendChild(chG);
    }

    // ── RED CORNER MARKERS ────────────────────────────────────────────
    // Converge from dock_00 positions (extent 50) to dock_100 (extent 40)
    // Opacity: 0 at t=0 → 0.6 at t=0.15
    var mkOp = Math.min(0.6, 0.6 * tClamp / 0.15);
    if (mkOp > 0) {
      // Interpolate corner position
      var m0 = 400 + (440 - 400) * tClamp; // TL corner x
      var m1 = 275 + (315 - 275) * tClamp; // TL corner y
      var extent = 50 - (50 - 40) * tClamp; // 50 → 40
      var m2 = m0 + extent; // corner + extent x
      var m3 = m1 + extent; // corner + extent y

      var mkG = e('g', {
        stroke: cc,
        'stroke-opacity': mkOp,
        'stroke-width': 1,
        fill: 'none'
      });
      // TL
      mkG.appendChild(e('path', { d: 'M ' + m0 + ' ' + m1 + ' L ' + m2 + ' ' + m1 + ' L ' + m2 + ' ' + m3 }));
      // TR
      mkG.appendChild(e('path', { d: 'M ' + (1000 - m0) + ' ' + m1 + ' L ' + (1000 - m2) + ' ' + m1 + ' L ' + (1000 - m2) + ' ' + m3 }));
      // BL
      mkG.appendChild(e('path', { d: 'M ' + m0 + ' ' + (750 - m1) + ' L ' + m2 + ' ' + (750 - m1) + ' L ' + m2 + ' ' + (750 - m3) }));
      // BR
      mkG.appendChild(e('path', { d: 'M ' + (1000 - m0) + ' ' + (750 - m1) + ' L ' + (1000 - m2) + ' ' + (750 - m1) + ' L ' + (1000 - m2) + ' ' + (750 - m3) }));
      svgEl.appendChild(mkG);
    }

    // ── Status text ───────────────────────────────────────────────────
    var pct = Math.round(tClamp * 100);
    var label = pct < 100 ? 'APPROACHING' : 'DOCKED';
    var textG = e('g', {
      fill: 'rgba(200,200,220,0.5)',
      'font-family': 'monospace',
      'font-size': 10
    });
    textG.appendChild(e('text', { x: 20, y: 720 }, 'STATUS: ' + label));
    textG.appendChild(e('text', { x: 20, y: 735 }, 'PROGRESS: ' + pct + '%'));
    svgEl.appendChild(textG);

    if (onDone) onDone();
  }
};
