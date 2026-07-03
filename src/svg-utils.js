// ═══════════════════════════════════════════════════════════════════════
//  SVG Utilities
//  — SVG namespace constant and element creation helper
// ───────────────────────────────────────────────────────────────────────

window.HAL = window.HAL || {};

window.HAL.svg = {
  // SVG namespace URI required by createElementNS
  ns: 'http://www.w3.org/2000/svg',

  // Create an SVG element with attributes from a dictionary
  el: function(tag, attrs) {
    var e = document.createElementNS(window.HAL.svg.ns, tag);
    if (attrs) {
      for (var k in attrs) e.setAttribute(k, String(attrs[k]));
    }
    return e;
  },
};
