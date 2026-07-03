// ═══════════════════════════════════════════════════════════════════════
//  Title Card Renderer
//  — Renders three-letter display cards (e.g. VEH, COM, HAL)
// ═══════════════════════════════════════════════════════════════════════

// IMPORTANT: use window.HAL directly to ensure cross-script visibility
window.HAL = window.HAL || {};

window.HAL.cards = window.HAL.cards || {};

window.HAL.cards.title = {

  render: function(data) {
    var svgEl = document.getElementById('card');
    var fs = window.HAL.svg.fs;
    var titleFont = window.HAL_CONFIG.visual.fonts.title;
    var labelFont = window.HAL_CONFIG.visual.fonts.label;
    var e = window.HAL.svg.el;
    var fg = window.HAL.svg.fg;

    // Build SVG via DOM methods (reliable across all browsers and protocols)
    svgEl.innerHTML = '';

    svgEl.appendChild(e('rect', {
      x: 0, y: 0, width: 1000, height: 750, fill: data.color,
    }));

    var titleG = e('g', { transform: 'translate(500, 406) scale(0.9, 1.0)' });
    var titleT = e('text', {
      x: 0, y: 0, 'text-anchor': 'middle', fill: 'rgb(255,255,255)',
      'font-family': titleFont, 'font-size': fs(90), 'font-weight': 'bold',
      'letter-spacing': 44, 'text-rendering': 'optimizeLegibility',
    });
    titleT.textContent = data.title;
    titleG.appendChild(titleT);
    svgEl.appendChild(titleG);

    var subG = e('g', { transform: 'translate(231, 293) scale(1.0, 0.4)' });
    var subT = e('text', {
      x: 0, y: 0, fill: 'rgb(255,255,255)',
      'font-family': labelFont, 'font-size': fs(49), 'letter-spacing': -2,
      'text-rendering': 'optimizeLegibility',
    });
    subT.textContent = data.label;
    subG.appendChild(subT);
    svgEl.appendChild(subG);
  },

};
