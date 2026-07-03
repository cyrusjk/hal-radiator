// ═══════════════════════════════════════════════════════════════════════
//  App — Orchestrator
//  — Boots by fetching /api/config from the server
//  — Then cycles cards, handles keyboard controls
// ═══════════════════════════════════════════════════════════════════════

(function() {
  var svgEl = document.getElementById('card');

  // Fetch config from server, then boot the radiator
  fetch('/api/config').then(function(r) { return r.json(); }).then(function(cfg) {
    window.HAL_CONFIG = cfg;
    boot(cfg);
  }).catch(function(err) {
    // Fallback: use whatever config.js set if available
    if (window.HAL_CONFIG) {
      boot(window.HAL_CONFIG);
    } else {
      document.body.innerHTML += 'ERROR: cannot fetch config &ndash; ' + err;
    }
  });

  function boot(cfg) {
    if (!svgEl) { document.body.innerHTML += 'ERROR: no SVG element'; return; }
    if (!cfg || !cfg.cards || !cfg.cards.length) return;
    if (!window.HAL.cards || !window.HAL.cards.title) { document.body.innerHTML += 'ERROR: title renderer missing'; return; }

    var idx = 0, locked = false, autoTimer = null, zoom = 1.0;
    var wrap = document.getElementById('wrap');

    function clearAuto() {
      if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    }

    function clearCard(color) {
      if (color) document.body.style.background = color;
      svgEl.innerHTML = '';
    }

    function showCard(i, onDone) {
      clearAuto();
      var c = cfg.cards[i % cfg.cards.length];
      clearCard(c.color);
      if (c.type !== 'title') {
        window.HAL.data.fetchCardData(c)
          .then(function(data) {
            if (data) for (var k in data) c[k] = data[k];
            try {
              var r = window.HAL.cards[c.type];
              r && r.render ? r.render(c, onDone) : onDone && onDone();
            } catch(e) { onDone && onDone(); }
          })
          .catch(function() { onDone && onDone(); });
      } else {
        window.HAL.cards.title.render(c);
      }
    }

    function cardDone() {
      locked ? showCard(idx, cardDone) : scheduleNext();
    }

    function scheduleNext() {
      clearAuto();
      var next = (idx + 1) % cfg.cards.length;
      if (cfg.cards[next].type !== 'title') {
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

    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault(); locked = false;
        transitionTo((idx - 1 + cfg.cards.length) % cfg.cards.length);
      }
      else if (e.key === 'ArrowRight') {
        e.preventDefault(); locked = false;
        transitionTo((idx + 1) % cfg.cards.length);
      }
      else if (e.key === ' ') {
        e.preventDefault(); locked = !locked;
        locked ? (clearAuto(), showCard(idx, cardDone)) : scheduleNext();
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

    // ── Boot sequence ──────────────────────────────────────────────────
    showCard(0);
    autoTimer = setTimeout(transitionTo, cfg.timing.titleCardDisplay * 1000, 1);
  }
})();
