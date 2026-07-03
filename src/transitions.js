// ═══════════════════════════════════════════════════════════════════════
//  Transition Primitives
//  — Flicker a single element in/out (applies CSS class)
//  — Flicker elements sequentially with a gap between each
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};

window.HAL.transitions = {

  // Apply blink-in or blink-out CSS to a single element
  flickerOne: function(el, dir) {
    el.classList.add(dir === 'in' ? 'blink-in' : 'blink-out');
  },

  // Flicker elements one-by-one; each completes before the next starts
  flickerSeq: function(list, dir, gap, idx, cb) {
    if (idx >= list.length) { if (cb) cb(); return; }
    window.HAL.transitions.flickerOne(list[idx], dir);
    setTimeout(function() {
      window.HAL.transitions.flickerSeq(list, dir, gap, idx + 1, cb);
    }, window.HAL_CONFIG.timing.flickerDuration + gap);
  },

};
