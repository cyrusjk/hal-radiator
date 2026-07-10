// ═══════════════════════════════════════════════════════════════════════
//  SVG Utilities
//  — SVG namespace constant, element creation, brightness helpers
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

  // ── Brightness helpers ──────────────────────────────────────────────
  // Each renderer can import these to keep frame/data brightness
  // consistent and configurable from radiator.yaml.

  vis: function() {
    return window.HAL_CONFIG.visual || {};
  },

  // Returns an rgba string with opacity = baseBrightness * multiplier.
  //   type: 'frame' or 'data' — selects from visual.frameBrightness or dataBrightness
  //   mult: brightness multiplier (e.g. 0.15 for subtle grid lines, 2.0 for header)
  fg: function(type, mult) {
    var v = window.HAL.svg.vis();
    var base = type === 'data' ? (v.dataBrightness || 0.8) : (v.frameBrightness || 0.4);
    var opacity = Math.min(1, Math.max(0, base * mult));
    return 'rgba(255,255,255,' + opacity.toFixed(2) + ')';
  },

  // Scale a base font size by visual.fontScale (default 1.0).
  // Call as fs(14) instead of hardcoding 'font-size': 14.
  fs: function(px) {
    var scale = window.HAL.svg.vis().fontScale || 1.0;
    return Math.round(px * scale);
  },

  // ── Container helper ────────────────────────────────────────────────
  // Returns the SVG element to render into. Inside a composite card child
  // zone, data._container is set; in standalone mode, falls back to the
  // root #card element.  Standalone call clears the card first.
  getContainer: function(data) {
    var el = (data && data._container) || document.getElementById('card');
    if (!data || !data._container) el.innerHTML = '';
    return el;
  },
};
