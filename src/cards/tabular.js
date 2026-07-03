// ═══════════════════════════════════════════════════════════════════════
//  Tabular Chart Card
//  — Displays structured label/value data rows
//  — Each row is a { label, value } pair; rows can be grouped visually
//  — Animation groups: header, footer, separators, rows
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards.tabular = {

  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var titleFont = (vis.fonts || {}).title || 'sans-serif';
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;

    var rows = (data.rows || []);
    if (rows.length === 0) { if (onDone) onDone(); return; }

    // ── Card background ───────────────────────────────────────────────
    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color }));

    // ── Layout ────────────────────────────────────────────────────────
    var hPad = 40;           // horizontal padding from left edge
    var rowH = 48;           // height per row
    var sepH = 2;            // separator height
    var labelX = hPad;       // label column X
    var valueX = 900;        // value column X (right-aligned)
    var startY = 90;         // first row Y
    var labelW = valueX - labelX - 20;  // width available for label text

    // ── Header ────────────────────────────────────────────────────────
    var header = e('text', {
      x: hPad, y: 45, fill: 'rgba(255,255,255,0.8)', 'font-size': 14,
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    svgEl.appendChild(header);

    // ── Footer ────────────────────────────────────────────────────────
    var footer = e('text', {
      x: hPad, y: 735, fill: 'rgba(255,255,255,0.35)', 'font-size': 10,
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    footer.textContent = data.label || '';
    svgEl.appendChild(footer);

    // ── Rows ──────────────────────────────────────────────────────────
    var rowElements = [];
    var separators = [];

    for (var i = 0; i < rows.length; i++) {
      var rowY = startY + i * rowH;

      // Row container (hidden initially for animation)
      var rowG = document.createElementNS(window.HAL.svg.ns, 'g');
      rowG.style.opacity = '0';

      // Separator line (not hidden — part of the background grid)
      if (i > 0) {
        var sep = e('line', {
          x1: hPad, y1: rowY - rowH / 2, x2: 960, y2: rowY - rowH / 2,
          stroke: 'rgba(255,255,255,0.08)', 'stroke-width': 1,
        });
        svgEl.appendChild(sep);
        separators.push(sep);
      }

      // Label
      var label = e('text', {
        x: labelX, y: rowY + 4, fill: 'rgba(255,255,255,0.6)', 'font-size': 18,
        'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      });
      label.textContent = rows[i].label;
      rowG.appendChild(label);

      // Value
      var valStr = String(rows[i].value);
      var val = e('text', {
        x: valueX, y: rowY + 4, fill: 'rgba(255,255,255,0.85)', 'font-size': 20,
        'font-family': labelFont, 'text-anchor': 'end', 'text-rendering': 'optimizeLegibility',
      });
      val.textContent = valStr;
      rowG.appendChild(val);

      svgEl.appendChild(rowG);
      rowElements.push(rowG);
    }

    // ── Group map for animation engine ────────────────────────────────
    var groupMap = {};
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.separators = separators;
    groupMap.rows = rowElements;

    // ── Start the animation ───────────────────────────────────────────
    var defaults = [
      { action: 'appear',     groups: ['header', 'footer', 'separators'] },
      { action: 'wait',       duration: 3000 },
      { action: 'appear',     groups: ['rows'], order: 'sequential', gap: 400 },
      { action: 'wait',       duration: 8000 },
      { action: 'disappear',  groups: ['rows'], order: 'sequential', gap: 300 },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },

};
