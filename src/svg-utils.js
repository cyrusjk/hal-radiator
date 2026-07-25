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

  // Merge card defaults + per-card overrides (no mutation)
  // Returns a new object; does not modify either input.
  mergeConfig: function(defaults, overrides) {
    var cfg = {};
    if (defaults) for (var k in defaults) cfg[k] = defaults[k];
    if (overrides) for (var k in overrides) cfg[k] = overrides[k];
    return cfg;
  },

  // One-stop shop for everything a card renderer needs.
  // Returns { el (SVG element), e (element creator), fg, fs, ns, cfg (merged config) }.
  //   data: the render(data, onDone) data argument
  //   defaults: card.config (optional) — merged with data.cfg to produce cfg
  cardHelpers: function(data, defaults) {
    var svgEl = this.getContainer(data);
    var cfg = defaults ? this.mergeConfig(defaults, data.cfg) : {};
    return {
      el:  svgEl,
      e:   this.el,
      fg:  this.fg,
      fs:  this.fs,
      ns:  this.ns,
      cfg: cfg,
    };
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
    var fsVal = window.HAL.svg.vis().fontScale;
    var scale = fsVal != null ? fsVal : 1.0;
    return Math.round(px * scale);
  },

  // ── Container helper ────────────────────────────────────────────────
  // Returns the SVG element to render into. Inside a composite card child
  // zone, data._container is set; in standalone mode, falls back to the
  // root #card element.  Standalone call clears the card first.
  //
  //   data:      render(data, onDone) data argument — carries _container
  //              and _containerType ('svg'|'div'|'canvas') when set
  //   fallback:  optional element id (default '#card') for custom containers
  getContainer: function(data, fallback) {
    if (data && data._container) return data._container;
    var id = fallback || 'card';
    var el = document.getElementById(id);
    if (el) {
      el.innerHTML = '';
      this.addGlowFilter(el);
    }
    return el;
  },

  // ── Text glow filter ────────────────────────────────────────────────
  // Adds a subtle HAL 9000-style glow to text: feGaussianBlur (1.5px)
  // blended at ~60% opacity under the sharp original via feMerge.
  // Idempotent — won't duplicate the filter if already present.
  addGlowFilter: function(svgEl) {
    if (svgEl.querySelector('#txtGlow')) return;
    var defs = svgEl.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(this.ns, 'defs');
      svgEl.insertBefore(defs, svgEl.firstChild);
    }
    var filter = document.createElementNS(this.ns, 'filter');
    filter.id = 'txtGlow';
    filter.setAttribute('x', '-20%');
    filter.setAttribute('y', '-20%');
    filter.setAttribute('width', '140%');
    filter.setAttribute('height', '140%');

    var blur = document.createElementNS(this.ns, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '1.5');
    blur.setAttribute('result', 'blur');
    filter.appendChild(blur);

    var cm = document.createElementNS(this.ns, 'feColorMatrix');
    cm.setAttribute('type', 'matrix');
    cm.setAttribute('values', '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0');
    cm.setAttribute('result', 'glow');
    filter.appendChild(cm);

    var merge = document.createElementNS(this.ns, 'feMerge');
    var mergeGlow = document.createElementNS(this.ns, 'feMergeNode');
    mergeGlow.setAttribute('in', 'glow');
    merge.appendChild(mergeGlow);
    var mergeSrc = document.createElementNS(this.ns, 'feMergeNode');
    mergeSrc.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mergeSrc);
    filter.appendChild(merge);

    defs.appendChild(filter);

    // Graphic glow — subtler version for chart elements
    var gfxFilter = document.createElementNS(this.ns, 'filter');
    gfxFilter.id = 'gfxGlow';
    gfxFilter.setAttribute('x', '-20%');
    gfxFilter.setAttribute('y', '-20%');
    gfxFilter.setAttribute('width', '140%');
    gfxFilter.setAttribute('height', '140%');

    var gfxBlur = document.createElementNS(this.ns, 'feGaussianBlur');
    gfxBlur.setAttribute('stdDeviation', '0.8');
    gfxBlur.setAttribute('result', 'blur');
    gfxFilter.appendChild(gfxBlur);

    var gfxCm = document.createElementNS(this.ns, 'feColorMatrix');
    gfxCm.setAttribute('type', 'matrix');
    gfxCm.setAttribute('values', '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0');
    gfxCm.setAttribute('result', 'glow');
    gfxFilter.appendChild(gfxCm);

    var gfxMerge = document.createElementNS(this.ns, 'feMerge');
    var gfxMergeGlow = document.createElementNS(this.ns, 'feMergeNode');
    gfxMergeGlow.setAttribute('in', 'glow');
    gfxMerge.appendChild(gfxMergeGlow);
    var gfxMergeSrc = document.createElementNS(this.ns, 'feMergeNode');
    gfxMergeSrc.setAttribute('in', 'SourceGraphic');
    gfxMerge.appendChild(gfxMergeSrc);
    gfxFilter.appendChild(gfxMerge);

    defs.appendChild(gfxFilter);

    // No CSS rules — each card renderer adds explicit filter attributes
    // to its text and data elements as needed.
  },
};
