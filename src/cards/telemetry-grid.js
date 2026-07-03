// ═══════════════════════════════════════════════════════════════════════
//  Telemetry-Grid Chart Card
//  — Displays structured grid data with column headers
//  — Each row has a label + multiple column values
//  — Animation groups: header, footer, columnHeaders, rows, separators
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['telemetry-grid'] = {

  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var e = window.HAL.svg.el;
    var ns = window.HAL.svg.ns;

    var cols = (data.columns || []);
    var rows = (data.rows || []);
    if (rows.length === 0 || cols.length === 0) { if (onDone) onDone(); return; }

    // ── Layout ────────────────────────────────────────────────────────
    var hPad  = 40;
    var vPad  = 90;        // Y position of first data row
    var rowH  = 38;        // height per data row
    var labelW = 140;      // width of the row-label column (leftmost)
    var colW  = Math.floor((960 - hPad - labelW) / cols.length);
    var sepY  = vPad - 18; // separator above column headers

    // ── Card background ───────────────────────────────────────────────
    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: data.color }));

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

    // ── Top separator ─────────────────────────────────────────────────
    var topSep = e('line', {
      x1: hPad, y1: sepY, x2: 960, y2: sepY,
      stroke: 'rgba(255,255,255,0.12)', 'stroke-width': 1,
    });
    svgEl.appendChild(topSep);

    // ── Column headers ────────────────────────────────────────────────
    var colHeaderElements = [];
    for (var ci = 0; ci < cols.length; ci++) {
      var cx = hPad + labelW + ci * colW + colW / 2;
      var ch = e('text', {
        x: cx, y: vPad - 8, fill: 'rgba(255,255,255,0.5)', 'font-size': 11,
        'font-family': labelFont, 'text-anchor': 'middle', 'text-rendering': 'optimizeLegibility',
      });
      ch.textContent = cols[ci].label;
      svgEl.appendChild(ch);
      colHeaderElements.push(ch);
    }

    // ── Rows ──────────────────────────────────────────────────────────
    var rowElements = [];
    var separators = [];

    for (var ri = 0; ri < rows.length; ri++) {
      var rowY = vPad + ri * rowH;

      // Row container (hidden initially for animation)
      var rowG = document.createElementNS(ns, 'g');
      rowG.style.opacity = '0';

      // Separator line
      if (ri > 0) {
        var sep = e('line', {
          x1: hPad, y1: rowY, x2: 960, y2: rowY,
          stroke: 'rgba(255,255,255,0.06)', 'stroke-width': 1,
        });
        svgEl.appendChild(sep);
        separators.push(sep);
      }

      // Row label
      var rl = e('text', {
        x: hPad, y: rowY + 14, fill: 'rgba(255,255,255,0.6)', 'font-size': 14,
        'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
      });
      rl.textContent = rows[ri].label;
      rowG.appendChild(rl);

      // Cell values
      var rowVals = rows[ri].values || [];
      for (var ci = 0; ci < cols.length; ci++) {
        var cx = hPad + labelW + ci * colW + colW / 2;
        var val = ci < rowVals.length ? String(rowVals[ci]) : '—';
        var cell = e('text', {
          x: cx, y: rowY + 14, fill: 'rgba(255,255,255,0.8)', 'font-size': 15,
          'font-family': labelFont, 'text-anchor': 'middle', 'text-rendering': 'optimizeLegibility',
        });
        cell.textContent = val;
        rowG.appendChild(cell);
      }

      svgEl.appendChild(rowG);
      rowElements.push(rowG);
    }

    // ── Group map for animation engine ────────────────────────────────
    var groupMap = {};
    groupMap.header = header;
    groupMap.footer = footer;
    groupMap.columnHeaders = colHeaderElements;
    groupMap.separators = separators;
    groupMap.rows = rowElements;

    // ── Start the animation ───────────────────────────────────────────
    var defaults = [
      { action: 'appear',     groups: ['header', 'footer', 'columnHeaders', 'separators'] },
      { action: 'wait',       duration: 1000 },
      { action: 'appear',     groups: ['rows'], order: 'sequential', gap: 300 },
      { action: 'wait',       duration: 8000 },
      { action: 'disappear',  groups: ['rows'], order: 'sequential', gap: 200 },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },

};
