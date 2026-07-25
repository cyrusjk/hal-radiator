// ═══════════════════════════════════════════════════════════════════════
//  Composite Card Renderer
//  — Composes multiple visual zones on a single card
//  — Each zone can be a header (title + subheading) or a chart
//  — Charts delegate to their own renderer via _container
//  — Animation: each zone runs independently; the composite waits for all
//    to finish before signalling the app to advance.
//
//  Config shape (from radiator.yaml via build.py):
//    {
//      type: 'composite',
//      title: 'SYS',
//      label: 'PAPPY: 192.168.50.9',
//      color: 'rgb(16,45,70)',
//      zones: [
//        { type: 'header', x: 0, y: 0, w: 1000, h: 70 },
//        { type: 'chart',  x: 0, y: 80, w: 1000, h: 320,
//          chartType: 'curve-family', title: 'CPU', label: 'LOAD AVG',
//          dataSource: { ... } },
//        { type: 'chart',  x: 0, y: 410, w: 1000, h: 320,
//          chartType: 'curve-family-stacked', ... },
//        // ── Chip badges (top-right corner of the display) ──
//        { type: 'chip',  x: 845, y: 12, w: 38, h: 38,
//          label: 'Z', bg: 'rgb(255,255,255)',
//          textColor: 'rgb(45,75,99)', fontSize: 26, padX: 10 },
//        { type: 'chip',  x: 887, y: 12, w: 65, h: 17,
//          label: 'NEAR-IR', bg: 'rgb(255,255,255)',
//          opacity: 0.5, textColor: 'rgb(45,75,99)', fontSize: 9, padX: 4 },
//        { type: 'chip',  x: 887, y: 31, w: 30, h: 17,
//          label: 'UV', bg: 'rgb(14,21,48)',
//          opacity: 0.5, textColor: 'rgb(45,75,99)', fontSize: 9, padX: 4 },
//      ]
//    }
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['composite'] = {

  render: function(data, onDone) {
    var svgEl = document.getElementById('card');
    var e = window.HAL.svg.el;
    var ns = window.HAL.svg.ns;
    var fg = window.HAL.svg.fg;
    var fs = window.HAL.svg.fs;
    var labelFont = (window.HAL_CONFIG.visual.fonts || {}).label || 'monospace';

    // ── Clear card and draw background ──────────────────────────────
    svgEl.innerHTML = '';
    svgEl.appendChild(e('rect', {
      x: 0, y: 0, width: 1000, height: 750, fill: data.color
    }));

    var zones = data.zones || [];
    var remaining = zones.length;
    if (remaining === 0) { if (onDone) onDone(); return; }

    function zoneDone() {
      remaining--;
      if (remaining <= 0 && onDone) onDone();
    }

    // ── Save original chart sizing to restore after each child ──────
    var origChart = null;
    if (window.HAL_CONFIG.visual && window.HAL_CONFIG.visual.chart) {
      origChart = {
        h: window.HAL_CONFIG.visual.chart.h,
        w: window.HAL_CONFIG.visual.chart.w,
      };
    }

    // ── Process each zone ────────────────────────────────────────────
    for (var zi = 0; zi < zones.length; zi++) {
      var zone = zones[zi];
      var zx = zone.x || 0;
      var zy = zone.y || 0;
      var zw = zone.w || 1000;
      var zh = zone.h || 100;

      // Create a group for this zone, translated to its position
      var zG = document.createElementNS(ns, 'g');
      zG.setAttribute('transform', 'translate(' + zx + ', ' + zy + ')');
      svgEl.appendChild(zG);
      // Track for cleanup on card switch
      if (window.HAL._registerContainer) window.HAL._registerContainer(zG);

      if (zone.type === 'header') {
        // ── Header zone: title + subheading text ──────────────────
        renderHeader(zG, data, zone);
        zoneDone();

      } else if (zone.type === 'chart') {
        // ── Chart zone: fetch data then delegate to child renderer ──
        // Temporarily override chart height/width so the child
        // renderer uses this zone's dimensions.
        if (origChart) {
          window.HAL_CONFIG.visual.chart.h = zh;
          window.HAL_CONFIG.visual.chart.w = zw;
        }

        // Build child data — merge zone-level overrides on top of card data
        var childData = {};
        for (var k in data) {
          if (k !== 'zones' && k !== 'type') childData[k] = data[k];
        }
        // Zone-level overrides
        if (zone.title)      childData.title = zone.title;
        if (zone.label)      childData.label = zone.label;
        if (zone.dataSource) childData.dataSource = zone.dataSource;
        if (zone.animation)  childData.animation = zone.animation;
        if (zone.color)      childData.color = zone.color;
        if (zone.chartType)  childData.type = zone.chartType;
        // Propagate cfg: parent cfg as base, zone-level overrides on top
        childData.cfg = window.HAL.svg.mergeConfig(data.cfg, zone.cfg);

        childData._container = zG;
        childData.w = (zw || 1000); childData.h = (zh || 750);
        // ── Zone bounds: position + size for custom DOM card positioning ──
        childData.zoneBounds = { x: zx, y: zy, w: zw, h: zh };

        // Fetch data for this chart zone, then render
        (function(zChild, zRenderer, zDone) {
          window.HAL.data.fetchCardData(zChild).then(function(fetched) {
            if (fetched) for (var fk in fetched) zChild[fk] = fetched[fk];
            if (zRenderer) {
              zRenderer.render(zChild, zDone);
            } else {
              zDone();
            }
          }).catch(function(e) {
            console.error('Zone fetch error [', zone.chartType, ']:', e);
            zDone();
          });
        })(childData, window.HAL.cards[zone.chartType], zoneDone);

        // Restore original config
        if (origChart) {
          window.HAL_CONFIG.visual.chart.h = origChart.h;
          window.HAL_CONFIG.visual.chart.w = origChart.w;
        }

      } else if (zone.type === 'label') {
        // ── Label zone: text line + optional chips ──
        var labelEl = e('text', {
          x: zone.padX || 20,
          y: zone.padY || 30,
          fill: fg('frame', 1.0),
          'font-size': fs(zone.fontSize || 14),
          'font-family': labelFont,
          filter: 'url(#txtGlow)',
          'text-rendering': 'optimizeLegibility',
        });
        labelEl.textContent = zone.text || '';
        zG.appendChild(labelEl);

        // Render nested chips (e.g. AVG/MIN/MAX badges)
        var labelChips = zone.chips || [];
        for (var lci = 0; lci < labelChips.length; lci++) {
          var lchip = Object.assign({}, labelChips[lci]);
          lchip.x = (lchip.x || 0) - zx;
          lchip.y = (lchip.y || 0) - zy;
          renderChip(zG, lchip);
        }

        zoneDone();

      } else if (zone.type === 'chip') {
        // ── Chip zone: small labeled badge (e.g. Z, NEAR-IR, UV) ──
        renderChip(zG, zone);
        zoneDone();

      } else if (zone.type === 'badge') {
        // ── Badge zone: one or more chip badges (e.g. CPU, SYSTEM) ──
        var chips = zone.chips || [];
        for (var bi = 0; bi < chips.length; bi++) {
          var chip = Object.assign({}, chips[bi]);
          chip.x = (chip.x || 0) + (zone.x || 0);
          chip.y = (chip.y || 0) + (zone.y || 0);
          renderChip(zG, chip);
        }
        zoneDone();
      } else {
        zoneDone();
      }
    }
  },
};

