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
    var svgEl = data._container || document.getElementById('card');
    var vis = window.HAL_CONFIG.visual || {};
    var labelFont = (vis.fonts || {}).label || 'monospace';
    var dataFont = (vis.fonts || {}).data || labelFont;
    var e = window.HAL.svg.el;
    var ns = window.HAL.svg.ns;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;

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
    if (!data._container) svgEl.innerHTML = '';
    var bg = e('rect', { x: 0, y: 0, width: data.w || 1000, height: data.h || 750, fill: data.color });
    svgEl.appendChild(bg);

    // ── Header ────────────────────────────────────────────────────────
    var header = e('text', {
      x: hPad, y: 45, fill: fg('frame', 1.9), 'font-size': fs(14),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    header.textContent = (data.title || '') + '  ' + (data.label || '');
    header.style.opacity = '0';
    svgEl.appendChild(header);

    // ── Footer ────────────────────────────────────────────────────────
    var footer = e('text', {
      x: hPad, y: 735, fill: fg('frame', 0.85), 'font-size': fs(10),
      'font-family': labelFont, 'text-rendering': 'optimizeLegibility',
    });
    footer.textContent = data.label || '';
    footer.style.opacity = '0';
    svgEl.appendChild(footer);

    // ── Top separator ─────────────────────────────────────────────────
    var topSep = e('line', {
      x1: hPad, y1: sepY, x2: 960, y2: sepY,
      stroke: fg('frame', 0.3), 'stroke-width': 1,
    });
    topSep.style.opacity = '0';
    svgEl.appendChild(topSep);

    // ── Column headers ────────────────────────────────────────────────
    var colHeaderElements = [];
    for (var ci = 0; ci < cols.length; ci++) {
      var cx = hPad + labelW + ci * colW + colW / 2;
      var ch = e('text', {
        x: cx, y: vPad - 8, fill: fg('frame', 1.25), 'font-size': fs(11),
        'font-family': labelFont, 'text-anchor': 'middle', 'text-rendering': 'optimizeLegibility',
      });
      ch.textContent = cols[ci].label;
      svgEl.appendChild(ch);
      ch.style.opacity = '0';
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
          stroke: fg('frame', 0.15), 'stroke-width': 1,
        });
        sep.style.opacity = '0';
        svgEl.appendChild(sep);
        separators.push(sep);
      }

      // Row label
      var rl = e('text', {
        x: hPad, y: rowY + 14, fill: fg('frame', 1.5), 'font-size': fs(14),
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
          x: cx, y: rowY + 14, fill: fg('frame', 1.9), 'font-size': fs(15),
          'font-family': dataFont, 'text-anchor': 'middle', 'text-rendering': 'optimizeLegibility',
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
      { action: 'wait',       duration: 300 },
      { action: 'disappear',  groups: ['header', 'footer', 'columnHeaders', 'separators'] },
      { action: 'done' },
    ];
    window.HAL.anim.run(data, groupMap, onDone, defaults);
  },

};
