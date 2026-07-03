// ═══════════════════════════════════════════════════════════════════════
//  App — Orchestrator
//  — Card cycling, keyboard controls, transition logic
// ═══════════════════════════════════════════════════════════════════════

(function() {
  var svgEl = document.getElementById('card');
  var cfg = window.HAL_CONFIG;

  // Quick sanity — surface errors visibly
  if (!svgEl) { document.body.innerHTML += 'ERROR: no SVG element'; return; }
  if (!cfg) { document.body.innerHTML += 'ERROR: HAL_CONFIG not loaded'; return; }
  if (!cfg.cards || !cfg.cards.length) return;
  if (!window.HAL.cards || !window.HAL.cards.title) { document.body.innerHTML += 'ERROR: title renderer missing'; return; }

  var idx = 0;
  var locked = false;
  var autoTimer = null;
  var zoom = 1.0;
  var wrap = document.getElementById('wrap');

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

    if (c.type !== 'title') {
      window.HAL.data.fetchCardData(c)
        .then(function(data) {
          if (data) {
            for (var k in data) c[k] = data[k];
          }
          try {
            var renderer = window.HAL.cards[c.type];
            if (renderer && renderer.render) {
              renderer.render(c, onDone);
            } else {
              if (onDone) onDone();
            }
          } catch(e) {
            if (onDone) onDone();
          }
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
      showCard(idx, cardDone);
    } else {
      scheduleNext();
    }
  }

  function scheduleNext() {
    clearAuto();
    var next = (idx + 1) % cfg.cards.length;
    var nextCard = cfg.cards[next];
    if (nextCard.type !== 'title') {
      transitionTo(next);
    } else {
      autoTimer = setTimeout(transitionTo, cfg.timing.titleCardDisplay * 1000, next);
    }
  }

  function transitionTo(nextIdx) {
    idx = nextIdx;
    var c = cfg.cards[idx];
    if (c.type !== 'title') {
      showCard(idx, cardDone);
    } else {
      showCard(idx);
      autoTimer = setTimeout(transitionTo, cfg.timing.titleCardDisplay * 1000, (idx + 1) % cfg.cards.length);
    }
  }

  // ── Keyboard controls ───────────────────────────────────────────────
  //  ← →  navigate cards
  //  Space  lock/unlock current card (loops animation)
  //  +/-    zoom in/out (0.25 increments, 0.25–3.0x)

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
        clearAuto();
        showCard(idx, cardDone);
      } else {
        scheduleNext();
      }
    }
    else if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      zoom = Math.min(zoom + 0.25, 3.0);
      if (wrap) { wrap.style.transform = 'scale(' + zoom + ')'; wrap.classList.add('zoomed'); }
    }
    else if (e.key === '-') {
      e.preventDefault();
      zoom = Math.max(zoom - 0.25, 0.25);
      if (zoom === 1.0) {
        if (wrap) { wrap.style.transform = ''; wrap.classList.remove('zoomed'); }
      } else {
        if (wrap) { wrap.style.transform = 'scale(' + zoom + ')'; wrap.classList.add('zoomed'); }
      }
    }
  });

  // ── Boot ────────────────────────────────────────────────────────────

  showCard(0);
  autoTimer = setTimeout(transitionTo, cfg.timing.titleCardDisplay * 1000, 1);
})();
