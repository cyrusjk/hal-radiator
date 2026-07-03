// ═══════════════════════════════════════════════════════════════════════
//  Title Card Renderer
//  — Renders three-letter display cards (e.g. VEH, COM, HAL)
// ═══════════════════════════════════════════════════════════════════════

const HAL = window.HAL || {};

HAL.cards = HAL.cards || {};

HAL.cards.title = {

  render: function(data) {
    var svgEl = document.getElementById('card');
    var titleFont = HAL_CONFIG.visual.fonts.title;
    var labelFont = HAL_CONFIG.visual.fonts.label;

    svgEl.innerHTML =
      '<rect x="0" y="0" width="1000" height="750" fill="' + data.color + '" />' +
      '<g transform="translate(500, 406) scale(0.9, 1.0)">' +
        '<text x="0" y="0" text-anchor="middle" fill="rgb(255,255,255)"' +
              ' font-family="' + titleFont + '" font-size="90" font-weight="bold"' +
              ' letter-spacing="44" text-rendering="optimizeLegibility">' +
          data.title +
        '</text>' +
      '</g>' +
      '<g transform="translate(231, 293) scale(1.0, 0.4)">' +
        '<text x="0" y="0" fill="rgb(255,255,255)"' +
              ' font-family="' + labelFont + '" font-size="49" letter-spacing="-2"' +
              ' text-rendering="optimizeLegibility">' +
          data.label +
        '</text>' +
      '</g>';
  },

};