// ── Header zone renderer ─────────────────────────────────────────────
function renderHeader(container, data, zone) {
  var e = window.HAL.svg.el;
  var fg = window.HAL.svg.fg;
  var fs = window.HAL.svg.fs;
  var labelFont = (window.HAL_CONFIG.visual.fonts || {}).label || 'monospace';

  var zh = zone.h || 70;
  var zx = zone.padX || 20;
  var titleY = zone.titleY || 30;
  var subY = zone.subY || 52;

  // Group title (e.g. "SYS")
  var headerTitle = e('text', {
    x: zx, y: titleY,
    fill: fg('frame', 1.9),
    'font-size': fs(zone.titleSize || 14),
    'font-family': labelFont,
    'text-rendering': 'optimizeLegibility',
    filter: 'url(#txtGlow)',
  });
  headerTitle.textContent = data.title || '';
  container.appendChild(headerTitle);

  // Subheading (e.g. "PAPPY: 192.168.50.9")
  var headerSub = e('text', {
    x: zx + (zone.titleSize || 14) * 5.5, y: titleY,
    fill: fg('frame', 0.85),
    'font-size': fs(zone.subSize || 10),
    'font-family': labelFont,
    'text-rendering': 'optimizeLegibility',
    filter: 'url(#txtGlow)',
  });
  headerSub.textContent = data.label || '';
  container.appendChild(headerSub);

  // Optional separator line
  if (zone.separator !== false) {
    container.appendChild(e('line', {
      x1: zx, y1: zh - 1, x2: 980, y2: zh - 1,
      stroke: fg('frame', 0.25), 'stroke-width': 1,
    }));
  }
}

