// ═══════════════════════════════════════════════════════════════════════
//  NON FUNCTION Card — Fault state display
//  — Flickering "NON FUNCTION" text with a descriptive tooltip
//  — Referenced from 2001: A Space Odyssey at ~23:50
//  — Triggered by dataFault mode: 'non-function'
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['non-function'] = {

  config: {
    duration: 5000,
    flickerRate: 100,     // ms per flicker cycle
  },

  // ── Shared singleton style element ─────────────────────────────
  _ensureStyle: function() {
    if (document.getElementById('nf-shared-style')) return;
    var style = document.createElement('style');
    style.id = 'nf-shared-style';
    style.textContent =
      '@keyframes nf-flicker {\n' +
      '  0%{opacity:1} 10%{opacity:0.2} 16%{opacity:1} 28%{opacity:0.3}\n' +
      '  34%{opacity:1} 42%{opacity:0.1} 50%{opacity:1} 55%{opacity:0.4}\n' +
      '  60%{opacity:1} 75%{opacity:0.2} 82%{opacity:1} 90%{opacity:0.5}\n' +
      '  100%{opacity:1}\n' +
      '}\n' +
      '.nf-anim { animation: nf-flicker 100ms infinite; }';
    document.head.appendChild(style);
  },

  render: function(data, onDone) {
    var svgEl = window.HAL.svg.getContainer(data);
    var cfg = data.cfg || {};
    var e = window.HAL.svg.el;

    // Background — use the card's color or dark navy
    var bg = data.color || 'rgb(14,21,48)';
    svgEl.appendChild(e('rect', {
      x: 0, y: 0, width: 1000, height: 750, fill: bg,
    }));

    // "NON FUNCTION" text — centered, flickering
    var titleFont = window.HAL_CONFIG.visual.fonts.title;
    var textEl = e('text', {
      x: 500, y: 400, 'text-anchor': 'middle', fill: 'rgb(255,200,50)',
      'font-family': titleFont, 'font-size': 80, 'font-weight': 'bold',
      'letter-spacing': 30,
      opacity: 1,
    });
    textEl.textContent = 'NON FUNCTION';
    textEl.classList.add('nf-anim');
    svgEl.appendChild(textEl);

    // Error message — smaller, below the main text
    var err = data.error ? data.error.message : '';
    if (err) {
      var labelFont = window.HAL_CONFIG.visual.fonts.label;
      var errEl = e('text', {
        x: 500, y: 480, 'text-anchor': 'middle', fill: 'rgb(255,100,100)',
        'font-family': labelFont, 'font-size': 22, 'letter-spacing': 2,
        opacity: 0.8,
      });
      errEl.textContent = err;
      svgEl.appendChild(errEl);
    }

    // Ensure the shared keyframe style exists
    this._ensureStyle();

    // ── Tooltip (title attribute on the overlay) ───────────────
    var tooltipText = 'Source: ' + (data.error ? data.error.source : 'unknown');
    if (err) tooltipText += ' — ' + err;

    // Create a transparent overlay for the tooltip
    var tipEl = e('rect', {
      x: 0, y: 0, width: 1000, height: 750, fill: 'transparent',
    });
    tipEl.setAttributeNS(null, 'title', tooltipText);
    svgEl.appendChild(tipEl);

    // ── Timer ──────────────────────────────────────────────────
    var dur = cfg.duration || 5000;
    var timer = setTimeout(function() {
      onDone();
    }, dur);

    // Store timer so _cleanup can cancel it
    this._nfTimer = timer;
  },

  // Cancel timer; shared style stays (cleaned up only if never needed again)
  _cleanup: function() {
    if (this._nfTimer) {
      clearTimeout(this._nfTimer);
      this._nfTimer = null;
    }
  },
};
