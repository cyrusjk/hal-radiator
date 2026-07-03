// ═══════════════════════════════════════════════════════════════════════
//  App — Orchestrator
//  — Card cycling, keyboard controls, transition logic
// ═══════════════════════════════════════════════════════════════════════

(function() {
  var svgEl = document.getElementById('card');
  var cfg = window.HAL_CONFIG;
  if (!svgEl || !cfg || !cfg.cards || !cfg.cards.length) return;

  var idx = 0;
  var locked = false;       // spacebar toggle — locks rotation & loops current card
  var autoTimer = null;     // pending auto-advance timeout

  // ── Helpers ─────────────────────────────────────────────────────────

  function clearAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }

  function clearCard(color) {
    if (color) document.body.style.background = color;
    svgEl.innerHTML = '';
  }

  // ── Card display ────────────────────────────────────────────────────

  function showCard(i, onDone) {
    clearAuto();
    var c = cfg.cards[i % cfg.cards.length];
    clearCard(c.color);

    if (c.type === 'chart') {
      window.HAL.data.fetchCardData(c)
        .then(function(data) {
          c.groups = data && data.groups ? data.groups : [];
          window.HAL.cards.curveFamily.render(c, onDone);
        })
        .catch(function() {
          if (onDone) onDone();
        });
    } else {
      window.HAL.cards.title.render(c);
    }
  }

  // ── Cycle logic ─────────────────────────────────────────────────────

  function cardDone() {
    if (locked) {
      // Replay the current card's animation
      showCard(idx, cardDone);
    } else {
      scheduleNext();
    }
  }

  function scheduleNext() {
    clearAuto();
    var next = (idx + 1) % cfg.cards.length;
    var nextCard = cfg.cards[next];
    if (nextCard.type === 'chart') {
      transitionTo(next);
    } else {
      autoTimer = setTimeout(transitionTo, cfg.timing.titleCardDisplay, next);
    }
  }

  function transitionTo(nextIdx) {
    idx = nextIdx;
    var c = cfg.cards[idx];
    if (c.type === 'chart') {
      showCard(idx, cardDone);
    } else {
      showCard(idx);
      cardDone(); // schedule next via the same loop
    }
  }

  // ── Keyboard controls ───────────────────────────────────────────────
  //  ← →  navigate cards (cancel lock if active)
  //  Space  toggle lock: when locked the current card loops its animation
  //         indefinitely; no visual indicator

  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      locked = false;
      var prev = (idx - 1 + cfg.cards.length) % cfg.cards.length;
      transitionTo(prev);
    }
    else if (e.key === 'ArrowRight') {
      e.preventDefault();
      locked = false;
      var next = (idx + 1) % cfg.cards.length;
      transitionTo(next);
    }
    else if (e.key === ' ') {
      e.preventDefault();
      locked = !locked;
      if (locked) {
        // Restart the current card's animation loop
        clearAuto();
        showCard(idx, cardDone);
      } else {
        // Unlock: advance to next card
        scheduleNext();
      }
    }
  });

  // ── Boot ────────────────────────────────────────────────────────────

  showCard(0);
  autoTimer = setTimeout(transitionTo, cfg.timing.titleCardDisplay, 1);
})();