// ── Chip zone renderer ───────────────────────────────────────────────
// Renders a small labeled badge in the style of the HAL 9000 display
// chips (e.g. the 'Z', 'NEAR-IR', 'UV' badges in the top-right corner).
//
// Zone config:
//   label: 'Z'               — chip text
//   x/y: position of the chip on the card
//   w: width in px
//   h: height in px
//   chipStyle: 'square' | 'rect'  — shape (default: rect)
//   bg: 'rgb(255,255,255)'       — background color
//   textColor: 'rgb(0,0,0)'      — text color (default: matches bg foreground)
//   border: 'rgb(255,255,255)'   — stroke color, omit for no border
//   fontSize: 14                 — text size in px
//   fontFace: 'EurostileLocal'   — font family
function renderChip(container, zone) {
  var e = window.HAL.svg.el;
  var fs = window.HAL.svg.fs;

  var w = zone.w || 40;
  var h = zone.h || 20;
  var bg = zone.bg || 'rgb(255,255,255)';
  var chipOpacity = zone.opacity !== undefined ? zone.opacity : 1.0;
  var textColor = zone.textColor || 'rgb(0,0,0)';
  var defaultFontSize = zone.fontSize || 11;
  var fontFace = zone.fontFace || 'monospace';

  // Background rect — rounded corners, semi-opaque, no border
  var rect = e('rect', {
    x: 0, y: 0, width: w, height: h,
    fill: bg,
    rx: 4, ry: 4,
    opacity: chipOpacity,
  });
  container.appendChild(rect);

  // If chip has a 'lines' array, render each line independently
  if (zone.lines && zone.lines.length > 0) {
    for (var li = 0; li < zone.lines.length; li++) {
      var ln = zone.lines[li];
      var tx = ln.x !== undefined ? ln.x : 0;
      var ty = ln.y !== undefined ? ln.y : h / 2;
      var lfont = ln.fontSize !== undefined ? ln.fontSize : (ln.font || defaultFontSize);
      var lface = ln.fontFace || fontFace;
      var lcolor = ln.color || textColor;
      var t = e('text', {
        x: tx, y: ty,
        fill: lcolor,
        'font-size': fs(lfont),
        'font-family': lface,
        'dominant-baseline': 'central',
        filter: 'url(#txtGlow)',
      });
      if (ln.anchor) t.setAttribute('text-anchor', ln.anchor);
      t.textContent = ln.text !== undefined ? String(ln.text) : '';
      container.appendChild(t);
    }
    return;
  }

  // Simple single-line chip (backwards compatible)
  var padX = zone.padX !== undefined ? zone.padX : 4;
  var tx = (zone.textAnchor === 'middle') ? w / 2 : padX;
  var txt = e('text', {
    x: tx, y: h / 2,
    fill: textColor,
    'font-size': fs(defaultFontSize),
    'font-family': fontFace,
    filter: 'url(#txtGlow)',
    'dominant-baseline': 'central',
    'text-rendering': 'optimizeLegibility',
  });
  if (zone.textAnchor === 'middle') txt.setAttribute('text-anchor', 'middle');
  txt.textContent = zone.label || '';
  container.appendChild(txt);
}
