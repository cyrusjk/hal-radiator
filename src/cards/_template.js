// ═══════════════════════════════════════════════════════════════════════
//  Card Template — Starting point for new card authors
//
//  Copy this file to cards/my-card.js and:
//    1. Replace 'my-type' with your card's type string (must match YAML)
//    2. Replace <NAME> in the header comment
//    3. Fill in render() with your SVG content
//    4. Choose your onDone strategy below
//    5. Delete the category you're NOT using
//
//  Types of cards (choose one, delete the other):
//    A) Static — renders once, no animation, calls onDone immediately
//    B) Animated SVG — uses window.HAL.anim.run for animations
//    C) Custom DOM — creates elements outside the card SVG (overlays)
//
//  Contract (render(data, onDone)):
//    - data: read-only snapshot, same object for whole render cycle
//    - onDone: MUST be called or the dashboard stalls on this card
//    - cfg: use h.cfg, never mutate this.config
//    - _cleanup: only needed for category C (custom DOM)
//
//  API docs: ~/sync/hermes/wiki/references/card-architecture/
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};
window.HAL.cards = window.HAL.cards || {};

window.HAL.cards['my-type'] = {

  // ── Tunable defaults (merged with data.cfg at render time) ─────
  //  Config values here can be overridden per-card in radiator.yaml:
  //    cfg: { duration: 30000, speed: 2.0 }
  //  this.config is never mutated at runtime.
  config: {
    duration: 15000,
    speed: 1.0,
  },

  // ═══════════════════════════════════════════════════════════════
  //  CATEGORY A: Static Card
  //  — No animation, no timer, no cleanup
  //  — Call onDone immediately after building SVG
  // ═══════════════════════════════════════════════════════════════
  render: function(data, onDone) {
    var h = window.HAL.svg.cardHelpers(data, this.config);

    // Background
    h.el.appendChild(h.e('rect', {
      x: 0, y: 0, width: data.w || 1000, height: data.h || 750,
      fill: data.color,
    }));

    // ── Your SVG content here ─────────────────────────────────
    //   h.e('text', { x: 100, y: 100, fill: h.fg('frame', 1.9),
    //                'font-size': h.fs(14), ... })
    //   h.e('circle', { cx: 500, cy: 375, r: 50, ... })
    //   h.e('rect', { x: 0, y: 0, ... })

    if (onDone) onDone();
  },

  // ═══════════════════════════════════════════════════════════════
  //  CATEGORY B: Animated SVG Card
  //  — Uses window.HAL.anim.run to drive animation
  //  — All DOM inside h.el (cleaned by getContainer)
  //  — No _cleanup needed
  // ═══════════════════════════════════════════════════════════════
  /*
  render: function(data, onDone) {
    var h = window.HAL.svg.cardHelpers(data, this.config);

    // Background
    h.el.appendChild(h.e('rect', {
      x: 0, y: 0, width: data.w || 1000, height: data.h || 750,
      fill: data.color,
    }));

    // ── Animation groups ──────────────────────────────────────
    // Build an array of { el, delay, duration } objects, then:
    //   window.HAL.anim.run(data, groupMap, onDone, defaults);
    // The animation engine manages the timer and calls onDone.
  },
  */

  // ═══════════════════════════════════════════════════════════════
  //  CATEGORY C: Custom DOM Card (e.g. overlay divs, keyframes)
  //  — Creates DOM outside h.el (document.body, document.head)
  //  — MUST implement _cleanup to remove them
  //  — Timer handler must call _cleanup before onDone
  // ═══════════════════════════════════════════════════════════════
  /*
  render: function(data, onDone) {
    if (this._cleanup) this._cleanup();
    var h = window.HAL.svg.cardHelpers(data, this.config);

    // Background on the card SVG
    h.el.appendChild(h.e('rect', {
      x: 0, y: 0, width: data.w || 1000, height: data.h || 750,
      fill: data.color,
    }));

    // ── Non-SVG DOM (overlays, injected styles) ───────────────
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;...';
    document.body.appendChild(overlay);
    this._overlay = overlay;

    // ── Timer ─────────────────────────────────────────────────
    var that = this;
    var timer = setTimeout(function() {
      that._cleanup();
      if (onDone) onDone();
    }, h.cfg.duration);
    this._timer = timer;
  },

  // Cleanup: teardown everything render() added outside h.el
  _cleanup: function() {
    if (this._overlay) {
      var p = this._overlay.parentNode;
      if (p) p.removeChild(this._overlay);
      this._overlay = null;
    }
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  },
  */

};
