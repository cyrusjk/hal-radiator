// ═══════════════════════════════════════════════════════════════════════
//  Dock Stack Card — 3D Box Stack Approach Animation
//  — 7 white-stroke boxes in 3D perspective, unwinding from rotation
//  — Front-to-back sequential fade in last N% of animation
//  — Static dock24 red markers + white center circle overlay
//  — No live data, purely decorative
//
//  Config (from radiator.yaml / prototypes.yaml):
//    chartType: dock-stack
//    color: "rgb(17,18,20)"     (background)
//    cfg:
//      duration: 40000          total animation ms
//      endDelay: 5000           additional ms on final frame before onDone
//      fadeWindow: 10           % of duration used for fade cascade
//
//  DESIGN SPEC: ~/sync/hermes/wiki/references/dock-stack-spec.md
//
//  Architecture:
//    A single position:fixed overlay div covers the viewport. Inside:
//    — CSS 3D scene using vw/vh units (scalable by definition)
//    — Overlay markers SVG (viewBox "0 0 640 360") fills the same space
//    The card SVG only gets a background rect.  Cleanup removes the
//    overlay div + injected keyframes when the animation ends.
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['dock-stack'] = {

  // ── Tunable defaults (as % of viewport width/height) ────────────
  config: {
    duration:       40000,   // total animation ms
    endDelay:       5000,    // ms to hold on final frame before onDone
    layerCount:     7,
    scale:          0.72,
    zFront:         32.5,    // vw
    zBack:          77.5,    // vw
    zOrigin:        47.5,    // vw — transform-origin Z
    fadeWindow:     10,      // % of duration for fade cascade
    opacityFront:   0.960,   // front layer base opacity
    opacityBack:    0.800,   // back layer base opacity
    rotateXStart:   20,      // deg
    rotateYStart:   4,       // deg
    rotateZStart:   540,     // deg
  },

  // ── Layer SVG template ────────────────────────────────────────────
  // viewBox "-145 -49 290 98", overflow visible.
  // Width 52vw matches the original spec; aspect-ratio drives height.
  _layerSvgHTML: [
    '<svg width="290" height="98" viewBox="-145 -49 290 98" xmlns="http://www.w3.org/2000/svg" overflow="visible"',
    '  style="display:block;width:52vw;height:auto;aspect-ratio:290/98;mix-blend-mode:plus-lighter">',
    '  <rect x="-145" y="-49" width="290" height="98" rx="12" ry="12"',
    '    fill="none" stroke="rgba(255,255,255,1)" stroke-width="2.0" stroke-linecap="round"/>',
    '  <circle cx="0" cy="0" r="8" fill="none" stroke="rgba(255,255,255,1)"',
    '    stroke-width="1.2" stroke-linecap="round"/>',
    '  <line x1="-16" y1="0" x2="16" y2="0" stroke="rgba(255,255,255,1)"',
    '    stroke-width="1.2" stroke-linecap="round"/>',
    '  <line x1="0" y1="-16" x2="0" y2="16" stroke="rgba(255,255,255,1)"',
    '    stroke-width="1.2" stroke-linecap="round"/>',
    '  <g stroke="rgba(255,255,255,1)" stroke-width="1" stroke-linecap="round" fill="none">',
    '    <line x1="-148" y1="0" x2="-142" y2="0"/>',
    '    <line x1="-136" y1="0" x2="-130" y2="0"/>',
    '    <line x1="-124" y1="0" x2="-118" y2="0"/>',
    '    <line x1="-112" y1="0" x2="-106" y2="0"/>',
    '    <line x1="-100" y1="0" x2="-94" y2="0"/>',
    '    <line x1="-88"  y1="0" x2="-82" y2="0"/>',
    '    <line x1="-76"  y1="0" x2="-70" y2="0"/>',
    '    <line x1="-64"  y1="0" x2="-58" y2="0"/>',
    '    <line x1="-63" y1="-3" x2="-63" y2="3"/>',
    '    <line x1="-52"  y1="0" x2="-46" y2="0"/>',
    '    <line x1="-40"  y1="0" x2="-34" y2="0"/>',
    '    <line x1="34"   y1="0" x2="40"  y2="0"/>',
    '    <line x1="46"   y1="0" x2="52"  y2="0"/>',
    '    <line x1="58"   y1="0" x2="64"  y2="0"/>',
    '    <line x1="63" y1="-3" x2="63" y2="3"/>',
    '    <line x1="70"   y1="0" x2="76"  y2="0"/>',
    '    <line x1="82"   y1="0" x2="88"  y2="0"/>',
    '    <line x1="94"   y1="0" x2="100" y2="0"/>',
    '    <line x1="106"  y1="0" x2="112" y2="0"/>',
    '    <line x1="118"  y1="0" x2="124" y2="0"/>',
    '    <line x1="130"  y1="0" x2="136" y2="0"/>',
    '    <line x1="142"  y1="0" x2="148" y2="0"/>',
    '  </g>',
    '  <g stroke="rgba(255,255,255,1)" stroke-width="1" stroke-linecap="round" fill="none">',
    '    <line x1="0" y1="-52" x2="0" y2="-46"/>',
    '    <line x1="0" y1="-40" x2="0" y2="-34"/>',
    '    <line x1="0" y1="34" x2="0" y2="40"/>',
    '    <line x1="0" y1="46" x2="0" y2="52"/>',
    '  </g>',
    '</svg>'
  ].join('\n'),

  // ── Render ────────────────────────────────────────────────────────
  render: function(data, onDone) {
    var bgColor = data.color || '#1a1a1a';

    // ── Cleanup previous run ────────────────────────────────────────
    this._cleanup();

    // ── Local config (don't mutate this.config) ──────────────────────
    var cfg = {};
    for (var k in this.config) cfg[k] = this.config[k];
    if (data.cfg) for (var k in data.cfg) cfg[k] = data.cfg[k];

    // ── Background rect on the card SVG ─────────────────────────────
    var e = window.HAL.svg.el;
    var svgEl = window.HAL.svg.getContainer(data);
    svgEl.appendChild(e('rect', { x: 0, y: 0, width: 1000, height: 750, fill: bgColor }));

    // ── Overlay container — position:fixed, covers viewport ────────
    var overlay = document.createElement('div');
    overlay.id = 'dock-stack-overlay';
    overlay.style.cssText =
      'position:fixed;z-index:5;pointer-events:none;overflow:hidden;' +
      'top:0;left:0;width:100vw;height:100vh;';
    document.body.appendChild(overlay);

    // ── 3D CSS scene ──────────────────────────────────────────────
    var scene = document.createElement('div');
    scene.id = 'dock-stack-3d';
    scene.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'perspective:187.5vw;' +
      'perspective-origin:50% 50%;overflow:hidden;';

    // Stack-wrap (scale + translate, separated from rotation)
    var uid = this._uid();
    var sw = document.createElement('div');
    sw.style.cssText = 'width:100%;height:100%;transform-style:preserve-3d;';
    sw.style.animation = 'dock-shift-' + uid + ' ' + cfg.duration + 'ms linear forwards';
    scene.appendChild(sw);

    // Stack (rotation)
    var st = document.createElement('div');
    st.style.cssText = 'width:100%;height:100%;transform-style:preserve-3d;' +
      'transform-origin:50% 50% ' + cfg.zOrigin + 'vw;';
    st.style.animation = 'dock-unwind-' + uid + ' ' + cfg.duration + 'ms linear forwards';
    sw.appendChild(st);

    // ── Build layers ────────────────────────────────────────────────
    var N = cfg.layerCount;
    for (var i = 0; i < N; i++) {
      var z = this._zPos(i, cfg);
      var op = this._opacity(i, cfg);
      var ly = document.createElement('div');
      ly.style.cssText =
        'position:absolute;top:50%;left:50%;' +
        'translate:-50% -50%;transform-style:preserve-3d;' +
        'transform:translate3d(0, 0, ' + z + 'vw);' +
        'opacity:' + op.toFixed(3) + ';';
      ly.style.animation = 'dock-fade-' + uid + '-L' + i + ' ' + cfg.duration + 'ms linear forwards';
      ly.innerHTML = this._layerSvgHTML;
      st.appendChild(ly);
    }

    overlay.appendChild(scene);

    // ── Overlay markers SVG ─────────────────────────────────────────
    // Appended AFTER the 3D scene so markers render ON TOP.
    // viewBox "0 0 640 360" scaled to fill the viewport via
    // position:fixed (same coordinate space as the 3D scene).
    var markSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    markSvg.setAttribute('viewBox', '0 0 640 360');
    markSvg.style.cssText = 'display:block;width:100vw;height:100vh;';
    markSvg.innerHTML =
      '<g stroke="rgba(220,120,125,0.8)" stroke-linecap="round" fill="none" opacity="0.8">' +
      '<g stroke-width="2.3">' +
      '<line x1="353.2" y1="213.2" x2="374.4" y2="234.4"/>' +
      '<line x1="380.8" y1="240.8" x2="384.0" y2="244.0"/>' +
      '<line x1="390.7" y1="250.7" x2="473.6" y2="333.6"/>' +
      '<line x1="286.8" y1="213.2" x2="265.6" y2="234.4"/>' +
      '<line x1="259.2" y1="240.8" x2="256.0" y2="244.0"/>' +
      '<line x1="249.3" y1="250.7" x2="166.4" y2="333.6"/>' +
      '<line x1="286.8" y1="146.8" x2="265.6" y2="125.6"/>' +
      '<line x1="259.2" y1="119.2" x2="256.0" y2="116.0"/>' +
      '<line x1="249.3" y1="109.3" x2="166.4" y2="26.4"/>' +
      '<line x1="353.2" y1="146.8" x2="374.4" y2="125.6"/>' +
      '<line x1="380.8" y1="119.2" x2="384.0" y2="116.0"/>' +
      '<line x1="390.7" y1="109.3" x2="473.6" y2="26.4"/>' +
      // horizontal & vertical guide lines
      '<line x1="175" y1="180" x2="151" y2="180"/>' +
      '<line x1="320" y1="35" x2="320" y2="11"/>' +
      '<line x1="465" y1="180" x2="489" y2="180"/>' +
      '<line x1="320" y1="325" x2="320" y2="349"/>' +
      '</g>' +
      '<g stroke-width="1.8">' +
      '<path d="M 470.0 172.0 Q 471.5 180.0 470.0 188.0"/>' +
      '<path d="M 328.0 330.0 Q 320.0 331.5 312.0 330.0"/>' +
      '<path d="M 170.0 188.0 Q 168.5 180.0 170.0 172.0"/>' +
      '<path d="M 312.0 30.0 Q 320.0 28.5 328.0 30.0"/>' +
      '<path d="M 443.7 268.4 Q 428.2 288.2 408.4 303.7"/>' +
      '<path d="M 231.6 303.7 Q 211.8 288.2 196.3 268.4"/>' +
      '<path d="M 196.3 91.6 Q 211.8 71.8 231.6 56.3"/>' +
      '</g>' +
      '</g>' +
      '<circle cx="320" cy="180" r="30" fill="none" stroke="rgba(255,255,255,1)" stroke-width="2.3"/>';
    overlay.appendChild(markSvg);

    this._overlay = overlay;
    this._uidStr = uid;

    // ── Inject keyframes (vw/vh values) ─────────────────────────────
    this._injectStyles(cfg, uid);

    // ── Timer ──────────────────────────────────────────────────────
    var endDelay = data.endDelay != null ? data.endDelay : cfg.endDelay;
    var totalMs = cfg.duration + endDelay;
    var that = this;
    var timer = setTimeout(function() {
      that._removeVisuals();
      that._timer = null;
      if (onDone) onDone();
    }, totalMs);

    this._timer = timer;
  },

  // ── Unique ID per render for keyframe names ─────────────────────
  _uid: (function() { var n = 0; return function() { return 'ds' + (n++); }; })(),

  // ── Z position (vw), i=0 is back, i=N-1 is front ────────────────
  _zPos: function(i, cfg) {
    var N = cfg.layerCount;
    if (N <= 1) return cfg.zFront;
    return cfg.zFront + (cfg.zBack - cfg.zFront) * (i / (N - 1));
  },

  // ── Opacity, i=0 is back, i=N-1 is front ─────────────────────────
  _opacity: function(i, cfg) {
    var N = cfg.layerCount;
    if (N <= 1) return cfg.opacityFront;
    var t = i / (N - 1);
    return cfg.opacityFront - t * (cfg.opacityFront - cfg.opacityBack);
  },

  // ── Fade keyframe start% — front (larger i) fades first ─────────
  _fadePct: function(i, cfg) {
    var N = cfg.layerCount;
    if (N <= 1) return 100 - cfg.fadeWindow;
    var slot = cfg.fadeWindow / N;
    return 100 - cfg.fadeWindow + (N - 1 - i) * slot;
  },

  // ── Inject @keyframes — all values in vw/vh ─────────────────────
  _injectStyles: function(cfg, uid) {
    var style = document.createElement('style');
    style.id = 'dock-stack-keyframes-' + uid;

    var css = '';
    css += '@keyframes dock-shift-' + uid + ' {\n' +
      '  0%   { transform: scale(' + cfg.scale + ') translate(-10vw, -25vh); }\n' +
      '  100% { transform: scale(' + cfg.scale + ') translate(0, 0); }\n' +
      '}\n';

    css += '@keyframes dock-unwind-' + uid + ' {\n' +
      '  0%   { transform: rotateX(' + cfg.rotateXStart + 'deg) rotateY(' + cfg.rotateYStart + 'deg) rotateZ(' + cfg.rotateZStart + 'deg); }\n' +
      '  100% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }\n' +
      '}\n';

    var N = cfg.layerCount;
    for (var i = 0; i < N; i++) {
      var pct = this._fadePct(i, cfg);
      var op = this._opacity(i, cfg).toFixed(3);
      var slot = cfg.fadeWindow / N;
      var fadeEnd = Math.min(pct + slot, 100).toFixed(3);
      css += '@keyframes dock-fade-' + uid + '-L' + i + ' {\n' +
        '  0%, ' + pct + '% { opacity: ' + op + '; }\n' +
        '  ' + fadeEnd + '% { opacity: 0; }\n' +
        '  100% { opacity: 0; }\n' +
        '}\n';
    }

    style.textContent = css;
    document.head.appendChild(style);
  },

  // ── Remove overlay div ────────────────────────────────────────────
  _removeVisuals: function() {
    if (this._overlay) {
      var p = this._overlay.parentNode;
      if (p) p.removeChild(this._overlay);
      this._overlay = null;
    }
  },

  // ── Full cleanup: overlay + styles + timer ───────────────────────
  _cleanup: function() {
    this._removeVisuals();

    if (this._uidStr) {
      var style = document.getElementById('dock-stack-keyframes-' + this._uidStr);
      if (style) style.parentNode.removeChild(style);
      this._uidStr = null;
    }

    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  },
};
